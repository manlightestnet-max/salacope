import { DomainError } from '../../src/shared/domain/errors.js';
import { validateHandle } from '../../src/shared/domain/listings.js';
import { KYC_DOCUMENTS, KYC_MAX_BYTES, validateKyc } from '../../src/shared/domain/kyc.js';
import { query, tx } from '../db.js';
import { route } from '../http.js';
import { claimGuest, guestIdFromKey } from '../guests.js';
import { newId } from '../ids.js';
import { loadSelf } from '../load.js';
import { USER_COLUMNS, USER_FROM, userView } from '../views.js';


const cleanName = (name: unknown) => String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
const cleanPhone = (phone: unknown) => String(phone ?? '').trim().slice(0, 30);

/**
 * After a Firebase sign-in or sign-up: finds the Salacope account of this identity, creating it
 * on first use (the name comes from the sign-up form, else the Firebase profile).
 */
route('POST', '/session', async (ctx) => {
  const identity = await ctx.identity();
  if (!identity) throw new DomainError('Connexion expirée : reconnectez-vous.', 401);
  const name = cleanName(ctx.body.name) || cleanName(identity.name) || identity.email.split('@')[0];
  // Bought without an account on this browser: those purchases join the account.
  const guestId = await guestIdFromKey(ctx.guestKey);
  if (guestId) {
    const id = await tx((q) => claimGuest(q, guestId, identity, name, cleanPhone(ctx.body.phone)));
    return { userId: id, patch: { users: [await loadSelf(id)] } };
  }

  const [existing] = await query<{ id: string }>('SELECT id FROM users WHERE firebase_uid = $1', [identity.uid]);
  if (existing) return { userId: existing.id, patch: { users: [await loadSelf(existing.id)] } };

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
  const userId = await ctx.accountId();
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
  const userId = await ctx.accountId();
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

// ---------------------------------------------------------------- identity check (KYC) of the seller

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 4).toString('hex') === '89504e47',
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

const kycDocument = (value: unknown, label: string) => {
  const m = String(value ?? '').match(DATA_URL);
  if (!m) throw new DomainError(`Ajoutez la photo : ${label}.`);
  const data = Buffer.from(m[2], 'base64');
  if (!MAGIC[m[1]](data)) throw new DomainError(`Photo illisible : ${label}.`);
  if (data.length > KYC_MAX_BYTES) throw new DomainError(`Photo trop lourde : ${label}.`);
  if (data.length < 8_000) throw new DomainError(`Photo trop petite pour être lue : ${label}.`);
  return { mime: m[1], data };
};

/** Verified stores choose their address: salacope.online/@handle. */
route('PUT', '/merchant/handle', async (ctx) => {
  const userId = await ctx.accountId();
  const handle = ctx.body.handle ? validateHandle(ctx.body.handle) : null;
  await tx(async (q) => {
    const [m] = await q<{ verified: boolean }>('SELECT verified FROM merchants WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!m) throw new DomainError('Boutique introuvable.', 404);
    if (!m.verified) throw new DomainError('L’adresse personnalisée est réservée aux boutiques vérifiées.', 403);
    if (handle) {
      const [taken] = await q('SELECT 1 FROM merchants WHERE LOWER(handle) = $1 AND user_id <> $2', [handle, userId]);
      if (taken) throw new DomainError('Cette adresse est déjà prise.', 409);
    }
    await q('UPDATE merchants SET handle = $2 WHERE user_id = $1', [userId, handle]);
  });
  return { patch: { users: [await loadSelf(userId)] } };
});

/** Store photo, square and already reduced by the browser; the type is read from the bytes, never trusted. */
const LOGO_MAX_BYTES = 80_000;
route('PUT', '/merchant/logo', async (ctx) => {
  const userId = await ctx.accountId();
  let logo: string | null = null;
  if (ctx.body.logo) {
    const m = String(ctx.body.logo).match(DATA_URL);
    if (!m) throw new DomainError('Photo refusée : JPG, PNG ou WebP uniquement.');
    const data = Buffer.from(m[2], 'base64');
    if (!MAGIC[m[1]](data)) throw new DomainError('Ce fichier n’est pas une image valide.');
    if (data.length > LOGO_MAX_BYTES) throw new DomainError('Photo trop lourde après réduction : choisissez une autre image.');
    logo = String(ctx.body.logo);
  }
  const rows = await query('UPDATE merchants SET logo = $2 WHERE user_id = $1 RETURNING user_id', [userId, logo]);
  if (!rows.length) throw new DomainError('Boutique introuvable.', 404);
  return { patch: { users: [await loadSelf(userId)] } };
});

/** The seller sends their identity (policy §6.1); an administrator reviews it before any sale. */
route('POST', '/kyc', async (ctx) => {
  const userId = await ctx.accountId();
  const input = validateKyc(ctx.body, new Date().toISOString().slice(0, 10));
  const documents = KYC_DOCUMENTS.map((d) => ({ kind: d.kind, ...kycDocument(ctx.body.documents?.[d.kind], d.label) }));
  await tx(async (q) => {
    const [m] = await q<{ kyc_status: string }>('SELECT kyc_status FROM merchants WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!m) throw new DomainError('Ouvrez votre boutique avant de vérifier votre identité.', 403);
    if (m.kyc_status === 'approved') throw new DomainError('Votre identité est déjà vérifiée.', 409);
    if (m.kyc_status === 'pending') throw new DomainError('Votre demande est déjà en cours d’examen.', 409);
    const id = newId('kyc');
    await q(
      `INSERT INTO kyc_submissions (id, user_id, full_name, birth_date, nationality, id_type, id_number, id_expires, address, pep)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, userId, input.fullName, input.birthDate, input.nationality, input.idType, input.idNumber, input.idExpires ?? null, input.address, input.pep]
    );
    for (const d of documents) {
      await q('INSERT INTO kyc_documents (submission_id, kind, mime, data) VALUES ($1, $2, $3, $4)', [id, d.kind, d.mime, d.data]);
    }
    await q("UPDATE merchants SET kyc_status = 'pending', kyc_note = NULL WHERE user_id = $1", [userId]);
  });
  return { patch: { users: [await loadSelf(userId)] } };
});
