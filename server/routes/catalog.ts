import { levelNow } from '../lockdown.js';
import { currentExplore, currentIdentity, currentLaunchBanner, currentPlatform } from '../settings.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { CATEGORY_IDS, ListingInput, filesOf, listingFields, storedFile, validateListing } from '../../src/shared/domain/listings.js';
import { PLATFORM, minPriceFor } from '../../src/shared/config/platform.js';
import { ROUTES } from '../../src/shared/config/routes.js';
import type { Listing, ListingFile, ListingFileItem } from '../../src/shared/db/schema.js';
import { Query, json, query, tx } from '../db.js';
import { route } from '../http.js';
import { firstSight } from '../visits.js';
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
  touchSeller,
} from '../load.js';
import { notify } from '../notify.js';
import { offloadImage, offloadImages, pruneImages } from '../storage/images.js';
import { checkProductFiles, pruneProductFiles } from '../storage/products.js';
import { IMG_PREFIX, listingView } from '../views.js';
import { SELLABLE_SELLERS, requireSellable } from '../compliance.js';

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** Who is asking: an account, else a guest who bought without one on this browser, else nobody. */
async function viewerOf(ctx: { identity(): Promise<{ uid: string } | null>; viewerId(): Promise<string | null> }) {
  const identity = await ctx.identity();
  const [me] = identity ? await query<{ id: string }>('SELECT id FROM users WHERE firebase_uid = $1', [identity.uid]) : [];
  return { identity, userId: identity ? (me?.id ?? null) : await ctx.viewerId() };
}

/**
 * What a viewer may see of the catalogue: the published offers of sellable public stores (and of the private stores opened
 * by their own link, `$2`), their own offers and what they bought.
 */
const VISIBLE_LISTINGS = `(status = 'published' AND seller_id IN (${SELLABLE_SELLERS}) AND (seller_id NOT IN (SELECT user_id FROM merchants WHERE private_store) OR seller_id = ANY($2)))
  OR seller_id = $1 OR id IN (SELECT listing_id FROM orders WHERE buyer_id = $1)`;

/**
 * Private stores the app asks for (`?with=`: a store id, `@handle` or one of its offers, as found in a shared link). A store
 * that is not private needs no asking: it is in the catalogue already.
 */
async function requestedStores(ctx: { search: URLSearchParams }): Promise<string[]> {
  const refs = (ctx.search.get('with') ?? '').split(',').map((r) => r.trim()).filter(Boolean).slice(0, 8);
  if (!refs.length) return [];
  const handles = refs.filter((r) => r.startsWith('@')).map((r) => r.slice(1).toLowerCase());
  const ids = refs.filter((r) => !r.startsWith('@'));
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM merchants WHERE private_store
       AND (user_id = ANY($1) OR LOWER(handle) = ANY($2) OR user_id IN (SELECT seller_id FROM listings WHERE id = ANY($1)))`,
    [ids, handles]
  ).catch(() => []);
  return rows.map((r) => r.user_id).sort();
}

async function loadCatalog(userId: string | null, stores: string[]) {
  const [users, listings, stats, reviews] = await Promise.all([
    loadUsers(userId, stores),
    query(
      `SELECT id, seller_id, kind, category, title, summary, description, features, price_xaf, compare_at_xaf, promo_starts_at, promo_ends_at, cover_image, delivery_days,
         revisions, brief_questions, file, status, published_at, created_at, updated_at, jsonb_array_length(gallery) AS gallery_count,
         CASE WHEN seller_id = $1 THEN hidden_reason END AS hidden_reason, CASE WHEN seller_id = $1 THEN hidden_at END AS hidden_at
       FROM listings WHERE ${VISIBLE_LISTINGS}
       ORDER BY COALESCE(published_at, created_at) DESC`,
      [userId, stores]
    ),
    loadStats(),
    loadReviews(),
  ]);
  return { users, listings: listings.map((r) => listingView(r, userId)), stats, reviews };
}

/**
 * A cheap fingerprint of everything the catalogue shows (offers and their last change, stores, sales per offer, reviews,
 * followers): the app sends the one it knows, and only gets the data again when something really changed.
 */
async function catalogVersion(userId: string | null, stores: string[]) {
  const [row] = await query<{ v: string }>(
    `SELECT md5(
       COALESCE((SELECT string_agg(id || ':' || updated_at::text || ':' || (promo_ends_at IS NOT NULL AND promo_ends_at <= NOW())::text, ',' ORDER BY id) FROM listings WHERE ${VISIBLE_LISTINGS}), '') || '|' ||
       COALESCE((SELECT string_agg(user_id || ':' || store_name || ':' || COALESCE(headline, '') || ':' || COALESCE(city, '') || ':' || COALESCE(handle, '') || ':' ||
                 kyc_status || ':' || COALESCE(suspended_at::text, '') || ':' || COALESCE(length(logo), 0) || ':' || private_store::text, ',' ORDER BY user_id)
                 FROM merchants WHERE NOT private_store OR user_id = ANY($2)), '') || '|' ||
       COALESCE((SELECT string_agg(listing_id || ':' || n, ',' ORDER BY listing_id) FROM (SELECT listing_id, COUNT(*) AS n FROM orders WHERE status <> 'cancelled' GROUP BY listing_id) s), '') || '|' ||
       COALESCE((SELECT COUNT(*)::text || COALESCE(MAX(created_at)::text, '') FROM reviews), '') || '|' ||
       COALESCE((SELECT COUNT(*)::text FROM follows), '')
     ) AS v`,
    [userId, stores]
  );
  return row.v;
}

/** The same answer for every visitor can be kept for a few seconds by the CDN; anything personal never is. */
const publicJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      Vary: 'Authorization, X-Salacope-Guest',
      'X-Content-Type-Options': 'nosniff',
    },
  });

/** The catalogue as it is now in the database: answers `{ unchanged }` when the app already has this version. */
route('GET', '/catalog', async (ctx) => {
  const { userId } = await viewerOf(ctx);
  const stores = await requestedStores(ctx);
  const version = await catalogVersion(userId, stores);
  const platform = currentPlatform();
  const lockdown = levelNow();
  const launchBanner = currentLaunchBanner();
  const identity = currentIdentity();
  const explore = currentExplore();
  const answer =
    ctx.search.get('v') === version
      ? { unchanged: true, version, platform, launchBanner, identity, explore, lockdown }
      : { version, platform, launchBanner, identity, explore, lockdown, data: await loadCatalog(userId, stores) };
  // Cached only for a visitor who asked for the shared copy (`?anon=1`: its own address, never one a signed-in person uses).
  return !userId && ctx.search.get('anon') === '1' ? publicJson(answer) : answer;
});

/** Everything the app needs at start: the public catalogue, plus the signed-in person's own data. */
route('GET', '/bootstrap', async (ctx) => {
  const { identity, userId } = await viewerOf(ctx);
  if (userId) void touchSeller(userId);
  const stores = await requestedStores(ctx);
  const [catalog, version] = await Promise.all([loadCatalog(userId, stores), catalogVersion(userId, stores)]);
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
  const answer = {
    userId,
    /** Signed in with Firebase but no Salacope account yet (finish sign-up). */
    needsAccount: Boolean(identity && !userId),
    serverTime: new Date().toISOString(),
    catalogVersion: version,
    platform: currentPlatform(),
    launchBanner: currentLaunchBanner(),
    identity: currentIdentity(),
    explore: currentExplore(),
    lockdown: levelNow(),
    data: {
      ...catalog,
      favorites: own?.[0].map((f) => ({ userId: f.user_id, listingId: f.listing_id, createdAt: f.created_at })) ?? [],
      follows: own?.[1].map((f) => ({ userId: f.user_id, sellerId: f.seller_id, createdAt: f.created_at, lastSeenAt: f.last_seen_at })) ?? [],
      orders: own?.[2] ?? [],
      paymentAttempts: own?.[3] ?? [],
      tickets: own?.[4] ?? [],
      notifications: own?.[5] ?? [],
    },
  };
  // Only a visitor with no identity at all, asking for the shared copy (`?anon=1`), gets the cacheable answer.
  return !identity && !userId && ctx.search.get('anon') === '1' ? publicJson(answer) : answer;
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
      event: 'follow.new_listing',
      vars: { boutique: seller?.store_name ?? 'une boutique', offre: listing.title },
      href: `${ROUTES.account.following}?boutique=${listing.sellerId}`,
    }))
  );
};

const checkedInput = (body: any): ListingInput => {
  const input = { ...body, gallery: Array.isArray(body.gallery) ? body.gallery : undefined, priceXaf: Number(body.priceXaf), compareAtXaf: body.compareAtXaf ? Number(body.compareAtXaf) : undefined, deliveryDays: body.deliveryDays ? Number(body.deliveryDays) : undefined, promoEndsAt: body.promoEndsAt || undefined } as ListingInput;
  validateListing(input);
  const fields = listingFields(input);
  if (!fields.coverImage) throw new DomainError('Ajoutez une image de couverture.');
  if (fields.coverImage.length > 400_000) throw new DomainError('Image de couverture trop lourde.');
  return input;
};

/** The app shows the stored cover by its address (see imageUrl): sent back unchanged, it means "keep the picture you have". */
const keptCover = async (cover: string, listingId: string) => {
  if (!cover.startsWith(IMG_PREFIX)) return cover;
  const [row] = await query('SELECT cover_image FROM listings WHERE id = $1', [listingId]);
  return row?.cover_image ?? cover;
};

/** New pictures go to storage (when it is set up) and the listing keeps their short addresses. */
const withStoredImages = async <T extends { coverImage: string; gallery?: string[] }>(sellerId: string, fields: T, listingId: string): Promise<T> => ({
  ...fields,
  coverImage: await offloadImage(sellerId, await keptCover(fields.coverImage, listingId), listingId),
  gallery: fields.gallery === undefined ? undefined : await offloadImages(sellerId, fields.gallery, listingId),
});

/** The attached product files must be the seller's own, fully uploaded; their real sizes replace whatever was announced. */
const withProductFiles = async <T extends { file?: ListingFile }>(sellerId: string, fields: T, listingId: string): Promise<T> => {
  const files = filesOf(fields.file);
  if (!fields.file || !files.length) return fields;
  const checked = await checkProductFiles(sellerId, listingId, files);
  const main = checked.find((f) => !f.preview) ?? checked[0];
  return { ...fields, file: { ...fields.file, size: main.size, files: checked } };
};

/** The ids of the files an offer lists. */
const fileIdsOf = (file?: ListingFile) => filesOf(file).flatMap((f) => (f.fileId ? [f.fileId] : []));

route('POST', '/listings', async (ctx) => {
  const sellerId = await ctx.userId();
  await requireMerchant(sellerId);
  const publish = ctx.body.publish === true;
  const id = newId('lst');
  const fields = await withProductFiles(sellerId, await withStoredImages(sellerId, listingFields(checkedInput(ctx.body.listing ?? {})), id), id);
  const listing = await tx(async (q) => {
    if (publish) await requirePayouts(q, sellerId);
    await q(
      `INSERT INTO listings (id, seller_id, kind, category, title, summary, description, features, price_xaf, cover_image,
         delivery_days, revisions, brief_questions, file, status, published_at, compare_at_xaf, gallery, promo_starts_at, promo_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17, $18::jsonb,
         CASE WHEN $19::timestamptz IS NULL THEN NULL ELSE NOW() END, $19::timestamptz)`,
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
        fields.compareAtXaf ?? null,
        json(fields.gallery ?? []),
        fields.promoEndsAt ?? null,
      ]
    );
    const created = (await loadListing(id, q))!;
    if (publish) await tellFollowers(q, created);
    return created;
  });
  return { listing, patch: { listings: [listing] } };
});

/**
 * A draft that exists from the moment the seller sends a file: the file is tied to it from the start, so it is never lost nor
 * left behind. It only holds what the seller already typed (the rest is filled in later, the offer cannot go online before).
 */
route('POST', '/listings/draft', async (ctx) => {
  const sellerId = await ctx.userId();
  await requireMerchant(sellerId);
  const body = ctx.body.listing ?? {};
  const kind = body.kind === 'service' ? 'service' : 'digital';
  const category = CATEGORY_IDS.includes(body.category) ? body.category : kind === 'service' ? 'service' : 'ebook';
  const id = newId('lst');
  const listing = await tx(async (q) => {
    await q(
      `INSERT INTO listings (id, seller_id, kind, category, title, summary, description, features, price_xaf, cover_image, status, gallery)
       VALUES ($1, $2, $3, $4, $5, $6, '', '[]'::jsonb, $7, '', 'draft', '[]'::jsonb)`,
      [id, sellerId, kind, category, text(body.title, 120) || 'Brouillon sans titre', text(body.summary, 200), minPriceFor(kind)]
    );
    return (await loadListing(id, q))!;
  });
  return { listing, patch: { listings: [listing] } };
});

/**
 * The files of a draft, saved as they are added or removed. Looser than saving the offer (that one checks everything): it only
 * makes sure the files are the seller's. A file taken out is deleted from storage at once unless somebody already bought it.
 */
route('PUT', '/listings/:id/files', async (ctx) => {
  const sellerId = await ctx.userId();
  if (!Array.isArray(ctx.body.files)) throw new DomainError('Liste de fichiers invalide.');
  const items: ListingFileItem[] = ctx.body.files.map((f: any) => ({
    name: text(f?.name, 160),
    format: text(f?.format, 20) || 'Fichier',
    fileId: text(f?.fileId, 60),
    size: Number(f?.size) || undefined,
    ...(f?.preview ? { preview: true } : {}),
  }));
  if (items.length > PLATFORM.maxProductFiles) throw new DomainError(`${PLATFORM.maxProductFiles} fichiers au maximum par produit.`);
  if (items.some((f) => !f.name || !f.fileId) || new Set(items.map((f) => f.fileId)).size !== items.length) {
    throw new DomainError('Liste de fichiers invalide.');
  }
  const checked = await checkProductFiles(sellerId, ctx.params.id, items);
  const listing = await tx(async (q) => {
    const current = await ownedListing(q, ctx.params.id, sellerId);
    if (current.kind !== 'digital') throw new DomainError('Seuls les produits numériques ont des fichiers.');
    if (current.status !== 'draft') throw new DomainError('Une offre en ligne se modifie depuis sa page, avec Enregistrer.', 409);
    await q('UPDATE listings SET file = $2::jsonb, updated_at = NOW() WHERE id = $1', [ctx.params.id, json(checked.length ? storedFile(checked) : null)]);
    return (await loadListing(ctx.params.id, q))!;
  });
  await pruneProductFiles(ctx.params.id, fileIdsOf(listing.file)).catch(() => undefined);
  return { patch: { listings: [listing] } };
});

route('PATCH', '/listings/:id', async (ctx) => {
  const sellerId = await ctx.userId();
  const fields = await withProductFiles(sellerId, await withStoredImages(sellerId, listingFields(checkedInput(ctx.body.listing ?? {})), ctx.params.id), ctx.params.id);
  const listing = await tx(async (q) => {
    await ownedListing(q, ctx.params.id, sellerId);
    await q(
      `UPDATE listings SET kind = $2, category = $3, title = $4, summary = $5, description = $6, features = $7::jsonb,
         price_xaf = $8, cover_image = $9, delivery_days = $10, revisions = $11, brief_questions = $12::jsonb, file = $13::jsonb,
         compare_at_xaf = $14, gallery = COALESCE($15::jsonb, gallery),
         promo_starts_at = CASE WHEN $17::boolean THEN promo_starts_at WHEN $16::timestamptz IS NULL THEN NULL WHEN promo_ends_at IS DISTINCT FROM $16::timestamptz THEN NOW() ELSE promo_starts_at END,
         promo_ends_at = CASE WHEN $17::boolean THEN promo_ends_at ELSE $16::timestamptz END, updated_at = NOW()
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
        fields.compareAtXaf ?? null,
        fields.gallery === undefined ? null : json(fields.gallery),
        fields.promoEndsAt ?? null,
        // A client that does not know promotions (an older app) never sends the field: the running promotion is left alone.
        !('promoEndsAt' in (ctx.body.listing ?? {})),
      ]
    );
    return (await loadListing(ctx.params.id, q))!;
  });
  // Pictures that were replaced or removed stop counting in the seller's space.
  const keep = [fields.coverImage, ...(fields.gallery ?? [])];
  if (fields.gallery === undefined) {
    const [row] = await query<{ gallery: string[] }>('SELECT gallery FROM listings WHERE id = $1', [ctx.params.id]);
    keep.push(...(row?.gallery ?? []));
  }
  await pruneImages(ctx.params.id, keep).catch(() => undefined);
  await pruneProductFiles(ctx.params.id, fileIdsOf(fields.file)).catch(() => undefined);
  return { patch: { listings: [listing] } };
});

route('POST', '/listings/:id/status', async (ctx) => {
  const sellerId = await ctx.userId();
  const status = ctx.body.status === 'published' ? 'published' : 'draft';
  const listing = await tx(async (q) => {
    const current = await ownedListing(q, ctx.params.id, sellerId);
    const goesOnline = status === 'published' && current.status !== 'published';
    if (goesOnline) {
      const [hidden] = await q('SELECT hidden_at, hidden_reason FROM listings WHERE id = $1', [ctx.params.id]);
      if (hidden?.hidden_at) throw new DomainError(`Cette offre a été masquée par Salacope : ${hidden.hidden_reason}. Écrivez au support pour la faire rétablir.`, 403);
      await requirePayouts(q, sellerId);
      // A draft opened by a file upload only holds what was typed so far: it cannot go online before it is complete.
      const [cover] = await q('SELECT cover_image FROM listings WHERE id = $1', [ctx.params.id]);
      if (current.title.trim().length < 8 || !current.summary.trim() || !cover?.cover_image) throw new DomainError('Complétez l’offre (titre, résumé, couverture) avant de la publier : ouvrez ses rubriques.');
      if (current.kind === 'digital' && !fileIdsOf(current.file).length) throw new DomainError('Envoyez d’abord le fichier livré au client (modifiez l’offre).');
    }
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
  // Nothing was ever sold: its files and pictures stop counting in the seller's space.
  await pruneProductFiles(ctx.params.id, []).catch(() => undefined);
  await pruneImages(ctx.params.id, []).catch(() => undefined);
  return { removed: { listings: [ctx.params.id], favorites: [ctx.params.id] } };
});

// ---------------------------------------------------------------- gallery and insights

/** Extra images of an offer, fetched when it is opened (kept out of the catalogue load). */
route('GET', '/listings/:id/gallery', async (ctx) => {
  const viewer = await ctx.viewerId();
  const [row] = await query<{ gallery: string[] }>(
    `SELECT gallery FROM listings WHERE id = $1 AND ((status = 'published' AND seller_id IN (${SELLABLE_SELLERS})) OR seller_id = $2)`,
    [ctx.params.id, viewer]
  );
  if (!row) throw new DomainError("Cette offre n'est plus disponible.", 404);
  return { images: row.gallery ?? [] };
});

/**
 * A visit of the offer page, or a click on Buy: counted once per visitor and per day, never for the seller's own visits nor
 * for crawlers and scripts (so a refresh, a bot or a loop cannot inflate the seller's figures).
 */
route('POST', '/listings/:id/track', async (ctx) => {
  const type = ctx.body.type === 'click' ? 'click' : 'view';
  const column = type === 'click' ? 'clicks' : 'views';
  const viewer = await ctx.viewerId();
  const [offer] = await query("SELECT id FROM listings WHERE id = $1 AND status = 'published' AND seller_id IS DISTINCT FROM $2", [ctx.params.id, viewer]);
  if (!offer || !(await firstSight(type, offer.id, ctx.headers))) return { ok: true };
  await query(
    `INSERT INTO listing_daily_stats (listing_id, day, ${column}) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (listing_id, day) DO UPDATE SET ${column} = listing_daily_stats.${column} + 1`,
    [offer.id]
  );
  return { ok: true };
});

/** A visit of a store's own page (`/boutique/:id`, `/@handle`), counted like an offer's: once per visitor and per day. */
route('POST', '/stores/:id/track', async (ctx) => {
  const viewer = await ctx.viewerId();
  const [store] = await query('SELECT user_id FROM merchants WHERE user_id = $1 AND user_id IS DISTINCT FROM $2', [ctx.params.id, viewer]);
  if (!store || !(await firstSight('store', store.user_id, ctx.headers))) return { ok: true };
  await query(
    `INSERT INTO store_daily_stats (seller_id, day, views) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (seller_id, day) DO UPDATE SET views = store_daily_stats.views + 1`,
    [store.user_id]
  );
  return { ok: true };
});

/** Public figures of an offer: visits, purchases, and whether its seller's app is open right now. */
route('GET', '/listings/:id/stats', async (ctx) => {
  const [row] = await query(
    `SELECT (SELECT COALESCE(SUM(views), 0)::int FROM listing_daily_stats WHERE listing_id = l.id) AS views,
            (SELECT COUNT(*)::int FROM orders WHERE listing_id = l.id AND status <> 'cancelled') AS purchases, l.seller_id
     FROM listings l WHERE l.id = $1 AND l.status = 'published'`,
    [ctx.params.id]
  );
  if (!row) throw new DomainError("Cette offre n'est plus disponible.", 404);
  // Before the migration that records presence, nobody shows as online.
  const [seen] = await query("SELECT COALESCE(last_seen_at > NOW() - interval '5 minutes', false) AS online FROM merchants WHERE user_id = $1", [row.seller_id]).catch(() => [{ online: false }]);
  return { views: row.views, purchases: row.purchases, sellerOnline: Boolean(seen?.online) };
});

/** Views and clicks of the seller's offers, day by day, between two dates (the dashboard's period). Counts only, never who. */
route('GET', '/seller/analytics', async (ctx) => {
  const sellerId = await ctx.userId();
  const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
  const from = day(ctx.search.get('from'));
  const to = day(ctx.search.get('to'));
  if (!from || !to || from > to) throw new DomainError('Période invalide.');
  if (Date.parse(to) - Date.parse(from) > 800 * 86_400_000) throw new DomainError('Période trop longue : 800 jours au plus.');
  const rows = await query(
    `SELECT s.listing_id AS "listingId", s.day::text AS day, s.views, s.clicks
     FROM listing_daily_stats s JOIN listings l ON l.id = s.listing_id
     WHERE l.seller_id = $1 AND s.day BETWEEN $2::date AND $3::date ORDER BY s.day LIMIT 50000`,
    [sellerId, from, to]
  );
  const store = await query(
    'SELECT day::text AS day, views FROM store_daily_stats WHERE seller_id = $1 AND day BETWEEN $2::date AND $3::date ORDER BY day',
    [sellerId, from, to]
  );
  return { stats: rows, store };
});

/** The seller's figures per offer: views, clicks (30 days and all time) and revenue of completed sales. */
route('GET', '/seller/insights', async (ctx) => {
  const sellerId = await ctx.userId();
  const rows = await query(
    `SELECT l.id,
       COALESCE(SUM(s.views), 0)::int AS views,
       COALESCE(SUM(s.clicks), 0)::int AS clicks,
       COALESCE(SUM(s.views) FILTER (WHERE s.day > CURRENT_DATE - 30), 0)::int AS views30,
       COALESCE(SUM(s.clicks) FILTER (WHERE s.day > CURRENT_DATE - 30), 0)::int AS clicks30,
       (SELECT COALESCE(SUM((o.amounts->>'net')::int), 0) FROM orders o WHERE o.listing_id = l.id AND o.status = 'completed')::int AS revenue
     FROM listings l LEFT JOIN listing_daily_stats s ON s.listing_id = l.id
     WHERE l.seller_id = $1 GROUP BY l.id`,
    [sellerId]
  );
  return { insights: rows };
});
