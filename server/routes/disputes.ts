import { CONTACT_BLOCKED, containsContact } from '../../src/shared/domain/contact.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { ROUTES } from '../../src/shared/config/routes.js';
import { audit, requireAdmin } from '../compliance.js';
import { query, tx } from '../db.js';
import { disputeLabel } from '../disputes.js';
import { route } from '../http.js';
import { newId } from '../ids.js';
import { notify } from '../notify.js';
import { signAttachments, storeAttachments } from '../storage/attachments.js';
import { cleanAttachments } from './orders.js';

/**
 * Dispute rooms. Two kinds:
 *   order   : the conversation of a disputed order between the buyer, the seller and Salacope;
 *   conduct : opened by the administration about an account (copied content…): Salacope and the account concerned.
 * Parties see their own rooms; the administration sees all of them and writes as Salacope (author NULL).
 */

const PAGE = 30;
const offsetOf = (ctx: { search: URLSearchParams }) => Math.max(0, Math.floor(Number(ctx.search.get('offset'))) || 0);
const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
const clean = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const cleanMultiline = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

const LAST = (col: string) => `(SELECT ${col} FROM dispute_messages x WHERE x.dispute_id = d.id ORDER BY x.at DESC, x.id DESC LIMIT 1)`;
const FROM = `disputes d LEFT JOIN orders o ON o.id = d.order_id LEFT JOIN users su ON su.id = o.seller_id LEFT JOIN merchants m ON m.user_id = o.seller_id
     LEFT JOIN users sj ON sj.id = d.subject_id`;
const TITLE = `COALESCE(o.item->>'title', d.title)`;
const UNREAD = (me: string) => `(SELECT COUNT(*)::int FROM dispute_messages x WHERE x.dispute_id = d.id AND x.author_id IS DISTINCT FROM ${me}
          AND x.at > COALESCE((SELECT r.read_at FROM dispute_reads r WHERE r.dispute_id = d.id AND r.user_id = ${me}), 'epoch'))`;

/** Everything one dispute room shows: the dispute, its order or its subject, and the messages (stored files get a short-lived address). */
async function detailOf(disputeId: string) {
  const [row] = await query(
    `SELECT d.id, d.number, d.kind, d.status, d.outcome, d.created_at, d.closed_at, d.title AS subject_title, d.subject_id, d.listing_id AS conduct_listing_id,
       sj.name AS subject_name, (SELECT COUNT(*)::int FROM account_warnings w WHERE w.user_id = d.subject_id) AS warnings,
       (SELECT COUNT(*)::int FROM account_warnings w WHERE w.dispute_id = d.id) AS warnings_here,
       (SELECT l.title FROM listings l WHERE l.id = d.listing_id) AS conduct_listing_title,
       (SELECT EXISTS (SELECT 1 FROM merchants mm WHERE mm.user_id = d.subject_id)) AS subject_is_seller,
       o.id AS order_id, o.number AS order_number, o.listing_id, o.item->>'title' AS title, o.item->>'kind' AS item_kind,
       (o.amounts->>'total')::bigint AS total, o.status AS order_status, o.seller_id, o.buyer_id,
       COALESCE(m.store_name, su.name) AS seller_name, o.buyer->>'name' AS buyer_name,
       (o.status IN ('paid', 'in_progress', 'delivered', 'disputed') AND o.lightpay_hold_id IS NOT NULL) AS held
     FROM ${FROM} WHERE d.id = $1`,
    [disputeId]
  );
  if (!row) throw new DomainError('Litige introuvable.', 404);
  const messages = await query(
    `SELECT x.id, x.author_id, x.body, x.attachments, x.at, u.name FROM dispute_messages x LEFT JOIN users u ON u.id = x.author_id
     WHERE x.dispute_id = $1 ORDER BY x.at, x.id`,
    [disputeId]
  );
  const conduct = row.kind === 'conduct';
  const shaped = messages.map((m) => ({
    id: m.id,
    authorId: m.author_id as string | null,
    role: m.author_id === null ? 'salacope' : conduct ? 'accused' : m.author_id === row.seller_id ? 'seller' : 'buyer',
    name: m.author_id === null ? 'Support Salacope' : conduct ? m.name : m.author_id === row.seller_id ? row.seller_name : row.buyer_name,
    body: m.body as string,
    attachments: (m.attachments ?? []) as any[],
    at: m.at as string,
  }));
  await signAttachments(shaped).catch(() => undefined);
  return {
    dispute: {
      id: row.id,
      number: row.number,
      label: disputeLabel(row.number),
      kind: row.kind as 'order' | 'conduct',
      title: row.subject_title as string | null,
      status: row.status,
      outcome: row.outcome,
      createdAt: row.created_at,
      closedAt: row.closed_at,
    },
    order: row.order_id
      ? {
          id: row.order_id,
          number: row.order_number,
          listingId: row.listing_id,
          title: row.title,
          kind: row.item_kind,
          total: Number(row.total),
          status: row.order_status,
          sellerId: row.seller_id,
          buyerId: row.buyer_id,
          sellerName: row.seller_name,
          buyerName: row.buyer_name,
          held: row.held,
        }
      : null,
    subject: conduct
      ? {
          id: row.subject_id as string,
          name: row.subject_name as string,
          isSeller: row.subject_is_seller as boolean,
          warnings: row.warnings as number,
          warningsHere: row.warnings_here as number,
          listing: row.conduct_listing_id ? { id: row.conduct_listing_id as string, title: row.conduct_listing_title as string } : null,
        }
      : null,
    messages: shaped,
  };
}

/** A person's access to a room: a party of the order, or the account concerned by a conduct dispute. */
async function partyOf(disputeId: string, userId: string) {
  const [row] = await query(
    `SELECT d.id, d.number, d.kind, d.status, d.subject_id, o.seller_id, o.buyer_id
     FROM disputes d LEFT JOIN orders o ON o.id = d.order_id WHERE d.id = $1 AND (o.seller_id = $2 OR o.buyer_id = $2 OR d.subject_id = $2)`,
    [disputeId, userId]
  );
  if (!row) throw new DomainError('Litige introuvable.', 404);
  return { ...row, side: (row.kind === 'conduct' ? 'accused' : row.seller_id === userId ? 'seller' : 'buyer') as 'seller' | 'buyer' | 'accused' };
}

const hrefFor = (isSeller: boolean, disputeId: string) => (isSeller ? ROUTES.seller.dispute(disputeId) : ROUTES.account.dispute(disputeId));

// ---------------------------------------------------------------- the parties

route('GET', '/disputes', async (ctx) => {
  const userId = await ctx.userId();
  const rows = await query(
    `SELECT d.id, d.number, d.kind, d.status, d.outcome, d.updated_at, o.number AS order_number, ${TITLE} AS title,
       CASE WHEN d.kind = 'conduct' THEN 'Salacope' WHEN o.seller_id = $1 THEN o.buyer->>'name' ELSE COALESCE(m.store_name, su.name) END AS counterpart,
       CASE WHEN d.kind = 'conduct' THEN 'accused' WHEN o.seller_id = $1 THEN 'seller' ELSE 'buyer' END AS side,
       ${LAST('body')} AS last_body, ${LAST('author_id')} AS last_author, ${UNREAD('$1')} AS unread
     FROM ${FROM}
     WHERE o.seller_id = $1 OR o.buyer_id = $1 OR d.subject_id = $1
     ORDER BY d.updated_at DESC, d.id LIMIT ${PAGE + 1} OFFSET ${offsetOf(ctx)}`,
    [userId]
  );
  return { disputes: rows.slice(0, PAGE).map((r) => ({ ...r, label: disputeLabel(r.number) })), hasMore: rows.length > PAGE };
});

/** What the menus show: open disputes, and messages not read yet. */
route('GET', '/disputes/summary', async (ctx) => {
  const userId = await ctx.userId();
  const [row] = await query(
    `SELECT COUNT(*) FILTER (WHERE d.status = 'open')::int AS open, COUNT(*)::int AS total, COALESCE(SUM(${UNREAD('$1')}), 0)::int AS unread
     FROM ${FROM} WHERE o.seller_id = $1 OR o.buyer_id = $1 OR d.subject_id = $1`,
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
  const body = cleanMultiline(ctx.body.body, 4000);
  const files = cleanAttachments(ctx.body.attachments);
  if (!body && files.length === 0) throw new DomainError('Message vide.');
  if (containsContact(body)) throw new DomainError(CONTACT_BLOCKED);
  await tx(async (q) => {
    const attachments = await storeAttachments(userId, files, party.id);
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body, attachments) VALUES ($1, $2, $3, $4, $5::jsonb)', [newId('dmg'), party.id, userId, body, JSON.stringify(attachments)]);
    await q('UPDATE disputes SET updated_at = NOW() WHERE id = $1', [party.id]);
    await q('INSERT INTO dispute_reads (dispute_id, user_id, read_at) VALUES ($1, $2, NOW()) ON CONFLICT (dispute_id, user_id) DO UPDATE SET read_at = NOW()', [party.id, userId]);
    // Between a buyer and a seller the other one is told; in a conduct dispute Salacope sees it in its list.
    if (party.kind === 'order') {
      const other = party.side === 'seller' ? party.buyer_id : party.seller_id;
      await notify(q, [{ userId: other, title: `${disputeLabel(party.number)} · nouveau message`, body: body || 'Pièce jointe', href: hrefFor(party.side !== 'seller', party.id) }]);
    }
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
    `SELECT d.id, d.number, d.kind, d.status, d.outcome, d.updated_at, o.number AS order_number, ${TITLE} AS title, (o.amounts->>'total')::bigint AS total,
       COALESCE(m.store_name, su.name) AS seller_name, o.buyer->>'name' AS buyer_name, sj.name AS subject_name,
       ${LAST('body')} AS last_body, (${LAST('author_id')} IS NULL) AS last_from_salacope
     FROM ${FROM}
     WHERE ${where} AND ($1 = '' OR o.number ILIKE $2 OR ${TITLE} ILIKE $2 OR su.name ILIKE $2 OR m.store_name ILIKE $2 OR o.buyer->>'name' ILIKE $2 OR sj.name ILIKE $2
        OR ('litige ' || lpad(d.number::text, 2, '0')) ILIKE $2)
     ORDER BY CASE WHEN d.status = 'open' THEN 0 ELSE 1 END, d.updated_at DESC, d.id LIMIT ${PAGE + 1} OFFSET ${offsetOf(ctx)}`,
    [q, like(q)]
  );
  const [counts] = await query(
    `SELECT COUNT(*) FILTER (WHERE d.status = 'open' AND ${LAST('author_id')} IS NOT NULL)::int AS waiting, COUNT(*) FILTER (WHERE d.status = 'open')::int AS open FROM disputes d`
  );
  return { disputes: rows.slice(0, PAGE).map((r) => ({ ...r, label: disputeLabel(r.number), total: r.total === null ? null : Number(r.total) })), hasMore: rows.length > PAGE, counts };
});

route('GET', '/admin/disputes/:id', async (ctx) => {
  await requireAdmin(ctx);
  return { ...(await detailOf(ctx.params.id)), me: 'admin' as const };
});

/** Opens a conduct dispute about an account (copied content…): the account is told, and the first message is Salacope's. */
route('POST', '/admin/disputes', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const subjectId = String(ctx.body.subjectId ?? '');
  const title = clean(ctx.body.title, 120);
  const message = cleanMultiline(ctx.body.message, 4000);
  const listingId = ctx.body.listingId ? String(ctx.body.listingId) : null;
  if (title.length < 4) throw new DomainError('Donnez un objet au litige.');
  if (message.length < 10) throw new DomainError('Expliquez ce qui est reproché (10 caractères minimum).');
  const id = newId('dsp');
  await tx(async (q) => {
    const [subject] = await q('SELECT u.id, u.firebase_uid, (SELECT EXISTS (SELECT 1 FROM merchants m WHERE m.user_id = u.id)) AS seller FROM users u WHERE u.id = $1 AND u.firebase_uid IS NOT NULL', [subjectId]);
    if (!subject) throw new DomainError('Compte introuvable.', 404);
    if (listingId) {
      const [l] = await q('SELECT 1 FROM listings WHERE id = $1 AND seller_id = $2', [listingId, subjectId]);
      if (!l) throw new DomainError('Cette offre n’appartient pas à ce compte.', 409);
    }
    const [{ n }] = await q<{ n: number }>("SELECT nextval('dispute_number_seq') AS n");
    await q("INSERT INTO disputes (id, number, kind, subject_id, listing_id, title) VALUES ($1, $2, 'conduct', $3, $4, $5)", [id, n, subjectId, listingId, title]);
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body) VALUES ($1, $2, NULL, $3)', [newId('dmg'), id, message]);
    await notify(q, [{ userId: subjectId, title: `${disputeLabel(n)} · ${title}`, body: message, href: hrefFor(Boolean(subject.seller), id) }]);
    await audit(q, admin, 'dispute.open', subjectId, { dispute: id, number: n, title });
  });
  return { ...(await detailOf(id)), me: 'admin' as const };
});

route('POST', '/admin/disputes/:id/messages', async (ctx) => {
  await requireAdmin(ctx);
  const body = cleanMultiline(ctx.body.body, 4000);
  const files = cleanAttachments(ctx.body.attachments);
  if (!body && files.length === 0) throw new DomainError('Message vide.');
  await tx(async (q) => {
    const [d] = await q(
      `SELECT d.id, d.number, d.kind, d.status, d.subject_id, o.seller_id, o.buyer_id, (SELECT EXISTS (SELECT 1 FROM merchants mm WHERE mm.user_id = d.subject_id)) AS subject_is_seller
       FROM disputes d LEFT JOIN orders o ON o.id = d.order_id WHERE d.id = $1 FOR UPDATE OF d`,
      [ctx.params.id]
    );
    if (!d) throw new DomainError('Litige introuvable.', 404);
    if (d.status !== 'open') throw new DomainError('Ce litige est clos.', 409);
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body, attachments) VALUES ($1, $2, NULL, $3, $4::jsonb)', [newId('dmg'), d.id, body, JSON.stringify(files)]);
    await q('UPDATE disputes SET updated_at = NOW() WHERE id = $1', [d.id]);
    const title = `${disputeLabel(d.number)} · message de Salacope`;
    const text = body || 'Pièce jointe';
    await notify(
      q,
      d.kind === 'conduct'
        ? [{ userId: d.subject_id, title, body: text, href: hrefFor(Boolean(d.subject_is_seller), d.id) }]
        : [
            { userId: d.seller_id, title, body: text, href: ROUTES.seller.dispute(d.id) },
            { userId: d.buyer_id, title, body: text, href: ROUTES.account.dispute(d.id) },
          ]
    );
  });
  return { ...(await detailOf(ctx.params.id)), me: 'admin' as const };
});

/** A formal warning to the account concerned: recorded on the account, said in the room, and notified. */
route('POST', '/admin/disputes/:id/warn', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const reason = clean(ctx.body.reason, 400);
  if (reason.length < 5) throw new DomainError('Indiquez le motif de l’avertissement (5 caractères minimum).');
  await tx(async (q) => {
    const [d] = await q(
      `SELECT d.id, d.number, d.status, d.subject_id, (SELECT EXISTS (SELECT 1 FROM merchants mm WHERE mm.user_id = d.subject_id)) AS subject_is_seller
       FROM disputes d WHERE d.id = $1 AND d.kind = 'conduct' FOR UPDATE OF d`,
      [ctx.params.id]
    );
    if (!d) throw new DomainError('Cet avertissement ne s’applique qu’à un litige de conduite.', 404);
    if (d.status !== 'open') throw new DomainError('Ce litige est clos.', 409);
    await q('INSERT INTO account_warnings (id, user_id, dispute_id, reason, given_by) VALUES ($1, $2, $3, $4, $5)', [newId('wrn'), d.subject_id, d.id, reason, admin.email]);
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body) VALUES ($1, $2, NULL, $3)', [newId('dmg'), d.id, `Avertissement : ${reason}`]);
    await q('UPDATE disputes SET updated_at = NOW() WHERE id = $1', [d.id]);
    await notify(q, [{ userId: d.subject_id, title: `Avertissement · ${disputeLabel(d.number)}`, body: reason, href: hrefFor(Boolean(d.subject_is_seller), d.id) }]);
    await audit(q, admin, 'user.warn', d.subject_id, { dispute: d.id, reason });
  });
  return { ...(await detailOf(ctx.params.id)), me: 'admin' as const };
});

/** Closes a conduct dispute: with a warning if one was given in it, otherwise without consequence. */
route('POST', '/admin/disputes/:id/close', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const note = clean(ctx.body.note, 400);
  await tx(async (q) => {
    const [d] = await q(
      `SELECT d.id, d.number, d.status, d.subject_id, (SELECT COUNT(*)::int FROM account_warnings w WHERE w.dispute_id = d.id) AS warned,
         (SELECT EXISTS (SELECT 1 FROM merchants mm WHERE mm.user_id = d.subject_id)) AS subject_is_seller
       FROM disputes d WHERE d.id = $1 AND d.kind = 'conduct' FOR UPDATE OF d`,
      [ctx.params.id]
    );
    if (!d) throw new DomainError('Seul un litige de conduite se clôt ici : un litige de commande se tranche dans les fonds bloqués.', 404);
    if (d.status !== 'open') throw new DomainError('Ce litige est déjà clos.', 409);
    const outcome = d.warned > 0 ? 'warning' : 'cleared';
    await q("UPDATE disputes SET status = 'resolved', outcome = $2, closed_at = NOW(), updated_at = NOW() WHERE id = $1", [d.id, outcome]);
    const text = outcome === 'warning' ? 'Litige clos : un avertissement a été donné.' : 'Litige clos sans suite.';
    await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body) VALUES ($1, $2, NULL, $3)', [newId('dmg'), d.id, note ? `${text} ${note}` : text]);
    await notify(q, [{ userId: d.subject_id, title: `${disputeLabel(d.number)} clos`, body: text, href: hrefFor(Boolean(d.subject_is_seller), d.id) }]);
    await audit(q, admin, 'dispute.close', d.subject_id, { dispute: d.id, outcome, note });
  });
  return { ...(await detailOf(ctx.params.id)), me: 'admin' as const };
});
