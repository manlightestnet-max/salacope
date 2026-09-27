import { PLATFORM } from '../src/shared/config/platform.js';
import { ROUTES } from '../src/shared/config/routes.js';
import type { Order, OrderEventType, OrderStatus } from '../src/shared/db/schema.js';
import { DomainError } from '../src/shared/domain/errors.js';
import { OrderPermissions, Perspective, perspectiveOf, permissionsFor } from '../src/shared/domain/orders.js';
import { Query, json, query, tx } from './db.js';
import { newId } from './ids.js';
import { LightPaySession, lightpay } from './lightpay.js';
import { NotifyInput, notify } from './notify.js';

/** Orders on the server: every state change is checked here, with the money moved by LightPay. */

const DAY = 86_400_000;
export const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();
export const formatXaf = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
export const formatDay = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' }).format(new Date(iso)) : '';

export const orderHref = (orderId: string, p: Perspective) => (p === 'buyer' ? ROUTES.account.order(orderId) : ROUTES.seller.sale(orderId));

export interface OrderRow {
  id: string;
  number: string;
  listing_id: string;
  item: Order['item'];
  seller_id: string;
  buyer_id: string;
  buyer: Order['buyer'];
  amounts: Order['amounts'];
  status: OrderStatus;
  due_at: string | null;
  release_at: string | null;
  revisions_used: number;
  extension: Order['extension'] | null;
  lightpay_hold_id: string | null;
}

/** Permission view of a row (same rules as the app). */
export const shapeOf = (r: OrderRow) => ({
  buyerId: r.buyer_id,
  sellerId: r.seller_id,
  status: r.status,
  item: r.item,
  revisionsUsed: r.revisions_used,
  extension: r.extension ?? undefined,
});

export const toBuyer = (o: OrderRow, title: string, body = o.item.title): NotifyInput => ({ userId: o.buyer_id, title, body, href: orderHref(o.id, 'buyer') });
export const toSeller = (o: OrderRow, title: string, body = o.item.title): NotifyInput => ({ userId: o.seller_id, title, body, href: orderHref(o.id, 'seller') });

/** Locks the order and checks that `userId` may do `action` now. */
export async function authorize(q: Query, orderId: string, userId: string, action: keyof OrderPermissions) {
  const [row] = await q<OrderRow>('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  const perspective = row ? perspectiveOf(shapeOf(row), userId) : null;
  if (!row || !perspective) throw new DomainError('Commande introuvable.', 404);
  if (!permissionsFor(shapeOf(row), perspective)[action]) throw new DomainError("Cette action n'est plus possible sur cette commande.", 409);
  return { row, perspective };
}

export interface Transition {
  status: OrderStatus;
  event: OrderEventType;
  actorId: string | null;
  note?: string;
  set?: Partial<Record<'due_at' | 'release_at' | 'delivery' | 'revisions_used' | 'extension', unknown>>;
  notices?: NotifyInput[];
  at?: string;
}

const JSON_COLUMNS = new Set(['delivery', 'extension']);

/** Status + event + notifications, in the caller's transaction. */
export async function transition(q: Query, row: OrderRow, t: Transition): Promise<void> {
  const at = t.at ?? new Date().toISOString();
  const sets = Object.entries(t.set ?? {});
  const assignments = sets.map(([col], i) => `${col} = $${i + 4}${JSON_COLUMNS.has(col) ? '::jsonb' : ''}`);
  await q(
    `UPDATE orders SET status = $2, updated_at = $3${assignments.length ? `, ${assignments.join(', ')}` : ''} WHERE id = $1`,
    [row.id, t.status, at, ...sets.map(([col, v]) => (JSON_COLUMNS.has(col) ? json(v) : v ?? null))]
  );
  await q('INSERT INTO order_events (id, order_id, type, actor_id, note, at) VALUES ($1, $2, $3, $4, $5, $6)', [
    newId('evt'),
    row.id,
    t.event,
    t.actorId,
    t.note?.trim() || null,
    at,
  ]);
  await notify(q, t.notices ?? []);
}

const requireHold = (row: OrderRow) => {
  if (!row.lightpay_hold_id) throw new DomainError('Paiement introuvable sur LightPay : contactez le support.', 409);
  return row.lightpay_hold_id;
};

/** The buyer validates (or the window passed): LightPay pays the seller. */
export const captureFunds = (row: OrderRow) => lightpay.capture(requireHold(row), `salacope:capture:${row.id}`);
/** Cancelled: LightPay refunds the buyer (to their wallet, or to the number that paid). */
export const refundFunds = (row: OrderRow) => lightpay.release(requireHold(row), `salacope:release:${row.id}`);
export const freezeFunds = (row: OrderRow, reason: string) => lightpay.dispute(requireHold(row), reason);

/**
 * A payment attempt settles from its LightPay session: completed -> the order is created
 * (from the snapshot taken at checkout); expired/cancelled -> the attempt closes. Idempotent.
 */
export async function settleAttempt(attemptId: string, known?: LightPaySession): Promise<void> {
  const [attempt] = await query('SELECT * FROM payment_attempts WHERE id = $1', [attemptId]);
  if (!attempt || attempt.status !== 'pending' || !attempt.lightpay_session_id) return;
  const session = known ?? (await lightpay.getSession(attempt.lightpay_session_id)).session;

  await tx(async (q) => {
    const [a] = await q('SELECT * FROM payment_attempts WHERE id = $1 FOR UPDATE', [attemptId]);
    if (!a || a.status !== 'pending') return;

    if (session.status === 'COMPLETED') {
      const d = a.details;
      const [{ n }] = await q<{ n: number }>("SELECT nextval('order_number_seq') AS n");
      const now = new Date().toISOString();
      const digital = d.item.kind === 'digital';
      const orderId = newId('ord');
      await q(
        `INSERT INTO orders (id, number, listing_id, item, seller_id, buyer_id, buyer, invoice, payment, brief, amounts, status,
           release_at, attempt_id, lightpay_hold_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $16)`,
        [
          orderId,
          `SC-${n}`,
          a.listing_id,
          json(d.item),
          a.seller_id,
          a.buyer_id,
          json(d.buyer),
          json(d.invoice),
          json({ reference: session.id, code: a.code, via: session.payer?.type === 'lightpay' ? 'wallet' : 'mobile_money' }),
          json(d.brief ?? []),
          json(d.amounts),
          digital ? 'delivered' : 'paid',
          digital ? addDays(now, PLATFORM.escrowDays) : null,
          a.id,
          session.hold_id,
          now,
        ]
      );
      await q('INSERT INTO order_events (id, order_id, type, actor_id, at) VALUES ($1, $2, $3, $4, $5)', [newId('evt'), orderId, 'paid', a.buyer_id, now]);
      if (digital) await q('INSERT INTO order_events (id, order_id, type, actor_id, at) VALUES ($1, $2, $3, NULL, $4)', [newId('evt'), orderId, 'delivered', now]);
      await q("UPDATE payment_attempts SET status = 'succeeded', order_id = $2, updated_at = NOW(), checked_at = NOW() WHERE id = $1", [a.id, orderId]);
      await notify(q, [
        {
          userId: a.seller_id,
          title: `Nouvelle commande SC-${n}`,
          body: `${d.item.title} · ${formatXaf(d.amounts.net)} (bloqués jusqu’à validation)`,
          href: orderHref(orderId, 'seller'),
        },
      ]);
      return;
    }

    if (session.status === 'EXPIRED' || session.status === 'CANCELLED') {
      const status = session.status === 'EXPIRED' ? 'expired' : 'cancelled';
      await q('UPDATE payment_attempts SET status = $2, updated_at = NOW(), checked_at = NOW() WHERE id = $1', [a.id, status]);
      if (status === 'expired') {
        await notify(q, [{ userId: a.buyer_id, title: 'Paiement non abouti', body: `${a.code} · délai dépassé, aucun débit`, href: ROUTES.account.support }]);
      }
      return;
    }

    await q('UPDATE payment_attempts SET checked_at = NOW() WHERE id = $1', [a.id]);
  });
}

/** Checks this buyer's pending payments with LightPay (at most every 10 s each). */
export async function refreshPendingAttempts(userId: string): Promise<void> {
  const pending = await query<{ id: string }>(
    `SELECT id FROM payment_attempts WHERE buyer_id = $1 AND status = 'pending' AND lightpay_session_id IS NOT NULL
       AND (checked_at IS NULL OR checked_at < NOW() - INTERVAL '10 seconds') AND created_at > NOW() - INTERVAL '2 days'
     ORDER BY created_at DESC LIMIT 3`,
    [userId]
  );
  await Promise.all(pending.map((p) => settleAttempt(p.id).catch((err) => console.error('[settleAttempt]', p.id, err?.message))));
}

/** Delivered orders whose confirmation window has passed: the seller is paid automatically. */
export async function settleDueOrders(limit = 5): Promise<number> {
  const due = await query<{ id: string }>(
    "SELECT id FROM orders WHERE status = 'delivered' AND release_at <= NOW() ORDER BY release_at LIMIT $1",
    [limit]
  );
  let settled = 0;
  for (const { id } of due) {
    try {
      await tx(async (q) => {
        const [row] = await q<OrderRow>("SELECT * FROM orders WHERE id = $1 AND status = 'delivered' AND release_at <= NOW() FOR UPDATE SKIP LOCKED", [id]);
        if (!row) return;
        await captureFunds(row);
        await transition(q, row, {
          status: 'completed',
          event: 'auto_completed',
          actorId: null,
          set: { release_at: null },
          notices: [toSeller(row, `Paiement libéré · ${row.number}`, `+${formatXaf(row.amounts.net)} sur votre wallet LightPay (validation automatique)`)],
        });
      });
      settled += 1;
    } catch (err: any) {
      console.error('[settleDueOrders]', id, err?.message);
    }
  }
  return settled;
}
