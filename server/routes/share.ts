import { query } from '../db.js';
import { route } from '../http.js';
import { SELLABLE_SELLERS } from '../compliance.js';

/**
 * Link previews. When an offer or a store is shared (WhatsApp, Facebook, Telegram, X, SMS…), the app that receives the link
 * reads the page's HTML without running any script. These routes answer `/p/:id`, `/s/:id` and `/@handle` with the app's
 * own page plus the tags that make the preview: the offer's own picture, its title and price, the store's name. No Salacope
 * logo in the picture, just the product. (vercel.json sends those addresses here.)
 */

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const money = (n: number) => `${Number(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;

interface Card {
  title: string;
  description: string;
  /** Public address of the page being shared. */
  url: string;
  image: string;
  alt: string;
  type?: 'website' | 'product';
  price?: number;
}

/** The app's own index.html (what a visitor needs to load), with the preview tags for this page. */
async function withPreview(origin: string, card: Card | null): Promise<Response> {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' };
  const base = await fetch(`${origin}/index.html`);
  let html = await base.text();
  if (card) {
    const tags = [
      `<meta property="og:type" content="${card.type ?? 'website'}" />`,
      `<meta property="og:site_name" content="Salacope" />`,
      `<meta property="og:locale" content="fr_FR" />`,
      `<meta property="og:title" content="${esc(card.title)}" />`,
      `<meta property="og:description" content="${esc(card.description)}" />`,
      `<meta property="og:url" content="${esc(card.url)}" />`,
      `<meta property="og:image" content="${esc(card.image)}" />`,
      `<meta property="og:image:alt" content="${esc(card.alt)}" />`,
      card.price !== undefined ? `<meta property="product:price:amount" content="${card.price}" />` : '',
      card.price !== undefined ? `<meta property="product:price:currency" content="XAF" />` : '',
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(card.title)}" />`,
      `<meta name="twitter:description" content="${esc(card.description)}" />`,
      `<meta name="twitter:image" content="${esc(card.image)}" />`,
      `<link rel="canonical" href="${esc(card.url)}" />`,
    ]
      .filter(Boolean)
      .join('\n    ');
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(card.title)} — Salacope</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(card.description)}" />`)
      .replace('</head>', `    ${tags}\n  </head>`);
  }
  return new Response(html, { status: base.ok ? 200 : 502, headers });
}

/** Whatever goes wrong, a visitor still gets the app (the preview is a bonus, never a way to break a page). */
const safely = async (origin: string, build: () => Promise<Card | null>) => {
  let card: Card | null = null;
  try {
    card = await build();
  } catch (err) {
    console.error('[share]', err);
  }
  return withPreview(origin, card);
};

route('GET', '/share/p/:id', (ctx) =>
  safely(ctx.origin, async () => {
    const [l] = await query(
      `SELECT l.id, l.title, l.summary, l.price_xaf, l.updated_at, m.store_name FROM listings l JOIN merchants m ON m.user_id = l.seller_id
       WHERE l.id = $1 AND l.status = 'published' AND l.seller_id IN (${SELLABLE_SELLERS})`,
      [ctx.params.id]
    );
    if (!l) return null;
    return {
      title: l.title,
      description: clip(`${money(l.price_xaf)} · ${l.store_name}${l.summary ? ` — ${l.summary}` : ''}`, 200),
      url: `${ctx.origin}/p/${l.id}`,
      image: `${ctx.origin}/api/share/image/p/${l.id}?v=${encodeURIComponent(new Date(l.updated_at).getTime())}`,
      alt: l.title,
      type: 'product',
      price: l.price_xaf,
    };
  })
);

/** A store by its id (`/s/:id`) or by its @name (`/@name`). */
const storeCard = async (origin: string, where: string, value: string): Promise<Card | null> => {
  const [m] = await query(
    `SELECT m.user_id, m.store_name, m.headline, m.city, m.handle, m.logo IS NOT NULL AS has_logo,
       (SELECT COUNT(*)::int FROM listings l WHERE l.seller_id = m.user_id AND l.status = 'published') AS offers
     FROM merchants m JOIN users u ON u.id = m.user_id
     WHERE ${where} AND m.kyc_status = 'approved' AND m.suspended_at IS NULL AND u.blocked_at IS NULL`,
    [value]
  );
  if (!m) return null;
  const parts = [m.headline, m.city, m.offers ? `${m.offers} offre${m.offers > 1 ? 's' : ''} en ligne` : ''].filter(Boolean);
  return {
    title: m.store_name,
    description: clip(parts.join(' · ') || `Boutique ${m.store_name}`, 200),
    url: m.handle ? `${origin}/@${m.handle}` : `${origin}/s/${m.user_id}`,
    image: `${origin}/api/share/image/s/${m.user_id}`,
    alt: m.store_name,
  };
};

route('GET', '/share/s/:id', (ctx) => safely(ctx.origin, () => storeCard(ctx.origin, 'm.user_id = $1', ctx.params.id)));
route('GET', '/share/h/:handle', (ctx) => safely(ctx.origin, () => storeCard(ctx.origin, 'LOWER(m.handle) = LOWER($1)', ctx.params.handle)));

// --- the pictures --------------------------------------------------------------------------------------------------
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';

/** A stored picture (kept as a data URL) as the image file the preview needs. */
const image = (dataUrl: string | null | undefined) => {
  const m = String(dataUrl ?? '').match(DATA_URL);
  if (!m) return new Response(JSON.stringify({ error: 'Image introuvable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return new Response(Buffer.from(m[2], 'base64'), { status: 200, headers: { 'Content-Type': m[1], 'Cache-Control': CACHE, 'X-Content-Type-Options': 'nosniff' } });
};

/** The offer's cover. */
route('GET', '/share/image/p/:id', async (ctx) => {
  const [l] = await query(`SELECT cover_image FROM listings WHERE id = $1 AND status = 'published' AND seller_id IN (${SELLABLE_SELLERS})`, [ctx.params.id]);
  return image(l?.cover_image);
});

/** The store's photo; a store without one is shown by its latest offer's cover (still a product, never the Salacope logo). */
route('GET', '/share/image/s/:id', async (ctx) => {
  const [m] = await query(
    `SELECT COALESCE(m.logo, (SELECT l.cover_image FROM listings l WHERE l.seller_id = m.user_id AND l.status = 'published' ORDER BY l.published_at DESC NULLS LAST LIMIT 1)) AS picture
     FROM merchants m JOIN users u ON u.id = m.user_id
     WHERE m.user_id = $1 AND m.kyc_status = 'approved' AND m.suspended_at IS NULL AND u.blocked_at IS NULL`,
    [ctx.params.id]
  );
  return image(m?.picture);
});
