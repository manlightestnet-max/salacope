import { query } from '../db.js';
import { route } from '../http.js';
import { SELLABLE_SELLERS } from '../compliance.js';

/** Errors seen by visitors (written to the server logs, searchable there) and the sitemap for search engines. */
route('POST', '/client-error', async (ctx) => {
  const b = ctx.body ?? {};
  console.error('[client-error]', JSON.stringify({ where: String(b.where ?? '').slice(0, 20), message: String(b.message ?? '').slice(0, 300), url: String(b.url ?? '').slice(0, 160), agent: String(b.agent ?? '').slice(0, 160), stack: String(b.stack ?? '').slice(0, 1500) }));
  return { ok: true };
});

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

route('GET', '/sitemap.xml', async (ctx) => {
  const [offers, stores] = await Promise.all([
    query(`SELECT id, updated_at FROM listings WHERE status = 'published' AND seller_id IN (${SELLABLE_SELLERS}) AND seller_id NOT IN (SELECT user_id FROM merchants WHERE private_store) ORDER BY updated_at DESC LIMIT 5000`),
    query(`SELECT m.user_id, m.handle FROM merchants m JOIN users u ON u.id = m.user_id WHERE m.kyc_status = 'approved' AND m.suspended_at IS NULL AND u.blocked_at IS NULL AND NOT m.private_store LIMIT 5000`),
  ]);
  const base = ctx.origin;
  const urls = [
    { loc: `${base}/`, mod: undefined as string | undefined },
    { loc: `${base}/vendre`, mod: undefined },
    { loc: `${base}/recherche`, mod: undefined },
    ...['', '/cgu', '/remboursement', '/confidentialite', '/cookies', '/lutte-anti-blanchiment'].map((p) => ({ loc: `${base}/legal${p}`, mod: undefined })),
    ...stores.map((s) => ({ loc: s.handle ? `${base}/@${s.handle}` : `${base}/s/${s.user_id}`, mod: undefined })),
    ...offers.map((o) => ({ loc: `${base}/p/${o.id}`, mod: String(o.updated_at).slice(0, 10) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${xml(u.loc)}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
});
