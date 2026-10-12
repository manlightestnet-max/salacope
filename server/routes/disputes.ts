import { CONTACT_BLOCKED, containsContact } from '../../src/shared/domain/contact.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { ROUTES } from '../../src/shared/config/routes.js';
import { requireAdmin } from '../compliance.js';
import { query, tx } from '../db.js';
import { disputeLabel } from '../disputes.js';
import { route } from '../http.js';
import { newId } from '../ids.js';
import { notify } from '../notify.js';
import { signAttachments, storeAttachments } from '../storage/attachments.js';
import { cleanAttachments } from './orders.js';

/**
 * Dispute rooms: the conversation of a disputed order between the buyer, the seller and Salacope. Parties see their own
 * disputes; the administration sees all of them and writes as Salacope (author NULL).
 */

const PAGE = 30;
const offsetOf = (ctx: { search: URLSearchParams }) => Math.max(0, Math.floor(Number(ctx.search.get('offset'))) || 0);
const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
const clean = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

const LAST = (col: string) => `(SELECT ${col} FROM dispute_messages x WHERE x.dispute_id = d.id ORDER BY x.at DESC, x.id DESC LIMIT 1)`;

/** Everything one dispute room shows: the dispute, its order, and the messages (stored files get a short-lived address). */
async function detailOf(disputeId: string) {
  const [row] = await query(
    `SELECT d.id, d.number, d.status, d.outcome, d.created_at, d.closed_at, d.opened_by,
       o.id AS order_id, o.number AS order_number, o.listing_id, o.item->>'title' AS title, o.item->>'kind' AS kind,
       (o.amounts->>'total')::bigint AS total, o.status AS order_status, o.seller_id, o.buyer_id,
       COALESCE(m.store_name, su.name) AS seller_name, o.buyer->>'name' AS buyer_name,
       (o.status IN ('paid', 'in_progress', 'delivered', 'disputed') AND o.lightpay_hold_id IS NOT NULL) AS held
     FROM disputes d JOIN orders o ON o.id = d.order_id JOIN users su ON su.id = o.seller_id LEFT JOIN merchants m ON m.user_id = o.seller_id
     WHERE d.id = $1`,
    [disputeId]
  );
  if (!row) throw new DomainError('Litige introuvable.', 404);
  const messages = await query(
    `SELECT x.id, x.author_id, x.body, x.attachments, x.at, u.name FROM dispute_messages x LEFT JOIN users u ON u.id = x.author_id
     WHERE x.dispute_id = $1 ORDER BY x.at, x.id`,
    [disputeId]
  );
  const shaped = messages.map((m) => ({
    id: m.id,
    authorId: m.author_id as string | null,
    role: m.author_id === null ? 'salacope' : m.author_id === row.seller_id ? 'seller' : 'buyer',
    name: m.author_id === null ? 'Support Salacope' : m.author_id === row.seller_id ? row.seller_name : row.buyer_name,
    body: m.body as string,
    attachments: (m.attachments ?? []) as any[],
    at: m.at as string,
  }));
  await signAttachments(shaped).catch(() => undefined);
  return {
    dispute: { id: row.id, number: row.number, label: disputeLabel(row.number), status: row.status, outcome: row.outcome, createdAt: row.created_at, closedAt: row.closed_at },
    order: {
      id: row.order_id,
      number: row.order_number,
      listingId: row.listing_id,
      title: row.title,
      kind: row.kind,
      total: Number(row.total),
      status: row.order_status,
      sellerId: row.seller_id,
      buyerId: row.buyer_id,
      sellerName: row.seller_name,
      buyerName: row.buyer_name,
      held: row.held,
    },
    messages: shaped,
  };
}

/** The disputed order's other participants, for a party writing in the room. */
async function partyOf(disputeId: string, userId: string) {
  const [row] = await query(
    `SELECT d.id, d.number, d.status, o.seller_id, o.buyer_id, o.number AS order_number
     FROM disputes d JOIN orders o ON o.id = d.order_id WHERE d.id = $1 AND (o.seller_id = $2 OR o.buyer_id = $2)`,
    [disputeId, userId]
  );
  if (!row) throw new DomainError('Litige introuvable.', 404);
  return { ...row, side: row.seller_id === userId ? ('seller' as const) : ('buyer' as const) };
}

const hrefFor = (side: 'seller' | 'buyer', disputeId: string) => (side === 'seller' ? ROUTES.seller.dispute(disputeId) : ROUTES.account.dispute(disputeId));

// ---------------------------------------------------------------- the parties

route('GET', '/disputes', async (ctx) => {
  const userId = await ctx.userId();
  const rows = await query(
    `SELECT d.id, d.number, d.status, d.outcome, d.updated_at, o.number AS order_number, o.item->>'title' AS title,
       CASE WHEN o.seller_id = $1 THEN o.buyer->>'name' ELSE COALESCE(m.store_name, su.name) END AS counterpart,
       CASE WHEN o.seller_id = $1 THEN 'seller' ELSE 'buyer' END AS side,
       ${LAST('body')} AS last_body, ${LAST('author_id')} AS last_author,
       (SELECT COUNT(*)::int FROM dispute_messages x WHERE x.dispute_id = d.id AND x.author_id IS DISTINCT FROM $1
          AND x.at > COALESCE((SELECT r.read_at FROM dispute_reads r WHERE r.dispute_id = d.id AND r.user_id = $1), 'epoch')) AS unread
     FROM disputes d JOIN orders o ON o.id = d.order_id JOIN users su ON su.id = o.seller_id LEFT JOIN merchants m ON m.user_id = o.seller_id
     WHERE o.seller_id = $1 OR o.buyer_id = $1
     ORDER BY d.updated_at DESC, d.id LIMIT ${PAGE + 1} OFFSET ${offsetOf(ctx)}`,
    [userId]
  );
  return { disputes: rows.slice(0, PAGE).map((r) => ({ ...r, label: disputeLabel(r.number) })), hasMore: rows.length > PAGE };
});

/** What the menus show: open disputes, and messages not read yet. */
route('GET', '/disputes/summary', async (ctx) => {
  const userId = await ctx.userId();
  const [row] = await query(
    `SELECT COUNT(*) FILTER (WHERE d.status = 'open')::int AS open, COUNT(*)::int AS total,
       COALESCE(SUM((SELECT COUNT(*)::int FROM dispute_messages x WHERE x.dispute_id = d.id AND x.author_id IS DISTINCT FROM $1
          AND x.at > COALESCE((SELECT r.read_at FROM dispute_reads r WHERE r.dispute_id = d.id AND r.user_id = $1), 'epoch'))), 0)::int AS unread
     FROM disputes d JOIN orders o ON o.id = d.order_id WHERE o.seller_id = $1 OR o.buyer_id = $1`,
    [userId]
  );
  return row;
});

route('GET', '/disputes/:id', async (ctx) => {
  const userId = await ctx.userId();
  const party = await partyOf(ctx.params.id, userId);
  await query('INSERT INTO dispute_reads (dispute_id, user_id, read_at) VALUES ($1, $2, NOW()) ON CONFLICT (dispute_id, user_id) DO UPDATE SET read_at = NOW()', [party.id, userId]);
  return { ...(await detailOf(party.id)), me: party.side };
});

route('POST', '/disputes/:id/messages', async (ctx) => {
  const userId = await ctx.userId();
  const party = await partyOf(ctx.params.id, userId);
  if (party.status !== 'open') throw new DomainError('Ce litige est clos : la décision est prise.', 409);
  const body = clean(ctx.body.body, 4000);
  const files = cleanAttachments(ctx.body.attachments);
  if (!body && files.length === 0) throw new DomainError('Message vide.');
  if (containsContact(body)) throw new DomainError(CONTACT_BLOCKED);
  await tx(async (q) => {
    const attachments = await storeAttachments(userId, files, party.id);
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body, attachments) VALUES ($1, $2, $3, $4, $5::jsonb)', [newId('dmg'), party.id, userId, body, JSON.stringify(attachments)]);
    await q('UPDATE disputes SET updated_at = NOW() WHERE id = $1', [party.id]);
    await q('INSERT INTO dispute_reads (dispute_id, user_id, read_at) VALUES ($1, $2, NOW()) ON CONFLICT (dispute_id, user_id) DO UPDATE SET read_at = NOW()', [party.id, userId]);
    const other = party.side === 'seller' ? party.buyer_id : party.seller_id;
    await notify(q, [{ userId: other, title: `${disputeLabel(party.number)} · nouveau message`, body: body || 'Pièce jointe', href: hrefFor(party.side === 'seller' ? 'buyer' : 'seller', party.id) }]);
  });
  return { ...(await detailOf(party.id)), me: party.side };
});

// ---------------------------------------------------------------- the administration

route('GET', '/admin/disputes', async (ctx) => {
  await requireAdmin(ctx);
  const filter = ctx.search.get('filter') ?? 'waiting';
  const q = clean(ctx.search.get('q'), 80);
  const where = { waiting: `d.status = 'open' AND ${LAST('author_id')} IS NOT NULL`, open: "d.status = 'open'", resolved: "d.status = 'resolved'" }[filter] ?? 'TRUE';
  const rows = await query(
    `SELECT d.id, d.number, d.status, d.outcome, d.updated_at, o.number AS order_number, o.item->>'title' AS title, (o.amounts->>'total')::bigint AS total,
       COALESCE(m.store_name, su.name) AS seller_name, o.buyer->>'name' AS buyer_name,
       ${LAST('body')} AS last_body, (${LAST('author_id')} IS NULL) AS last_from_salacope
     FROM disputes d JOIN orders o ON o.id = d.order_id JOIN users su ON su.id = o.seller_id LEFT JOIN merchants m ON m.user_id = o.seller_id
     WHERE ${where} AND ($1 = '' OR o.number ILIKE $2 OR o.item->>'title' ILIKE $2 OR su.name ILIKE $2 OR m.store_name ILIKE $2 OR o.buyer->>'name' ILIKE $2
        OR ('litige ' || lpad(d.number::text, 2, '0')) ILIKE $2)
     ORDER BY CASE WHEN d.status = 'open' THEN 0 ELSE 1 END, d.updated_at DESC, d.id LIMIT ${PAGE + 1} OFFSET ${offsetOf(ctx)}`,
    [q, like(q)]
  );
  const [counts] = await query(
    `SELECT COUNT(*) FILTER (WHERE d.status = 'open' AND ${LAST('author_id')} IS NOT NULL)::int AS waiting, COUNT(*) FILTER (WHERE d.status = 'open')::int AS open FROM disputes d`
  );
  return { disputes: rows.slice(0, PAGE).map((r) => ({ ...r, label: disputeLabel(r.number), total: Number(r.total) })), hasMore: rows.length > PAGE, counts };
});

route('GET', '/admin/disputes/:id', async (ctx) => {
  await requireAdmin(ctx);
  return { ...(await detailOf(ctx.params.id)), me: 'admin' as const };
});

route('POST', '/admin/disputes/:id/messages', async (ctx) => {
  await requireAdmin(ctx);
  const body = clean(ctx.body.body, 4000);
  const files = cleanAttachments(ctx.body.attachments);
  if (!body && files.length === 0) throw new DomainError('Message vide.');
  await tx(async (q) => {
    const [d] = await q('SELECT d.id, d.number, d.status, o.seller_id, o.buyer_id FROM disputes d JOIN orders o ON o.id = d.order_id WHERE d.id = $1 FOR UPDATE OF d', [ctx.params.id]);
    if (!d) throw new DomainError('Litige introuvable.', 404);
    if (d.status !== 'open') throw new DomainError('Ce litige est clos.', 409);
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body, attachments) VALUES ($1, $2, NULL, $3, $4::jsonb)', [newId('dmg'), d.id, body, JSON.stringify(files)]);
    await q('UPDATE disputes SET updated_at = NOW() WHERE id = $1', [d.id]);
    const title = `${disputeLabel(d.number)} · message de Salacope`;
    await notify(q, [
      { userId: d.seller_id, title, body: body || 'Pièce jointe', href: ROUTES.seller.dispute(d.id) },
      { userId: d.buyer_id, title, body: body || 'Pièce jointe', href: ROUTES.account.dispute(d.id) },
    ]);
  });
  return { ...(await detailOf(ctx.params.id)), me: 'admin' as const };
});
