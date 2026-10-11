import { DomainError } from '../../src/shared/domain/errors.js';
import { STORAGE } from '../../src/shared/config/platform.js';
import { query } from '../db.js';
import { route } from '../http.js';
import { confirmUpload, downloadUrl, reserveUpload, target, usedBytes } from '../storage/index.js';

/**
 * Files: what the app may ask of storage. Uploads go straight from the browser to the bucket with a short-lived address
 * (the server never carries a big file); downloads come back the same way, only for who is allowed to have the file.
 */

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** What this person can do with storage, and how much room they have left. */
route('GET', '/files/usage', async (ctx) => {
  const userId = await ctx.userId();
  return {
    usedBytes: await usedBytes(userId).catch(() => 0),
    quotaBytes: STORAGE.quotaBytes,
    maxFileBytes: STORAGE.maxFileBytes,
    product: Boolean(await target('product')),
    chat: Boolean(await target('chat')),
    image: Boolean(await target('image')),
  };
});

/** A seller sends the file of a digital product. → an address to PUT the file to. */
route('POST', '/files/sign', async (ctx) => {
  const userId = await ctx.accountId();
  const [merchant] = await query('SELECT 1 FROM merchants WHERE user_id = $1', [userId]);
  if (!merchant) throw new DomainError('Ouvrez d’abord votre boutique pour envoyer des fichiers.', 403);
  const purpose = ctx.body.purpose === 'product' ? 'product' : null;
  if (!purpose) throw new DomainError('Type de fichier non pris en charge ici.');
  const size = Number(ctx.body.size);
  if (!Number.isFinite(size) || size <= 0) throw new DomainError('Fichier vide.');
  const name = text(ctx.body.name, 160) || 'fichier';
  const mime = text(ctx.body.type, 100) || 'application/octet-stream';
  const ref = text(ctx.body.ref, 60) || undefined;
  return reserveUpload(purpose, userId, { name, mime, size, ref });
});

/** The browser says the upload is finished: the object must be there with the announced size. */
route('POST', '/files/:id/complete', async (ctx) => {
  const userId = await ctx.accountId();
  const file = await confirmUpload(ctx.params.id, userId);
  return { file: { id: file.id, size: Number(file.size) } };
});

/** The file of a digital product the buyer paid for (or the seller's own copy): a link that works for two minutes. */
route('GET', '/orders/:id/file', async (ctx) => {
  const userId = await ctx.userId();
  const [order] = await query<{ buyer_id: string; seller_id: string; status: string; item: { file?: { fileId?: string } } }>(
    'SELECT buyer_id, seller_id, status, item FROM orders WHERE id = $1',
    [ctx.params.id]
  );
  if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) throw new DomainError('Commande introuvable.', 404);
  if (order.buyer_id === userId && !['delivered', 'completed', 'disputed'].includes(order.status)) {
    throw new DomainError('Le fichier sera disponible dès que le paiement sera confirmé.', 409);
  }
  const fileId = order.item?.file?.fileId;
  if (!fileId) throw new DomainError('Ce produit n’a pas encore de fichier sur le serveur : écrivez au vendeur dans la discussion.', 404);
  const link = await downloadUrl(fileId, 120);
  if (!link) throw new DomainError('Fichier introuvable. Écrivez au vendeur dans la discussion.', 404);
  // Kept as evidence for disputes (the table may not be migrated yet: a download is never refused for that).
  await query('INSERT INTO order_downloads (order_id, user_id) VALUES ($1, $2)', [ctx.params.id, userId]).catch(() => undefined);
  return link;
});
