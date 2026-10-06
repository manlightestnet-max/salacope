import type { Query } from './db.js';
import { query } from './db.js';
import {
  USER_COLUMNS,
  USER_FROM,
  attemptView,
  eventView,
  listingView,
  messageView,
  notificationView,
  orderView,
  reviewView,
  ticketView,
  userView,
} from './views.js';

/** Loaders shared by the bootstrap, the sync and the write endpoints (what they return as a patch). */

export async function loadOrders(userId: string, where = 'TRUE', params: unknown[] = [], q: Query = query) {
  const rows = await q(
    `SELECT * FROM orders WHERE (buyer_id = $1 OR seller_id = $1) AND (${where}) ORDER BY created_at DESC LIMIT 500`,
    [userId, ...params]
  );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [events, messages, blocks] = await Promise.all([
    q('SELECT * FROM order_events WHERE order_id = ANY($1) ORDER BY at, id', [ids]),
    q('SELECT * FROM order_messages WHERE order_id = ANY($1) ORDER BY at, id', [ids]),
    q<{ blocker_id: string; blocked_id: string }>('SELECT blocker_id, blocked_id FROM user_blocks WHERE blocker_id = $1 OR blocked_id = $1', [userId]),
  ]);
  const blocked = new Set(blocks.map((b) => `${b.blocker_id}>${b.blocked_id}`));
  return rows.map((r) =>
    orderView(
      r,
      events.filter((e) => e.order_id === r.id).map(eventView),
      messages.filter((m) => m.order_id === r.id).map(messageView),
      userId,
      blocked.has(`${r.buyer_id}>${r.seller_id}`)
    )
  );
}

/** The signed-in person, with what only they may see (e-mail, blocks…). */
export const loadSelf = async (userId: string) => {
  const [row] = await query(`SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.id = $1`, [userId]);
  return userView(row, true);
};

export const loadOrder = async (userId: string, orderId: string, q: Query = query) =>
  (await loadOrders(userId, 'id = $2', [orderId], q))[0];

export async function loadTickets(userId: string, where = 'TRUE', params: unknown[] = [], q: Query = query) {
  const rows = await q(`SELECT * FROM tickets WHERE user_id = $1 AND (${where}) ORDER BY updated_at DESC LIMIT 200`, [userId, ...params]);
  if (!rows.length) return [];
  const messages = await q('SELECT * FROM ticket_messages WHERE ticket_id = ANY($1) ORDER BY at, id', [rows.map((r) => r.id)]);
  return rows.map((r) => ticketView(r, messages.filter((m) => m.ticket_id === r.id)));
}

export const loadAttempts = async (userId: string, where = 'TRUE', params: unknown[] = [], q: Query = query) =>
  (
    await q(`SELECT * FROM payment_attempts WHERE buyer_id = $1 AND (${where}) ORDER BY created_at DESC LIMIT 100`, [userId, ...params])
  ).map(attemptView);

export const loadNotifications = async (userId: string, where = 'TRUE', params: unknown[] = [], q: Query = query) =>
  (
    await q(`SELECT * FROM notifications WHERE user_id = $1 AND (${where}) ORDER BY created_at DESC LIMIT 60`, [userId, ...params])
  ).map(notificationView);

export const loadListing = async (id: string, q: Query = query) => {
  const [row] = await q('SELECT * FROM listings WHERE id = $1', [id]);
  return row ? listingView(row) : undefined;
};

/** People the viewer may see: every store, the viewer, and the other party of their orders. */
export async function loadUsers(userId: string | null) {
  const rows = await query(
    `SELECT ${USER_COLUMNS} FROM ${USER_FROM}
     WHERE m.user_id IS NOT NULL OR u.id = $1
        OR u.id IN (SELECT buyer_id FROM orders WHERE seller_id = $1 UNION SELECT seller_id FROM orders WHERE buyer_id = $1)`,
    [userId]
  );
  return rows.map((r) => userView(r, r.id === userId));
}

/** Public figures: sales per offer, completed sales, followers and rating per store. */
export async function loadStats() {
  const [sales, sellers, followers, ratings] = await Promise.all([
    query("SELECT listing_id, COUNT(*) AS n FROM orders WHERE status <> 'cancelled' GROUP BY listing_id"),
    query("SELECT seller_id, COUNT(*) AS n FROM orders WHERE status = 'completed' GROUP BY seller_id"),
    query('SELECT seller_id, COUNT(*) AS n FROM follows GROUP BY seller_id'),
    query('SELECT seller_id, COUNT(*) AS n, AVG(rating)::float AS avg FROM reviews GROUP BY seller_id'),
  ]);
  const seller: Record<string, { completedSales: number; followers: number; reviews: number; rating: number }> = {};
  const entry = (id: string) => (seller[id] ??= { completedSales: 0, followers: 0, reviews: 0, rating: 0 });
  sellers.forEach((r) => (entry(r.seller_id).completedSales = r.n));
  followers.forEach((r) => (entry(r.seller_id).followers = r.n));
  ratings.forEach((r) => Object.assign(entry(r.seller_id), { reviews: r.n, rating: r.avg }));
  return { listings: Object.fromEntries(sales.map((r) => [r.listing_id, r.n])), sellers: seller };
}

export const loadReviews = async (where = 'TRUE', params: unknown[] = [], q: Query = query) =>
  (
    await q(
      `SELECT r.*, u.name AS author_name, o.item->>'title' AS item_title
       FROM reviews r JOIN users u ON u.id = r.buyer_id JOIN orders o ON o.id = r.order_id
       WHERE ${where} ORDER BY r.created_at DESC LIMIT 1000`,
      params
    )
  ).map(reviewView);
