import { DomainError } from '../../src/shared/domain/errors.js';
import { ListingInput, listingFields, validateListing } from '../../src/shared/domain/listings.js';
import { ROUTES } from '../../src/shared/config/routes.js';
import type { Listing } from '../../src/shared/db/schema.js';
import { Query, json, query, tx } from '../db.js';
import { route } from '../http.js';
import { newId } from '../ids.js';
import {
  loadAttempts,
  loadListing,
  loadNotifications,
  loadOrders,
  loadReviews,
  loadStats,
  loadTickets,
  loadUsers,
} from '../load.js';
import { notify } from '../notify.js';
import { listingView } from '../views.js';
import { SELLABLE_SELLERS, requireSellable } from '../compliance.js';

/** Everything the app needs at start: the public catalogue, plus the signed-in person's own data. */
route('GET', '/bootstrap', async (ctx) => {
  const identity = await ctx.identity();
  const [me] = identity ? await query<{ id: string }>('SELECT id FROM users WHERE firebase_uid = $1', [identity.uid]) : [];
  // An account, else a guest who bought without one on this browser.
  const userId = identity ? (me?.id ?? null) : await ctx.viewerId();
  const [users, listings, stats, reviews] = await Promise.all([
    loadUsers(userId),
    query(
      `SELECT * FROM listings WHERE (status = 'published' AND seller_id IN (${SELLABLE_SELLERS})) OR seller_id = $1
         OR id IN (SELECT listing_id FROM orders WHERE buyer_id = $1)
       ORDER BY COALESCE(published_at, created_at) DESC`,
      [userId]
    ),
    loadStats(),
    loadReviews(),
  ]);
  const own = userId
    ? await Promise.all([
        query('SELECT user_id, listing_id, created_at FROM favorites WHERE user_id = $1', [userId]),
        query('SELECT user_id, seller_id, created_at, last_seen_at FROM follows WHERE user_id = $1', [userId]),
        loadOrders(userId),
        loadAttempts(userId),
        loadTickets(userId),
        loadNotifications(userId),
      ])
    : null;
  return {
    userId,
    /** Signed in with Firebase but no Salacope account yet (finish sign-up). */
    needsAccount: Boolean(identity && !userId),
    serverTime: new Date().toISOString(),
    data: {
      users,
      listings: listings.map(listingView),
      stats,
      reviews,
      favorites: own?.[0].map((f) => ({ userId: f.user_id, listingId: f.listing_id, createdAt: f.created_at })) ?? [],
      follows: own?.[1].map((f) => ({ userId: f.user_id, sellerId: f.seller_id, createdAt: f.created_at, lastSeenAt: f.last_seen_at })) ?? [],
      orders: own?.[2] ?? [],
      paymentAttempts: own?.[3] ?? [],
      tickets: own?.[4] ?? [],
      notifications: own?.[5] ?? [],
    },
  };
});

const requireMerchant = async (userId: string) => {
  const [m] = await query('SELECT 1 FROM merchants WHERE user_id = $1', [userId]);
  if (!m) throw new DomainError('Activez votre boutique pour publier une offre.', 403);
};

/** Online only once the identity is verified (AML/CFT) and the LightPay wallet is connected. */
const requirePayouts = async (q: Query, sellerId: string) => {
  await requireSellable(q, sellerId);
  // Sales land in the seller's LightPay wallet: no wallet, no publishing.
  const [m] = await q('SELECT lightpay_connection_id FROM merchants WHERE user_id = $1', [sellerId]);
  if (!m?.lightpay_connection_id) {
    throw new DomainError('Connectez votre wallet LightPay pour publier : c’est là que vous recevez vos ventes.', 409);
  }
};

const ownedListing = async (q: Query, listingId: string, sellerId: string): Promise<Listing> => {
  const [row] = await q('SELECT * FROM listings WHERE id = $1 AND seller_id = $2 FOR UPDATE', [listingId, sellerId]);
  if (!row) throw new DomainError('Offre introuvable.', 404);
  return listingView(row);
};

/** Everyone following the store hears about a new offer going online. */
const tellFollowers = async (q: Query, listing: Listing) => {
  const [seller] = await q('SELECT store_name FROM merchants WHERE user_id = $1', [listing.sellerId]);
  const followers = await q<{ user_id: string }>('SELECT user_id FROM follows WHERE seller_id = $1', [listing.sellerId]);
  await notify(
    q,
    followers.map((f) => ({
      userId: f.user_id,
      title: `Nouvelle offre de ${seller?.store_name ?? 'une boutique'}`,
      body: listing.title,
      href: `${ROUTES.account.following}?boutique=${listing.sellerId}`,
    }))
  );
};

const checkedInput = (body: any): ListingInput => {
  const input = { ...body, priceXaf: Number(body.priceXaf), deliveryDays: body.deliveryDays ? Number(body.deliveryDays) : undefined } as ListingInput;
  validateListing(input);
  const fields = listingFields(input);
  if (!fields.coverImage) throw new DomainError('Ajoutez une image de couverture.');
  if (fields.coverImage.length > 400_000) throw new DomainError('Image de couverture trop lourde.');
  return input;
};

route('POST', '/listings', async (ctx) => {
  const sellerId = await ctx.userId();
  await requireMerchant(sellerId);
  const fields = listingFields(checkedInput(ctx.body.listing ?? {}));
  const publish = ctx.body.publish === true;
  const id = newId('lst');
  const listing = await tx(async (q) => {
    if (publish) await requirePayouts(q, sellerId);
    await q(
      `INSERT INTO listings (id, seller_id, kind, category, title, summary, description, features, price_xaf, cover_image,
         delivery_days, revisions, brief_questions, file, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16)`,
      [
        id,
        sellerId,
        fields.kind,
        fields.category,
        fields.title,
        fields.summary,
        fields.description,
        json(fields.features),
        fields.priceXaf,
        fields.coverImage,
        fields.deliveryDays ?? null,
        fields.revisions ?? null,
        json(fields.briefQuestions),
        json(fields.file),
        publish ? 'published' : 'draft',
        publish ? new Date().toISOString() : null,
      ]
    );
    const created = (await loadListing(id, q))!;
    if (publish) await tellFollowers(q, created);
    return created;
  });
  return { listing, patch: { listings: [listing] } };
});

route('PATCH', '/listings/:id', async (ctx) => {
  const sellerId = await ctx.userId();
  const fields = listingFields(checkedInput(ctx.body.listing ?? {}));
  const listing = await tx(async (q) => {
    await ownedListing(q, ctx.params.id, sellerId);
    await q(
      `UPDATE listings SET kind = $2, category = $3, title = $4, summary = $5, description = $6, features = $7::jsonb,
         price_xaf = $8, cover_image = $9, delivery_days = $10, revisions = $11, brief_questions = $12::jsonb, file = $13::jsonb,
         updated_at = NOW()
       WHERE id = $1`,
      [
        ctx.params.id,
        fields.kind,
        fields.category,
        fields.title,
        fields.summary,
        fields.description,
        json(fields.features),
        fields.priceXaf,
        fields.coverImage,
        fields.deliveryDays ?? null,
        fields.revisions ?? null,
        json(fields.briefQuestions),
        json(fields.file),
      ]
    );
    return (await loadListing(ctx.params.id, q))!;
  });
  return { patch: { listings: [listing] } };
});

route('POST', '/listings/:id/status', async (ctx) => {
  const sellerId = await ctx.userId();
  const status = ctx.body.status === 'published' ? 'published' : 'draft';
  const listing = await tx(async (q) => {
    const current = await ownedListing(q, ctx.params.id, sellerId);
    const goesOnline = status === 'published' && current.status !== 'published';
    if (goesOnline) await requirePayouts(q, sellerId);
    await q(
      `UPDATE listings SET status = $2, updated_at = NOW(), published_at = CASE WHEN $3 THEN NOW() ELSE published_at END WHERE id = $1`,
      [ctx.params.id, status, goesOnline]
    );
    const updated = (await loadListing(ctx.params.id, q))!;
    if (goesOnline) await tellFollowers(q, updated);
    return updated;
  });
  return { patch: { listings: [listing] } };
});

/** Only never-sold listings can be deleted; sold ones are unpublished instead. */
route('DELETE', '/listings/:id', async (ctx) => {
  const sellerId = await ctx.userId();
  await tx(async (q) => {
    await ownedListing(q, ctx.params.id, sellerId);
    const [sold] = await q('SELECT 1 FROM orders WHERE listing_id = $1 UNION SELECT 1 FROM payment_attempts WHERE listing_id = $1 LIMIT 1', [
      ctx.params.id,
    ]);
    if (sold) throw new DomainError('Cette offre a déjà été vendue : dépubliez-la plutôt que de la supprimer.', 409);
    await q('DELETE FROM listings WHERE id = $1', [ctx.params.id]);
  });
  return { removed: { listings: [ctx.params.id], favorites: [ctx.params.id] } };
});
