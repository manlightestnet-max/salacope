import crypto from 'node:crypto';
import { DomainError } from '../src/shared/domain/errors.js';
import { Query, query } from './db.js';
import { newId } from './ids.js';

/**
 * Buying without an account: the buyer gets a guest profile, held by a secret key that only their
 * browser keeps (sent as `X-Salacope-Guest`). Salacope stores its hash, never the key.
 */
export const GUEST_NAME = 'Client invité';

const hashKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');

export async function createGuest(): Promise<{ id: string; key: string }> {
  const key = crypto.randomBytes(32).toString('base64url');
  const id = newId('usr');
  await query('INSERT INTO users (id, name, guest_key_hash) VALUES ($1, $2, $3)', [id, GUEST_NAME, hashKey(key)]);
  return { id, key };
}

/** The guest this key belongs to (never an account that already took it over). */
export async function guestIdFromKey(key: string | null): Promise<string | null> {
  if (!key || !/^[\w-]{40,60}$/.test(key)) return null;
  const [row] = await query<{ id: string }>('SELECT id FROM users WHERE guest_key_hash = $1 AND firebase_uid IS NULL', [hashKey(key)]);
  return row?.id ?? null;
}

/**
 * The guest creates an account: when the identity has no Salacope account yet the guest profile
 * becomes it; otherwise the guest's purchases move to the existing account and the guest is removed.
 */
export async function claimGuest(
  q: Query,
  guestId: string,
  identity: { uid: string; email: string },
  name: string,
  phone: string
): Promise<string> {
  const rename = async (to: string) => {
    await q(`UPDATE orders SET buyer = buyer || jsonb_build_object('name', $2::text) WHERE buyer_id = $1`, [guestId, to]);
    await q(`UPDATE payment_attempts SET details = jsonb_set(details, '{buyer,name}', to_jsonb($2::text)) WHERE buyer_id = $1 AND details ? 'buyer'`, [guestId, to]);
  };
  const [existing] = await q<{ id: string; name: string }>('SELECT id, name FROM users WHERE firebase_uid = $1', [identity.uid]);
  if (!existing) {
    try {
      await q(
        `UPDATE users SET firebase_uid = $2, email = $3, name = $4, phone = $5, guest_key_hash = NULL, updated_at = NOW()
         WHERE id = $1 AND firebase_uid IS NULL`,
        [guestId, identity.uid, identity.email, name, phone]
      );
    } catch (err: any) {
      if (err?.code === '23505') throw new DomainError('Un autre compte Salacope utilise déjà cet e-mail.', 409);
      throw err;
    }
    await rename(name);
    return guestId;
  }

  const to = existing.id;
  await rename(existing.name);
  for (const [table, column] of [
    ['payment_attempts', 'buyer_id'],
    ['orders', 'buyer_id'],
    ['order_messages', 'author_id'],
    ['order_events', 'actor_id'],
    ['reviews', 'buyer_id'],
    ['tickets', 'user_id'],
    ['notifications', 'user_id'],
  ]) {
    await q(`UPDATE ${table} SET ${column} = $2 WHERE ${column} = $1`, [guestId, to]);
  }
  await q('INSERT INTO favorites (user_id, listing_id, created_at) SELECT $2, listing_id, created_at FROM favorites WHERE user_id = $1 ON CONFLICT DO NOTHING', [guestId, to]);
  await q('DELETE FROM favorites WHERE user_id = $1', [guestId]);
  await q(
    'INSERT INTO follows (user_id, seller_id, created_at, last_seen_at) SELECT $2, seller_id, created_at, last_seen_at FROM follows WHERE user_id = $1 AND seller_id <> $2 ON CONFLICT DO NOTHING',
    [guestId, to]
  );
  await q('DELETE FROM follows WHERE user_id = $1', [guestId]);
  await q('DELETE FROM users WHERE id = $1 AND firebase_uid IS NULL', [guestId]);
  return to;
}
