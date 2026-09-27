import { DomainError } from '../../src/shared/domain/errors.js';
import { query, tx } from '../db.js';
import { route } from '../http.js';
import { newId } from '../ids.js';
import { USER_COLUMNS, USER_FROM, userView } from '../views.js';

const loadSelf = async (userId: string) => {
  const [row] = await query(`SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.id = $1`, [userId]);
  return userView(row, true);
};

const cleanName = (name: unknown) => String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
const cleanPhone = (phone: unknown) => String(phone ?? '').trim().slice(0, 30);

/**
 * After a Firebase sign-in or sign-up: finds the Salacope account of this identity, creating it
 * on first use (the name comes from the sign-up form, else the Firebase profile).
 */
route('POST', '/session', async (ctx) => {
  const identity = await ctx.identity();
  if (!identity) throw new DomainError('Connexion expirée : reconnectez-vous.', 401);
  const [existing] = await query<{ id: string }>('SELECT id FROM users WHERE firebase_uid = $1', [identity.uid]);
  if (existing) return { userId: existing.id, patch: { users: [await loadSelf(existing.id)] } };

  const name = cleanName(ctx.body.name) || cleanName(identity.name) || identity.email.split('@')[0];
  const id = newId('usr');
  try {
    await query('INSERT INTO users (id, firebase_uid, email, name, phone) VALUES ($1, $2, $3, $4, $5)', [
      id,
      identity.uid,
      identity.email,
      name,
      cleanPhone(ctx.body.phone),
    ]);
  } catch (err: any) {
    if (err?.code === '23505') {
      const [again] = await query<{ id: string }>('SELECT id FROM users WHERE firebase_uid = $1', [identity.uid]);
      if (again) return { userId: again.id, patch: { users: [await loadSelf(again.id)] } };
      throw new DomainError('Un autre compte Salacope utilise déjà cet e-mail.', 409);
    }
    throw err;
  }
  return { userId: id, patch: { users: [await loadSelf(id)] } };
});

route('PATCH', '/me', async (ctx) => {
  const userId = await ctx.userId();
  const name = cleanName(ctx.body.name);
  if (!name) throw new DomainError('Le nom est obligatoire.');
  await query('UPDATE users SET name = $2, phone = $3, updated_at = NOW() WHERE id = $1', [userId, name, cleanPhone(ctx.body.phone)]);
  return { patch: { users: [await loadSelf(userId)] } };
});

const merchantInput = (body: any) => {
  const storeName = String(body.storeName ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!storeName) throw new DomainError('Le nom de la boutique est obligatoire.');
  return {
    storeName,
    headline: String(body.headline ?? '').trim().slice(0, 140),
    city: String(body.city ?? '').trim().slice(0, 60),
  };
};

/** Opens the store. `verified` is set by the platform after an identity check. */
route('POST', '/merchant', async (ctx) => {
  const userId = await ctx.userId();
  const m = merchantInput(ctx.body);
  await tx(async (q) => {
    const [taken] = await q('SELECT 1 FROM merchants WHERE LOWER(store_name) = LOWER($1) AND user_id <> $2', [m.storeName, userId]);
    if (taken) throw new DomainError('Ce nom de boutique est déjà pris.', 409);
    await q(
      `INSERT INTO merchants (user_id, store_name, headline, city) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING`,
      [userId, m.storeName, m.headline, m.city]
    );
  });
  return { patch: { users: [await loadSelf(userId)] } };
});

route('PATCH', '/merchant', async (ctx) => {
  const userId = await ctx.userId();
  const m = merchantInput(ctx.body);
  await tx(async (q) => {
    const [taken] = await q('SELECT 1 FROM merchants WHERE LOWER(store_name) = LOWER($1) AND user_id <> $2', [m.storeName, userId]);
    if (taken) throw new DomainError('Ce nom de boutique est déjà pris.', 409);
    const rows = await q(
      'UPDATE merchants SET store_name = $2, headline = $3, city = $4 WHERE user_id = $1 RETURNING user_id',
      [userId, m.storeName, m.headline, m.city]
    );
    if (!rows.length) throw new DomainError('Boutique introuvable.', 404);
  });
  return { patch: { users: [await loadSelf(userId)] } };
});
