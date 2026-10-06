import { PAYMENT_REQUEST_MINUTES, cleanSellerTags } from '../../src/shared/domain/orders.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { Query, json, query, tx } from '../db.js';
import { route } from '../http.js';
import { newId } from '../ids.js';
import { loadOrder, loadSelf } from '../load.js';
import { notify } from '../notify.js';
import { OrderRow, authorize, formatXaf, purgeEphemeral, toBuyer } from '../orders.js';

/** The order chat beyond plain messages: receipts, ephemeral mode, blocks, payment-request cards, seller's tags. */

const orderPatch = async (userId: string, orderId: string) => ({ patch: { orders: [await loadOrder(userId, orderId)] } });

/** The buyer blocked this seller: the seller can no longer write in their orders. */
export async function requireNotBlocked(q: Query, row: Pick<OrderRow, 'buyer_id' | 'seller_id'>) {
  const [b] = await q('SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [row.buyer_id, row.seller_id]);
  if (b) throw new DomainError('Ce client a bloqué les messages de votre boutique.', 403);
}

/** Party of the order, without locking it (reads, settings). */
async function partyOf(orderId: string, userId: string) {
  const [row] = await query<OrderRow>('SELECT * FROM orders WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)', [orderId, userId]);
  if (!row) throw new DomainError('Commande introuvable.', 404);
  return { row, side: row.buyer_id === userId ? ('buyer' as const) : ('seller' as const) };
}

/** The conversation is open on screen: everything in it is read (✓✓ coloured for the other party). */
route('POST', '/orders/:id/read', async (ctx) => {
  const userId = await ctx.userId();
  const { side } = await partyOf(ctx.params.id, userId);
  await query(`UPDATE orders SET ${side}_read_at = NOW(), ${side}_seen_at = NOW(), chat_at = NOW() WHERE id = $1`, [ctx.params.id]);
  return orderPatch(userId, ctx.params.id);
});

/** Ephemeral messages: only the buyer turns them on or off. A closed order is purged at once. */
route('POST', '/orders/:id/ephemeral', async (ctx) => {
  const userId = await ctx.userId();
  const { side } = await partyOf(ctx.params.id, userId);
  if (side !== 'buyer') throw new DomainError('Seul le client peut activer les messages éphémères.', 403);
  await tx(async (q) => {
    await q('UPDATE orders SET ephemeral = $2, chat_at = NOW() WHERE id = $1', [ctx.params.id, ctx.body.on === true]);
    await purgeEphemeral(q, ctx.params.id);
  });
  return orderPatch(userId, ctx.params.id);
});

/** A buyer blocks (or unblocks) a seller they bought from. */
route('POST', '/blocks', async (ctx) => {
  const userId = await ctx.accountId();
  const sellerId = String(ctx.body.sellerId ?? '');
  const [bought] = await query('SELECT 1 FROM orders WHERE buyer_id = $1 AND seller_id = $2 LIMIT 1', [userId, sellerId]);
  if (!bought) throw new DomainError('Vous ne pouvez bloquer qu’un vendeur chez qui vous avez acheté.', 404);
  await tx(async (q) => {
    if (ctx.body.blocked === true) {
      await q('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, sellerId]);
    } else {
      await q('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [userId, sellerId]);
    }
    await q('UPDATE orders SET chat_at = NOW() WHERE buyer_id = $1 AND seller_id = $2', [userId, sellerId]);
  });
  const ids = await query<{ id: string }>('SELECT id FROM orders WHERE buyer_id = $1 AND seller_id = $2', [userId, sellerId]);
  const orders = await Promise.all(ids.map((o) => loadOrder(userId, o.id)));
  return { patch: { users: [await loadSelf(userId)], orders } };
});

/** The seller sends one of their offers to pay, as a card in the chat. */
route('POST', '/orders/:id/payment-requests', async (ctx) => {
  const userId = await ctx.userId();
  await tx(async (q) => {
    const { row, perspective } = await authorize(q, ctx.params.id, userId, 'message');
    if (perspective !== 'seller') throw new DomainError('Seul le vendeur envoie une demande de paiement.', 403);
    await requireNotBlocked(q, row);
    const [l] = await q("SELECT * FROM listings WHERE id = $1 AND seller_id = $2 AND status = 'published'", [String(ctx.body.listingId ?? ''), userId]);
    if (!l) throw new DomainError('Choisissez une de vos offres en ligne.', 404);
    const request = { listingId: l.id, title: l.title, priceXaf: l.price_xaf, coverImage: l.cover_image, category: l.category };
    const at = new Date().toISOString();
    await q("INSERT INTO order_messages (id, order_id, author_id, body, kind, data, at) VALUES ($1, $2, $3, '', 'payment_request', $4::jsonb, $5)", [
      newId('msg'),
      row.id,
      userId,
      json(request),
      at,
    ]);
    await q('UPDATE orders SET updated_at = $2 WHERE id = $1', [row.id, at]);
    await notify(q, [
      toBuyer(row, `Demande de paiement · ${row.number}`, `${l.title} · ${formatXaf(l.price_xaf)} (valable ${PAYMENT_REQUEST_MINUTES} min après ouverture)`),
    ]);
  });
  return orderPatch(userId, ctx.params.id);
});

/** The buyer opens a payment request: its countdown starts now (first opening only). */
route('POST', '/orders/:id/messages/:messageId/open', async (ctx) => {
  const userId = await ctx.userId();
  const { side } = await partyOf(ctx.params.id, userId);
  if (side !== 'buyer') throw new DomainError('Demande réservée au client.', 403);
  const done = await query(
    `UPDATE order_messages SET data = data || jsonb_build_object('openedAt', NOW())
     WHERE id = $1 AND order_id = $2 AND kind = 'payment_request' AND NOT (data ? 'openedAt') RETURNING id`,
    [ctx.params.messageId, ctx.params.id]
  );
  if (done.length) await query('UPDATE orders SET chat_at = NOW() WHERE id = $1', [ctx.params.id]);
  return orderPatch(userId, ctx.params.id);
});

/** The seller's own tags and pin on a sale (never shown to the buyer). */
route('PATCH', '/orders/:id/seller-meta', async (ctx) => {
  const userId = await ctx.userId();
  const { side } = await partyOf(ctx.params.id, userId);
  if (side !== 'seller') throw new DomainError('Réservé au vendeur.', 403);
  if (ctx.body.tags !== undefined) {
    await query('UPDATE orders SET seller_tags = $2, chat_at = NOW() WHERE id = $1', [ctx.params.id, cleanSellerTags(ctx.body.tags)]);
  }
  if (ctx.body.pinned !== undefined) {
    await query(`UPDATE orders SET seller_pinned_at = ${ctx.body.pinned === true ? 'NOW()' : 'NULL'}, chat_at = NOW() WHERE id = $1`, [ctx.params.id]);
  }
  return orderPatch(userId, ctx.params.id);
});
