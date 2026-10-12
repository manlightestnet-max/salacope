import { query } from '../db.js';
import { route } from '../http.js';
import { image } from './share.js';

/**
 * The pictures of the catalogue as files (see imageUrl in views.ts): an offer's cover, a store's photo, the cover an order
 * was bought with. The address carries a version, so the browser keeps each one for good. Covers are public pictures and the
 * identifiers cannot be guessed; nothing private is served here.
 */
const KEEP = 'public, max-age=31536000, s-maxage=31536000, immutable';

route('GET', '/img/l/:id', async (ctx) => {
  const [l] = await query('SELECT cover_image FROM listings WHERE id = $1', [ctx.params.id]);
  return image(l?.cover_image, KEEP);
});

route('GET', '/img/s/:id', async (ctx) => {
  const [m] = await query('SELECT logo FROM merchants WHERE user_id = $1', [ctx.params.id]);
  return image(m?.logo, KEEP);
});

route('GET', '/img/o/:id', async (ctx) => {
  const [o] = await query("SELECT item->>'coverImage' AS cover FROM orders WHERE id = $1", [ctx.params.id]);
  return image(o?.cover, KEEP);
});
