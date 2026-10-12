import { query } from '../db.js';
import { route } from '../http.js';
import { SELLABLE_SELLERS } from '../compliance.js';
import { currentIdentity } from '../settings.js';
import { socialLinks } from '../../src/shared/config/identity.js';

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
  /** Structured data (schema.org) for search engines and answer engines. */
  jsonLd?: Record<string, unknown>;
  /** Plain text shown to crawlers that do not run scripts. */
  text?: string;
  /** The page already has its own readable text (the home page): nothing is added to it. */
  noIntro?: boolean;
}

/** The app's own index.html (what a visitor needs to load), with the preview tags for this page. */
async function withPreview(origin: string, card: Card | null): Promise<Response> {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' };
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
    // The page's own tags replace the site's default ones (a second og:title or canonical would confuse the readers).
    html = html
      .replace(/<meta property="og:[^>]*>\s*/g, '')
      .replace(/<meta name="twitter:[^>]*>\s*/g, '')
      .replace(/<link rel="canonical"[^>]*>\s*/g, '')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(card.title)} — Salacope</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(card.description)}" />`)
      .replace('</head>', `    ${tags}${card.jsonLd ? `\n    <script type="application/ld+json">${JSON.stringify(card.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}\n  </head>`)
      .replace('<noscript>', card.noIntro ? '<noscript>' : `<noscript>\n      <h1>${esc(card.title)}</h1>\n      <p>${esc(card.text ?? card.description)}</p>`);
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
      text: clip(`${l.title}. ${l.summary || ''} Prix : ${money(l.price_xaf)}. Vendu par ${l.store_name} sur Salacope.`, 500),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: l.title,
        description: clip(l.summary || `${l.title} sur Salacope`, 300),
        image: `${ctx.origin}/api/share/image/p/${l.id}?v=${encodeURIComponent(new Date(l.updated_at).getTime())}`,
        url: `${ctx.origin}/p/${l.id}`,
        brand: { '@type': 'Brand', name: l.store_name },
        offers: {
          '@type': 'Offer',
          price: String(l.price_xaf),
          priceCurrency: 'XAF',
          availability: 'https://schema.org/InStock',
          url: `${ctx.origin}/p/${l.id}`,
          seller: { '@type': 'Organization', name: l.store_name },
        },
      },
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
    text: clip(`Boutique ${m.store_name} sur Salacope. ${parts.join(' · ')}`, 500),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: m.store_name,
      url: m.handle ? `${origin}/@${m.handle}` : `${origin}/s/${m.user_id}`,
      description: clip(parts.join(' · ') || `Boutique ${m.store_name}`, 300),
      image: `${origin}/api/share/image/s/${m.user_id}`,
      ...(m.city ? { address: { '@type': 'PostalAddress', addressLocality: m.city, addressCountry: 'CG' } } : {}),
    },
  };
};

route('GET', '/share/s/:id', (ctx) => safely(ctx.origin, () => storeCard(ctx.origin, 'm.user_id = $1', ctx.params.id)));
route('GET', '/share/h/:handle', (ctx) => safely(ctx.origin, () => storeCard(ctx.origin, 'LOWER(m.handle) = LOWER($1)', ctx.params.handle)));

// --- the pictures --------------------------------------------------------------------------------------------------
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';

/** A stored picture (kept as a data URL) as the image file the preview needs. */
export const image = (dataUrl: string | null | undefined, cache = CACHE) => {
  // Stored on the public bucket: send the reader there.
  if (/^https:\/\//.test(String(dataUrl ?? ''))) return new Response(null, { status: 302, headers: { Location: String(dataUrl), 'Cache-Control': cache } });
  const m = String(dataUrl ?? '').match(DATA_URL);
  if (!m) return new Response(JSON.stringify({ error: 'Image introuvable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return new Response(Buffer.from(m[2], 'base64'), { status: 200, headers: { 'Content-Type': m[1], 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } });
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

// --- the home page and the file for assistants, written from the site's identity ---------------------------------------
route('GET', '/share/home', (ctx) =>
  safely(ctx.origin, async () => {
    const id = currentIdentity();
    const image = id.shareImage ? (id.shareImage.startsWith('/') ? `${ctx.origin}${id.shareImage}` : id.shareImage) : `${ctx.origin}/apple-touch-icon.png`;
    return {
      title: 'Salacope — Produits numériques et services au Congo',
      description: id.description,
      url: `${ctx.origin}/`,
      image,
      alt: 'Salacope',
      noIntro: true,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${ctx.origin}/#organization`,
            name: 'Salacope',
            url: `${ctx.origin}/`,
            logo: `${ctx.origin}/apple-touch-icon.png`,
            description: id.description,
            email: id.contactEmail,
            areaServed: { '@type': 'Country', name: 'République du Congo' },
            knowsLanguage: 'fr',
            ...(socialLinks(id).length ? { sameAs: socialLinks(id).map((s) => s.url) } : {}),
          },
          {
            '@type': 'WebSite',
            '@id': `${ctx.origin}/#website`,
            url: `${ctx.origin}/`,
            name: 'Salacope',
            inLanguage: 'fr',
            publisher: { '@id': `${ctx.origin}/#organization` },
            potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${ctx.origin}/recherche?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
          },
        ],
      },
    };
  })
);

route('GET', '/llms.txt', async (ctx) => {
  const id = currentIdentity();
  const o = ctx.origin;
  const links = socialLinks(id);
  const body = `# Salacope

> ${id.description}

Un seul compte par personne : acheteur, puis vendeur une fois sa boutique ouverte et son identité vérifiée. Les prix sont en FCFA (XAF), les téléphones en +242.

## Pages principales
- [Accueil et catalogue](${o}/): les offres et les boutiques vérifiées.
- [Recherche](${o}/recherche): trouver une offre par mot-clé ou par catégorie.
- [Vendre sur Salacope](${o}/vendre): ouvrir une boutique, commission et délais de paiement.
- [Plan du site](${o}/sitemap.xml): toutes les offres et boutiques publiées.

## Règles
- [Conditions d'utilisation](${o}/legal/cgu)
- [Remboursement et litiges](${o}/legal/remboursement)
- [Confidentialité](${o}/legal/confidentialite)
- [Cookies](${o}/legal/cookies)
- [Lutte contre le blanchiment](${o}/legal/lutte-anti-blanchiment)
${links.length ? `\n## Profils officiels\n${links.map((l) => `- [${l.label}](${l.url})`).join('\n')}\n` : ''}
## Contact
${id.contactEmail}
`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400' } });
});
