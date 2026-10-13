import { DomainError } from '../../src/shared/domain/errors.js';
import { query } from '../db.js';
import { deleteObject, storeBytes, target } from './index.js';

const DATA_IMAGE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const EXTENSION: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 4).toString('hex') === '89504e47',
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

/**
 * A picture sent by the app (a data URL) becomes a file in the public image bucket and its short address; an address already
 * is returned as it is. Pictures never go into the database: with no bucket set up, a new picture is refused. The type is
 * read from the bytes, never trusted.
 */
export async function offloadImage(ownerId: string, value: string, ref: string): Promise<string> {
  const m = String(value ?? '').match(DATA_IMAGE);
  if (!m) return value;
  const t = await target('image');
  if (!t) throw new DomainError('L’envoi d’images n’est pas encore ouvert sur Salacope. Réessayez dans un moment.', 503);
  const bytes = Buffer.from(m[2], 'base64');
  if (!MAGIC[m[1]](bytes)) return value; // the existing checks refuse it
  const stored = await storeBytes('image', ownerId, bytes, { name: `image.${EXTENSION[m[1]]}`, mime: m[1], ref });
  return stored?.url ?? value;
}

export const offloadImages = (ownerId: string, values: string[], ref: string) => Promise.all(values.map((v) => offloadImage(ownerId, v, ref)));

/**
 * Pictures of `ref` (a listing, a store…) that are no longer used are removed from storage, so replaced pictures do not
 * keep eating the seller's space. `keep` are the addresses still in use.
 */
export async function pruneImages(ref: string, keep: string[]) {
  const t = await target('image');
  if (!t) return;
  const rows = await query<{ id: string; object_key: string }>("SELECT id, object_key FROM stored_files WHERE purpose = 'image' AND ref = $1", [ref]);
  for (const row of rows) {
    if (keep.some((url) => url.endsWith(`/${row.object_key}`))) continue;
    await deleteObject(t, row.object_key);
    await query('DELETE FROM stored_files WHERE id = $1', [row.id]);
  }
}
