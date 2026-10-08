import { ROUTES } from '../../src/shared/config/routes.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import type { KycDocumentKind, RiskLevel } from '../../src/shared/domain/kyc.js';
import { audit, requireAdmin } from '../compliance.js';
import { query, tx } from '../db.js';
import { route } from '../http.js';
import { notify } from '../notify.js';

/**
 * Salacope administration (AML/CFT policy §4 and §6): sellers and their identity checks,
 * suspensions, blocked accounts, offers taken down, and the log of every action.
 * Reserved to the Firebase accounts listed in SALACOPE_ADMIN_UIDS.
 */

const text = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const reasonOf = (v: unknown) => {
  const reason = text(v, 300);
  if (reason.length < 5) throw new DomainError('Indiquez la raison (elle est gardée dans le journal).');
  return reason;
};
const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

route('GET', '/admin/overview', async (ctx) => {
  await requireAdmin(ctx);
  const [row] = await query(`SELECT
    (SELECT COUNT(*) FROM users WHERE firebase_uid IS NOT NULL) AS accounts,
    (SELECT COUNT(*) FROM users WHERE firebase_uid IS NULL) AS guests,
    (SELECT COUNT(*) FROM merchants) AS sellers,
    (SELECT COUNT(*) FROM merchants WHERE kyc_status = 'pending') AS kyc_pending,
    (SELECT COUNT(*) FROM merchants WHERE kyc_status = 'approved') AS kyc_approved,
    (SELECT COUNT(*) FROM merchants WHERE suspended_at IS NOT NULL) AS suspended,
    (SELECT COUNT(*) FROM users WHERE blocked_at IS NOT NULL) AS blocked,
    (SELECT COUNT(*) FROM listings WHERE status = 'published') AS listings,
    (SELECT COUNT(*) FROM orders WHERE status <> 'cancelled') AS orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'disputed') AS disputed,
    (SELECT COALESCE(SUM((amounts->>'total')::bigint), 0) FROM orders WHERE status <> 'cancelled') AS volume,
    (SELECT COALESCE(SUM((amounts->>'fee')::bigint), 0) FROM orders WHERE status = 'completed') AS commission`);
  return { overview: row };
});

route('GET', '/admin/sellers', async (ctx) => {
  await requireAdmin(ctx);
  const filter = ctx.search.get('filter') ?? 'all';
  const where =
    {
      pending: "m.kyc_status = 'pending'",
      approved: "m.kyc_status = 'approved' AND m.suspended_at IS NULL AND u.blocked_at IS NULL",
      unverified: "m.kyc_status IN ('none', 'rejected')",
      suspended: '(m.suspended_at IS NOT NULL OR u.blocked_at IS NOT NULL)',
    }[filter] ?? 'TRUE';
  const q = text(ctx.search.get('q'), 80);
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.created_at, u.blocked_at, m.store_name, m.city, m.kyc_status, m.risk, m.suspended_at,
       m.lightpay_connection_id IS NOT NULL AS wallet, m.activated_at,
       (SELECT created_at FROM kyc_submissions k WHERE k.user_id = u.id ORDER BY created_at DESC LIMIT 1) AS kyc_submitted_at,
       (SELECT COUNT(*) FROM orders o WHERE o.seller_id = u.id AND o.status <> 'cancelled') AS orders,
       (SELECT COALESCE(SUM((o.amounts->>'total')::bigint), 0) FROM orders o WHERE o.seller_id = u.id AND o.status <> 'cancelled') AS volume
     FROM merchants m JOIN users u ON u.id = m.user_id
     WHERE ${where} AND ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2 OR m.store_name ILIKE $2)
     ORDER BY (m.kyc_status = 'pending') DESC, m.activated_at DESC LIMIT 300`,
    [q, like(q)]
  );
  return { sellers: rows };
});

async function sellerDetail(id: string) {
  const [seller] = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at, u.blocked_at, u.blocked_reason,
       m.store_name, m.headline, m.city, m.kyc_status, m.kyc_note, m.risk, m.suspended_at, m.suspended_reason,
       m.lightpay_connection_id IS NOT NULL AS wallet, m.activated_at
     FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.id = $1`,
    [id]
  );
  if (!seller) throw new DomainError('Vendeur introuvable.', 404);
  const [submissions, documents, listings, stats, log] = await Promise.all([
    query(
      `SELECT id, full_name, birth_date::text, nationality, id_type, id_number, id_expires::text, address, pep, status, note,
         reviewed_by, reviewed_at, created_at
       FROM kyc_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    ),
    query(
      `SELECT d.submission_id, d.kind FROM kyc_documents d JOIN kyc_submissions k ON k.id = d.submission_id WHERE k.user_id = $1`,
      [id]
    ),
    query(
      `SELECT l.id, l.title, l.category, l.price_xaf, l.status, l.published_at,
         (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status <> 'cancelled') AS sales
       FROM listings l WHERE l.seller_id = $1 ORDER BY l.created_at DESC`,
      [id]
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE status <> 'cancelled') AS orders,
         COUNT(*) FILTER (WHERE status = 'disputed') AS disputed,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
         COALESCE(SUM((amounts->>'total')::bigint) FILTER (WHERE status <> 'cancelled'), 0) AS volume,
         COALESCE(SUM((amounts->>'fee')::bigint) FILTER (WHERE status = 'completed'), 0) AS commission
       FROM orders WHERE seller_id = $1`,
      [id]
    ),
    query('SELECT id, admin_email, action, detail, created_at FROM admin_audit WHERE target_user_id = $1 ORDER BY created_at DESC LIMIT 30', [id]),
  ]);
  return {
    seller,
    submissions: submissions.map((s) => ({ ...s, documents: documents.filter((d) => d.submission_id === s.id).map((d) => d.kind) })),
    listings,
    stats: stats[0],
    log,
  };
}

route('GET', '/admin/sellers/:id', async (ctx) => {
  await requireAdmin(ctx);
  return sellerDetail(ctx.params.id);
});

/** One identity document, only for administrators; each view is logged. */
route('GET', '/admin/kyc/:submissionId/:kind', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const kind = ctx.params.kind as KycDocumentKind;
  const [doc] = await query(
    `SELECT d.mime, encode(d.data, 'base64') AS data, k.user_id FROM kyc_documents d JOIN kyc_submissions k ON k.id = d.submission_id
     WHERE d.submission_id = $1 AND d.kind = $2`,
    [ctx.params.submissionId, kind]
  );
  if (!doc) throw new DomainError('Document introuvable.', 404);
  await audit(query, admin, 'kyc.view', doc.user_id, { submission: ctx.params.submissionId, document: kind });
  return { dataUrl: `data:${doc.mime};base64,${String(doc.data).replace(/\s/g, '')}` };
});

route('POST', '/admin/sellers/:id/kyc', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const id = ctx.params.id;
  const approved = ctx.body.decision === 'approved';
  const note = approved ? text(ctx.body.note, 300) : reasonOf(ctx.body.note);
  await tx(async (q) => {
    const [sub] = await q("SELECT id FROM kyc_submissions WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [id]);
    if (!sub) throw new DomainError('Aucune demande en attente pour ce vendeur.', 409);
    await q('UPDATE kyc_submissions SET status = $2, note = $3, reviewed_by = $4, reviewed_at = NOW() WHERE id = $1', [
      sub.id,
      approved ? 'approved' : 'rejected',
      note || null,
      admin.email,
    ]);
    await q('UPDATE merchants SET kyc_status = $2, kyc_note = $3, verified = $4 WHERE user_id = $1', [
      id,
      approved ? 'approved' : 'rejected',
      approved ? null : note,
      approved,
    ]);
    await audit(q, admin, approved ? 'kyc.approve' : 'kyc.reject', id, { submission: sub.id, note });
    await notify(q, [
      approved
        ? { userId: id, title: 'Identité vérifiée', body: 'Vous pouvez maintenant publier vos offres.', href: ROUTES.seller.listings }
        : { userId: id, title: 'Vérification d’identité refusée', body: note, href: ROUTES.seller.verification },
    ]);
  });
  return sellerDetail(id);
});

const RISKS: RiskLevel[] = ['low', 'medium', 'high'];

route('PATCH', '/admin/sellers/:id', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const id = ctx.params.id;
  const name = text(ctx.body.name, 80);
  const storeName = text(ctx.body.storeName, 60);
  if (!name || !storeName) throw new DomainError('Le nom et le nom de la boutique sont obligatoires.');
  const headline = text(ctx.body.headline, 140);
  const city = text(ctx.body.city, 60);
  const risk: RiskLevel = RISKS.includes(ctx.body.risk) ? ctx.body.risk : 'low';
  await tx(async (q) => {
    const [before] = await q('SELECT u.name, m.store_name, m.headline, m.city, m.risk FROM merchants m JOIN users u ON u.id = m.user_id WHERE m.user_id = $1 FOR UPDATE', [id]);
    if (!before) throw new DomainError('Vendeur introuvable.', 404);
    const [taken] = await q('SELECT 1 FROM merchants WHERE LOWER(store_name) = LOWER($1) AND user_id <> $2', [storeName, id]);
    if (taken) throw new DomainError('Ce nom de boutique est déjà pris.', 409);
    await q('UPDATE users SET name = $2, updated_at = NOW() WHERE id = $1', [id, name]);
    await q('UPDATE merchants SET store_name = $2, headline = $3, city = $4, risk = $5 WHERE user_id = $1', [id, storeName, headline, city, risk]);
    await audit(q, admin, 'seller.edit', id, { before, after: { name, store_name: storeName, headline, city, risk } });
  });
  return sellerDetail(id);
});

route('POST', '/admin/sellers/:id/suspend', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const reason = reasonOf(ctx.body.reason);
  await tx(async (q) => {
    const rows = await q('UPDATE merchants SET suspended_at = NOW(), suspended_reason = $2 WHERE user_id = $1 AND suspended_at IS NULL RETURNING user_id', [
      ctx.params.id,
      reason,
    ]);
    if (!rows.length) throw new DomainError('Cette boutique est déjà suspendue.', 409);
    await audit(q, admin, 'seller.suspend', ctx.params.id, { reason });
    await notify(q, [{ userId: ctx.params.id, title: 'Boutique suspendue', body: reason, href: ROUTES.seller.root }]);
  });
  return sellerDetail(ctx.params.id);
});

route('POST', '/admin/sellers/:id/unsuspend', async (ctx) => {
  const admin = await requireAdmin(ctx);
  await tx(async (q) => {
    const rows = await q('UPDATE merchants SET suspended_at = NULL, suspended_reason = NULL WHERE user_id = $1 AND suspended_at IS NOT NULL RETURNING user_id', [
      ctx.params.id,
    ]);
    if (!rows.length) throw new DomainError('Cette boutique n’est pas suspendue.', 409);
    await audit(q, admin, 'seller.unsuspend', ctx.params.id, { note: text(ctx.body.note, 300) });
    await notify(q, [{ userId: ctx.params.id, title: 'Boutique réactivée', body: 'Vos offres sont de nouveau visibles.', href: ROUTES.seller.root }]);
  });
  return sellerDetail(ctx.params.id);
});

/** Takes an offer offline (prohibited content, rights, fraud). The seller is told why. */
route('POST', '/admin/listings/:id/unpublish', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const reason = reasonOf(ctx.body.reason);
  const sellerId = await tx(async (q) => {
    const [l] = await q("UPDATE listings SET status = 'draft', updated_at = NOW() WHERE id = $1 AND status = 'published' RETURNING seller_id, title", [
      ctx.params.id,
    ]);
    if (!l) throw new DomainError('Cette offre n’est pas en ligne.', 409);
    await audit(q, admin, 'listing.unpublish', l.seller_id, { listing: ctx.params.id, title: l.title, reason });
    await notify(q, [{ userId: l.seller_id, title: `Offre retirée : ${l.title}`, body: reason, href: ROUTES.seller.listing(ctx.params.id) }]);
    return l.seller_id as string;
  });
  return sellerDetail(sellerId);
});

// ---------------------------------------------------------------- accounts (buyers and sellers)

route('GET', '/admin/users', async (ctx) => {
  await requireAdmin(ctx);
  const blockedOnly = ctx.search.get('filter') === 'blocked';
  const q = text(ctx.search.get('q'), 80);
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at, u.blocked_at, u.blocked_reason, m.store_name,
       (SELECT COUNT(*) FROM orders o WHERE o.buyer_id = u.id AND o.status <> 'cancelled') AS purchases,
       (SELECT COALESCE(SUM((o.amounts->>'total')::bigint), 0) FROM orders o WHERE o.buyer_id = u.id AND o.status <> 'cancelled') AS spent
     FROM users u LEFT JOIN merchants m ON m.user_id = u.id
     WHERE u.firebase_uid IS NOT NULL AND ($3 = FALSE OR u.blocked_at IS NOT NULL)
       AND ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2 OR u.phone ILIKE $2)
     ORDER BY u.created_at DESC LIMIT 300`,
    [q, like(q), blockedOnly]
  );
  return { users: rows };
});

route('POST', '/admin/users/:id/block', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const reason = reasonOf(ctx.body.reason);
  await tx(async (q) => {
    const [u] = await q('SELECT firebase_uid, blocked_at FROM users WHERE id = $1 FOR UPDATE', [ctx.params.id]);
    if (!u) throw new DomainError('Compte introuvable.', 404);
    if (u.firebase_uid === admin.uid) throw new DomainError('Vous ne pouvez pas bloquer votre propre compte.');
    if (u.blocked_at) throw new DomainError('Ce compte est déjà bloqué.', 409);
    await q('UPDATE users SET blocked_at = NOW(), blocked_reason = $2, updated_at = NOW() WHERE id = $1', [ctx.params.id, reason]);
    await audit(q, admin, 'user.block', ctx.params.id, { reason });
  });
  return { ok: true };
});

route('POST', '/admin/users/:id/unblock', async (ctx) => {
  const admin = await requireAdmin(ctx);
  await tx(async (q) => {
    const rows = await q('UPDATE users SET blocked_at = NULL, blocked_reason = NULL, updated_at = NOW() WHERE id = $1 AND blocked_at IS NOT NULL RETURNING id', [
      ctx.params.id,
    ]);
    if (!rows.length) throw new DomainError('Ce compte n’est pas bloqué.', 409);
    await audit(q, admin, 'user.unblock', ctx.params.id, { note: text(ctx.body.note, 300) });
  });
  return { ok: true };
});

route('GET', '/admin/audit', async (ctx) => {
  await requireAdmin(ctx);
  const rows = await query(
    `SELECT a.id, a.admin_email, a.action, a.detail, a.created_at, a.target_user_id, u.name AS target_name, m.store_name AS target_store
     FROM admin_audit a LEFT JOIN users u ON u.id = a.target_user_id LEFT JOIN merchants m ON m.user_id = a.target_user_id
     ORDER BY a.created_at DESC LIMIT 300`
  );
  return { log: rows };
});

// --- Advertising slots of the storefront banner ---------------------------------------------------------------
const BANNER_IMAGE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const BANNER_MAX_BYTES = 300_000;
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 4).toString('hex') === '89504e47',
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};
const slotOf = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 3) throw new DomainError('Emplacement inconnu (1 à 3).', 404);
  return n;
};

/** What visitors see: the active slots, in order. */
route('GET', '/banners', async () => ({
  banners: await query("SELECT position, image, title, link FROM ad_banners WHERE active ORDER BY position"),
}));

route('GET', '/admin/banners', async (ctx) => {
  await requireAdmin(ctx);
  return { banners: await query('SELECT position, image, title, link, active, updated_at FROM ad_banners ORDER BY position') };
});

route('PUT', '/admin/banners/:position', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const position = slotOf(ctx.params.position);
  const title = text(ctx.body.title, 80);
  const link = String(ctx.body.link ?? '').trim();
  // A page of the site, or a secure address: nothing else can be opened from the banner.
  if (!/^\/(?!\/)[^\s]*$/.test(link) && !/^https:\/\/[^\s]+$/.test(link)) {
    throw new DomainError('Lien invalide : une page du site (/…) ou une adresse https://…');
  }
  const active = ctx.body.active !== false;
  const [current] = await query('SELECT image FROM ad_banners WHERE position = $1', [position]);
  let image = current?.image as string | undefined;
  if (ctx.body.image) {
    const m = String(ctx.body.image).match(BANNER_IMAGE);
    if (!m) throw new DomainError('Image refusée : JPG, PNG ou WebP uniquement.');
    const data = Buffer.from(m[2], 'base64');
    if (!MAGIC[m[1]](data)) throw new DomainError('Ce fichier n’est pas une image valide.');
    if (data.length > BANNER_MAX_BYTES) throw new DomainError('Image trop lourde après réduction : choisissez-en une autre.');
    image = String(ctx.body.image);
  }
  if (!image) throw new DomainError('Ajoutez l’image de l’emplacement.');
  await tx(async (q) => {
    await q(
      `INSERT INTO ad_banners (position, image, title, link, active) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (position) DO UPDATE SET image = $2, title = $3, link = $4, active = $5, updated_at = NOW()`,
      [position, image, title, link, active]
    );
    await audit(q, admin, 'banner.save', null, { position, title, link, active });
  });
  return { banners: await query('SELECT position, image, title, link, active, updated_at FROM ad_banners ORDER BY position') };
});

route('DELETE', '/admin/banners/:position', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const position = slotOf(ctx.params.position);
  await tx(async (q) => {
    await q('DELETE FROM ad_banners WHERE position = $1', [position]);
    await audit(q, admin, 'banner.remove', null, { position });
  });
  return { banners: await query('SELECT position, image, title, link, active, updated_at FROM ad_banners ORDER BY position') };
});
