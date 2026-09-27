import { DomainError } from '../../src/shared/domain/errors.js';
import { query } from '../db.js';
import { route } from '../http.js';

/** Favourites, followed stores and notifications of the signed-in person. */

route('POST', '/favorites/:listingId', async (ctx) => {
  const userId = await ctx.userId();
  const [listing] = await query("SELECT 1 FROM listings WHERE id = $1 AND (status = 'published' OR seller_id = $2)", [ctx.params.listingId, userId]);
  if (!listing) throw new DomainError('Offre introuvable.', 404);
  const [row] = await query(
    `INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)
     ON CONFLICT (user_id, listing_id) DO UPDATE SET created_at = favorites.created_at RETURNING created_at`,
    [userId, ctx.params.listingId]
  );
  return { patch: { favorites: [{ userId, listingId: ctx.params.listingId, createdAt: row.created_at }] } };
});

route('DELETE', '/favorites/:listingId', async (ctx) => {
  const userId = await ctx.userId();
  await query('DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2', [userId, ctx.params.listingId]);
  return { removed: { favorites: [ctx.params.listingId] } };
});

const followView = (r: any) => ({ userId: r.user_id, sellerId: r.seller_id, createdAt: r.created_at, lastSeenAt: r.last_seen_at });

route('POST', '/follows/:sellerId', async (ctx) => {
  const userId = await ctx.userId();
  if (userId === ctx.params.sellerId) throw new DomainError('Vous ne pouvez pas suivre votre propre boutique.');
  const [store] = await query('SELECT 1 FROM merchants WHERE user_id = $1', [ctx.params.sellerId]);
  if (!store) throw new DomainError('Boutique introuvable.', 404);
  const [row] = await query(
    `INSERT INTO follows (user_id, seller_id) VALUES ($1, $2)
     ON CONFLICT (user_id, seller_id) DO UPDATE SET created_at = follows.created_at RETURNING *`,
    [userId, ctx.params.sellerId]
  );
  return { patch: { follows: [followView(row)] } };
});

route('DELETE', '/follows/:sellerId', async (ctx) => {
  const userId = await ctx.userId();
  await query('DELETE FROM follows WHERE user_id = $1 AND seller_id = $2', [userId, ctx.params.sellerId]);
  return { removed: { follows: [ctx.params.sellerId] } };
});

/** The follower has looked at this store's latest offers: they stop counting as new. */
route('POST', '/follows/:sellerId/seen', async (ctx) => {
  const userId = await ctx.userId();
  const rows = await query('UPDATE follows SET last_seen_at = NOW() WHERE user_id = $1 AND seller_id = $2 RETURNING *', [
    userId,
    ctx.params.sellerId,
  ]);
  return { patch: { follows: rows.map(followView) } };
});

/** `ids` absent = mark everything read. */
route('POST', '/notifications/read', async (ctx) => {
  const userId = await ctx.userId();
  const ids = Array.isArray(ctx.body.ids) ? ctx.body.ids.map(String).slice(0, 200) : null;
  await query(`UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE AND ($2::text[] IS NULL OR id = ANY($2))`, [userId, ids]);
  return { ok: true };
});
