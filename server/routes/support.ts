import { DomainError } from '../../src/shared/domain/errors.js';
import { REVIEW_MAX_LENGTH, canBeReviewed } from '../../src/shared/domain/reviews.js';
import { ROUTES } from '../../src/shared/config/routes.js';
import { query, tx } from '../db.js';
import { route } from '../http.js';
import { newId } from '../ids.js';
import { loadAttempts, loadNotifications, loadOrders, loadReviews, loadStats, loadTickets, touchSeller } from '../load.js';
import { notify } from '../notify.js';
import { formatXaf, markReceived, refreshPendingAttempts, settleDueOrders } from '../orders.js';

const TOPICS = ['payment', 'order', 'account', 'other'];
const SUPPORT_DELAY = 'Nous vous répondons sous 24 h.';

const OUTCOME: Record<string, string> = {
  pending: 'en attente de validation',
  failed: 'paiement refusé',
  expired: 'délai de validation dépassé',
  cancelled: 'paiement annulé',
};

/** Automatic first reply: what Salacope already knows about the reference. */
route('POST', '/tickets', async (ctx) => {
  const userId = await ctx.userId();
  const topic = TOPICS.includes(ctx.body.topic) ? ctx.body.topic : 'other';
  const subject = String(ctx.body.subject ?? '').trim().slice(0, 140);
  const body = String(ctx.body.body ?? '').trim().slice(0, 4000);
  if (subject.length < 4) throw new DomainError('Donnez un objet à votre demande.');
  if (body.length < 10) throw new DomainError('Décrivez votre problème en quelques mots.');
  const ref = String(ctx.body.reference ?? '').trim().toUpperCase().slice(0, 40) || null;

  let ack = `Demande reçue. ${SUPPORT_DELAY}`;
  if (ref) {
    const [attempt] = await query('SELECT * FROM payment_attempts WHERE code = $1 AND buyer_id = $2', [ref, userId]);
    const [order] = await query(
      `SELECT number FROM orders WHERE (number = $1 OR attempt_id = $3) AND (buyer_id = $2 OR seller_id = $2)`,
      [ref, userId, attempt?.id ?? null]
    );
    if (!attempt && !order) {
      throw new DomainError('Référence introuvable sur votre compte : vérifiez le code (TX-…) ou le numéro de commande (SC-…).');
    }
    if (attempt && attempt.status !== 'succeeded') {
      ack = `Demande reçue. Tentative ${attempt.code} (${formatXaf(attempt.amount)}) : ${OUTCOME[attempt.status]}, aucune commande créée. Si vous avez été débité, LightPay vous rembourse ; nous vérifions de notre côté. ${SUPPORT_DELAY}`;
    } else if (attempt) {
      ack = `Demande reçue. Le paiement ${attempt.code} a bien abouti${order ? ` (commande ${order.number})` : ''}. ${SUPPORT_DELAY}`;
    } else {
      ack = `Demande reçue pour la commande ${order.number}. ${SUPPORT_DELAY}`;
    }
  }

  const id = newId('tkt');
  await tx(async (q) => {
    const [{ n }] = await q<{ n: number }>("SELECT nextval('ticket_number_seq') AS n");
    const at = new Date().toISOString();
    await q("INSERT INTO tickets (id, number, user_id, topic, subject, reference, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $7)", [
      id,
      `SUP-${n}`,
      userId,
      topic,
      subject,
      ref,
      at,
    ]);
    await q('INSERT INTO ticket_messages (id, ticket_id, author_id, body, at) VALUES ($1, $2, $3, $4, $5)', [newId('tkm'), id, userId, body, at]);
    await q('INSERT INTO ticket_messages (id, ticket_id, author_id, body, at) VALUES ($1, $2, NULL, $3, $4)', [newId('tkm'), id, ack, at]);
  });
  const tickets = await loadTickets(userId, 'id = $2', [id]);
  return { ticket: tickets[0], patch: { tickets } };
});

/** Adds a message; writing on a resolved ticket reopens it. */
route('POST', '/tickets/:id/messages', async (ctx) => {
  const userId = await ctx.userId();
  const body = String(ctx.body.body ?? '').trim().slice(0, 4000);
  if (!body) throw new DomainError('Écrivez votre message.');
  await tx(async (q) => {
    const [t] = await q('SELECT id FROM tickets WHERE id = $1 AND user_id = $2 FOR UPDATE', [ctx.params.id, userId]);
    if (!t) throw new DomainError('Ticket introuvable.', 404);
    await q('INSERT INTO ticket_messages (id, ticket_id, author_id, body) VALUES ($1, $2, $3, $4)', [newId('tkm'), t.id, userId, body]);
    await q("UPDATE tickets SET status = 'open', updated_at = NOW() WHERE id = $1", [t.id]);
  });
  return { patch: { tickets: await loadTickets(userId, 'id = $2', [ctx.params.id]) } };
});

route('POST', '/tickets/:id/resolve', async (ctx) => {
  const userId = await ctx.userId();
  const rows = await query("UPDATE tickets SET status = 'resolved', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id", [ctx.params.id, userId]);
  if (!rows.length) throw new DomainError('Ticket introuvable.', 404);
  return { patch: { tickets: await loadTickets(userId, 'id = $2', [ctx.params.id]) } };
});

/** The buyer rates a finished order, once. */
route('POST', '/orders/:id/review', async (ctx) => {
  const userId = await ctx.userId();
  const rating = Number(ctx.body.rating);
  const comment = String(ctx.body.comment ?? '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError('Choisissez une note de 1 à 5 étoiles.');
  if (comment.length > REVIEW_MAX_LENGTH) throw new DomainError(`Votre avis dépasse ${REVIEW_MAX_LENGTH} caractères.`);
  const id = newId('rev');
  await tx(async (q) => {
    const [order] = await q('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [ctx.params.id]);
    if (!order) throw new DomainError('Commande introuvable.', 404);
    if (order.buyer_id !== userId) throw new DomainError("Seul l'acheteur peut noter cette commande.", 403);
    if (!canBeReviewed({ status: order.status, item: order.item })) throw new DomainError('Vous pourrez noter cette commande une fois terminée.');
    const [done] = await q('SELECT 1 FROM reviews WHERE order_id = $1', [order.id]);
    if (done) throw new DomainError('Vous avez déjà noté cette commande.', 409);
    await q('INSERT INTO reviews (id, order_id, listing_id, seller_id, buyer_id, rating, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
      id,
      order.id,
      order.listing_id,
      order.seller_id,
      userId,
      rating,
      comment || null,
    ]);
    await notify(q, [
      {
        userId: order.seller_id,
        title: `Nouvel avis ${rating} étoile${rating > 1 ? 's' : ''}`,
        body: comment || order.item.title,
        href: ROUTES.seller.sale(order.id),
      },
    ]);
  });
  return { patch: { reviews: await loadReviews('r.id = $1', [id]), stats: await loadStats() } };
});

/**
 * What changed since the last sync: own orders (status, messages), payments, tickets and
 * notifications. Also the moment pending payments and due releases are settled.
 */
route('GET', '/sync', async (ctx) => {
  const userId = await ctx.userId();
  const since = new Date(ctx.search.get('since') ?? 0);
  if (Number.isNaN(since.getTime())) throw new DomainError('Paramètre since invalide.');
  // Small overlap so a write committed during the previous sync is not missed.
  const from = new Date(since.getTime() - 5_000).toISOString();
  const serverTime = new Date().toISOString();
  await Promise.all([
    touchSeller(userId),
    refreshPendingAttempts(userId).catch(() => undefined),
    settleDueOrders(3).catch(() => undefined),
    markReceived(userId).catch(() => undefined),
  ]);
  const [orders, paymentAttempts, tickets, notifications] = await Promise.all([
    loadOrders(userId, '(updated_at >= $2 OR chat_at >= $2)', [from]),
    loadAttempts(userId, 'updated_at >= $2', [from]),
    loadTickets(userId, 'updated_at >= $2', [from]),
    loadNotifications(userId, 'created_at >= $2', [from]),
  ]);
  return { serverTime, patch: { orders, paymentAttempts, tickets, notifications } };
});
