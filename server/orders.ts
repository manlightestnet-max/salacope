import { PLATFORM } from '../src/shared/config/platform.js';
import { ROUTES } from '../src/shared/config/routes.js';
import type { Order, OrderEventType, OrderRefund, OrderStatus } from '../src/shared/db/schema.js';
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

/** Where a notification about an order leads: a service opens its discussion (everything is done there), a product its page. */
export const orderHref = (orderId: string, p: Perspective, kind?: 'digital' | 'service') =>
  kind === 'service' ? ROUTES.account.chat(orderId) : p === 'buyer' ? ROUTES.account.order(orderId) : ROUTES.seller.sale(orderId);

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
  refund: OrderRefund | null;
  lightpay_hold_id: string | null;
  ephemeral: boolean;
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

/** A message about an order, to its buyer or its seller (the order's number and title are always among its values). */
export const toBuyer = (o: OrderRow, event: string, vars: NotifyInput['vars'] = {}): NotifyInput => ({
  userId: o.buyer_id,
  event,
  vars: { commande: o.number, offre: o.item.title, ...vars },
  href: orderHref(o.id, 'buyer', o.item.kind),
});
export const toSeller = (o: OrderRow, event: string, vars: NotifyInput['vars'] = {}): NotifyInput => ({
  userId: o.seller_id,
  event,
  vars: { commande: o.number, offre: o.item.title, ...vars },
  href: orderHref(o.id, 'seller', o.item.kind),
});

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
  set?: Partial<Record<'due_at' | 'release_at' | 'delivery' | 'revisions_used' | 'extension' | 'refund', unknown>>;
  notices?: NotifyInput[];
  at?: string;
}

const JSON_COLUMNS = new Set(['delivery', 'extension', 'refund']);

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
  if (CLOSED.includes(t.status)) await purgeEphemeral(q, row.id);
}

// ---------------------------------------------------------------- chat

/** Sale validated or dispute settled: the order is closed. */
const CLOSED: OrderStatus[] = ['completed', 'cancelled'];

/** Ephemeral chat of a closed order: its messages are erased (events, receipt and money records stay). */
export async function purgeEphemeral(q: Query, orderId: string): Promise<void> {
  const gone = await q(
    `DELETE FROM order_messages m USING orders o
     WHERE m.order_id = o.id AND o.id = $1 AND o.ephemeral AND o.status IN ('completed', 'cancelled') RETURNING m.id`,
    [orderId]
  );
  if (gone.length) await q('UPDATE orders SET chat_at = NOW() WHERE id = $1', [orderId]);
}

/** Ephemeral orders already closed: what was written afterwards is erased after a day (checked once a minute at most). */
let lastSweep = 0;
export async function purgeLateEphemeral(): Promise<void> {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  await query(
    `WITH gone AS (
       DELETE FROM order_messages m USING orders o
       WHERE m.order_id = o.id AND o.ephemeral AND o.status IN ('completed', 'cancelled') AND m.at < NOW() - INTERVAL '1 day'
       RETURNING m.order_id)
     UPDATE orders SET chat_at = NOW() WHERE id IN (SELECT order_id FROM gone)`
  );
}

/** The person's app has the messages written to them: "received" (✓✓) for the other party. */
export async function markReceived(userId: string): Promise<void> {
  for (const side of ['buyer', 'seller'] as const) {
    await query(
      `UPDATE orders o SET ${side}_seen_at = NOW(), chat_at = NOW()
       WHERE o.${side}_id = $1 AND EXISTS (
         SELECT 1 FROM order_messages m WHERE m.order_id = o.id AND m.author_id <> $1 AND m.at > COALESCE(o.${side}_seen_at, 'epoch'))`,
      [userId]
    );
  }
}

/** An order of an offer that cost nothing: no payment, no hold at LightPay, nothing to release or refund. */
export const isFree = (row: Pick<OrderRow, 'amounts'>) => row.amounts.total === 0;

const requireHold = (row: OrderRow) => {
  if (!row.lightpay_hold_id) throw new DomainError('Paiement introuvable sur LightPay : contactez le support.', 409);
  return row.lightpay_hold_id;
};

/** The buyer validates (or the window passed): LightPay pays the seller. */
export const captureFunds = (row: OrderRow, resolveDispute = false): Promise<unknown> =>
  isFree(row) ? Promise.resolve(null) : lightpay.capture(requireHold(row), `salacope:capture:${row.id}`, resolveDispute);
/** Cancelled: LightPay refunds the buyer (to their wallet, or to the number that paid). */
export async function refundFunds(row: OrderRow, resolveDispute = false): Promise<OrderRefund> {
  // A free order moved no money: nothing to give back.
  if (isFree(row)) return { paid: 0, sent: 0, operatorFee: 0, lightpayFee: 0, via: 'wallet', at: new Date().toISOString() };
  const result: any = await lightpay.release(requireHold(row), `salacope:release:${row.id}`, resolveDispute);
  const paid = row.amounts.total;
  const at = new Date().toISOString();
  // No refund block: the buyer paid from a LightPay wallet and got everything back there. Otherwise LightPay sent it to the
  // number that paid, minus the payout fees (operator + LightPay).
  if (!result?.refund) return { paid, sent: paid, operatorFee: 0, lightpayFee: 0, via: 'wallet', at };
  const sent = Number(result.refund.amount ?? 0);
  const lightpayFee = Number(result.refund.lightpay_fee ?? 0);
  const releaseAt = result.refund.release_at ? new Date(result.refund.release_at).toISOString() : undefined;
  return { paid, sent, operatorFee: Math.max(0, paid - sent - lightpayFee), lightpayFee, via: 'mobile_money', at, ...(releaseAt ? { releaseAt } : {}) };
}
export const freezeFunds = (row: OrderRow, reason: string): Promise<unknown> => (isFree(row) ? Promise.resolve(null) : lightpay.dispute(requireHold(row), reason));

export interface NewOrder {
  listingId: string;
  sellerId: string;
  buyerId: string;
  /** What was agreed at checkout: the offer as it was, the buyer, the invoice, the brief and the amounts. */
  details: { item: Order['item']; buyer: Order['buyer']; invoice: Order['invoice'] | null; brief?: Order['brief']; amounts: Order['amounts'] };
  payment: Order['payment'];
  /** The money held at LightPay (null for a free offer). */
  holdId: string | null;
  attemptId: string | null;
}

/**
 * Creates the order of a payment that went through, or of a free offer taken without paying (same rows, same events, same
 * notifications). A free digital product is complete at once: there is no money to hold and release.
 */
export async function insertOrder(q: Query, o: NewOrder): Promise<{ id: string; number: string }> {
  const d = o.details;
  const [{ n }] = await q<{ n: number }>("SELECT nextval('order_number_seq') AS n");
  const now = new Date().toISOString();
  const digital = d.item.kind === 'digital';
  const free = d.amounts.total === 0;
  const id = newId('ord');
  const number = `SC-${n}`;
  await q(
    `INSERT INTO orders (id, number, listing_id, item, seller_id, buyer_id, buyer, invoice, payment, brief, amounts, status,
       release_at, attempt_id, lightpay_hold_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $16)`,
    [
      id,
      number,
      o.listingId,
      json(d.item),
      o.sellerId,
      o.buyerId,
      json(d.buyer),
      json(d.invoice),
      json(o.payment),
      json(d.brief ?? []),
      json(d.amounts),
      digital ? (free ? 'completed' : 'delivered') : 'paid',
      digital && !free ? addDays(now, PLATFORM.digitalHoldDays) : null,
      o.attemptId,
      o.holdId,
      now,
    ]
  );
  const event = (type: string, actor: string | null, note: string | null = null) =>
    q('INSERT INTO order_events (id, order_id, type, actor_id, note, at) VALUES ($1, $2, $3, $4, $5, $6)', [newId('evt'), id, type, actor, note, now]);
  await event('paid', o.buyerId, free ? 'Offre gratuite : aucun paiement' : null);
  if (digital) await event('delivered', null);
  if (digital && free) await event('completed', null);
  await notify(q, [
    {
      userId: o.sellerId,
      event: free ? 'sale.free' : 'sale.new',
      vars: { commande: number, offre: d.item.title, ...(free ? {} : { montant: formatXaf(d.amounts.net) }) },
      href: orderHref(id, 'seller', d.item.kind),
    },
    // The buyer's receipt: a guest also gets it by e-mail, with the download link of a digital product.
    {
      userId: o.buyerId,
      event: free ? (digital ? 'purchase.free_ready' : 'purchase.free') : digital ? 'purchase.ready' : 'purchase.paid',
      vars: { commande: number, offre: d.item.title },
      href: orderHref(id, 'buyer', d.item.kind),
    },
  ]);
  return { id, number };
}

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
      const { id: orderId } = await insertOrder(q, {
        listingId: a.listing_id,
        sellerId: a.seller_id,
        buyerId: a.buyer_id,
        details: a.details,
        payment: { reference: session.id, code: a.code, via: session.payer?.type === 'lightpay' ? 'wallet' : 'mobile_money' },
        holdId: session.hold_id,
        attemptId: a.id,
      });
      await q("UPDATE payment_attempts SET status = 'succeeded', order_id = $2, updated_at = NOW(), checked_at = NOW() WHERE id = $1", [a.id, orderId]);
      return;
    }

    if (session.status === 'EXPIRED' || session.status === 'CANCELLED') {
      const status = session.status === 'EXPIRED' ? 'expired' : 'cancelled';
      await q('UPDATE payment_attempts SET status = $2, updated_at = NOW(), checked_at = NOW() WHERE id = $1', [a.id, status]);
      if (status === 'expired') {
        await notify(q, [{ userId: a.buyer_id, event: 'purchase.payment_expired', vars: { code: a.code }, href: ROUTES.account.support }]);
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
  await purgeLateEphemeral().catch((err) => console.error('[purgeLateEphemeral]', err?.message));
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
          notices: [toSeller(row, 'sale.released_auto', { montant: formatXaf(row.amounts.net) })],
        });
      });
      settled += 1;
    } catch (err: any) {
      console.error('[settleDueOrders]', id, err?.message);
    }
  }
  return settled;
}
