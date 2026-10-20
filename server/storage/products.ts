import { DomainError } from '../../src/shared/domain/errors.js';
import { query } from '../db.js';
import { deleteObject, target } from './index.js';

/**
 * The files a seller attached to an offer must be theirs, product files, fully uploaded and not another offer's. → the same
 * files with the size storage really holds (never the one the browser announced), now tied to the offer.
 */
export async function checkProductFiles<T extends { fileId?: string; size?: number }>(sellerId: string, listingId: string, files: T[]): Promise<T[]> {
  const ids = files.map((f) => f.fileId).filter((id): id is string => Boolean(id));
  if (!ids.length) return files;
  const rows = await query<{ id: string; size: number; ref: string | null }>(
    "SELECT id, size, ref FROM stored_files WHERE id = ANY($1) AND owner_id = $2 AND purpose = 'product' AND status = 'ready'",
    [ids, sellerId]
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const checked = files.map((f) => {
    if (!f.fileId) return f;
    const row = byId.get(f.fileId);
    if (!row) throw new DomainError('Un fichier du produit n’est pas (ou plus) disponible : envoyez-le à nouveau.');
    if (row.ref && row.ref !== listingId) throw new DomainError('Un des fichiers est déjà utilisé par une autre offre : envoyez-le à nouveau.');
    return { ...f, size: Number(row.size) };
  });
  await query('UPDATE stored_files SET ref = $2 WHERE id = ANY($1) AND ref IS DISTINCT FROM $2', [ids, listingId]);
  return checked;
}

/**
 * A file somebody already paid for (or is paying for right now) must stay in storage whatever the seller does with the offer
 * afterwards: orders and pending payments carry their own copy of the product's files.
 */
async function isSold(fileId: string): Promise<boolean> {
  const carries = JSON.stringify([{ fileId }]);
  const [order] = await query("SELECT 1 FROM orders WHERE item->'file'->>'fileId' = $1 OR item->'file'->'files' @> $2::jsonb LIMIT 1", [fileId, carries]);
  if (order) return true;
  const [pending] = await query(
    "SELECT 1 FROM payment_attempts WHERE status = 'pending' AND (details->'item'->'file'->>'fileId' = $1 OR details->'item'->'file'->'files' @> $2::jsonb) LIMIT 1",
    [fileId, carries]
  );
  return Boolean(pending);
}

/** A file a listing still lists. */
async function isListed(fileId: string): Promise<boolean> {
  const [row] = await query("SELECT 1 FROM listings WHERE file->>'fileId' = $1 OR file->'files' @> $2::jsonb LIMIT 1", [fileId, JSON.stringify([{ fileId }])]);
  return Boolean(row);
}

async function remove(row: { id: string; object_key: string }) {
  const t = await target('product');
  if (!t) return;
  await deleteObject(t, row.object_key);
  await query('DELETE FROM stored_files WHERE id = $1', [row.id]);
}

/**
 * Product files that an offer no longer uses are removed from storage, unless an order already carries them (buyers keep
 * what they bought). `keep` are the files now attached.
 */
export async function pruneProductFiles(listingId: string, keep: string[]) {
  if (!(await target('product'))) return;
  const rows = await query<{ id: string; object_key: string }>("SELECT id, object_key FROM stored_files WHERE purpose = 'product' AND ref = $1 AND NOT (id = ANY($2))", [listingId, keep]);
  for (const row of rows) if (!(await isSold(row.id))) await remove(row);
}

/** A seller takes back a file they sent but did not keep: only if no offer lists it and nobody bought it. */
export async function discardProductFile(ownerId: string, fileId: string): Promise<void> {
  const [row] = await query<{ id: string; object_key: string }>("SELECT id, object_key FROM stored_files WHERE id = $1 AND owner_id = $2 AND purpose = 'product'", [fileId, ownerId]);
  if (!row) return;
  if ((await isListed(fileId)) || (await isSold(fileId))) throw new DomainError('Ce fichier fait partie d’une offre : retirez-le de l’offre et enregistrez.', 409);
  await remove(row);
}

/**
 * Uploads that no offer lists and nobody bought (the seller closed the page, changed their mind) are removed after a day, so they
 * do not eat the seller's space for ever. → how many were removed.
 */
export async function sweepOrphanProductFiles(limit = 50): Promise<number> {
  if (!(await target('product'))) return 0;
  const carried = (column: string) => `(${column}->'file'->>'fileId' = f.id OR ${column}->'file'->'files' @> jsonb_build_array(jsonb_build_object('fileId', f.id)))`;
  const rows = await query<{ id: string; object_key: string }>(
    `SELECT f.id, f.object_key FROM stored_files f
     WHERE f.purpose = 'product' AND f.created_at < NOW() - INTERVAL '1 day'
       AND NOT EXISTS (SELECT 1 FROM listings l WHERE (l.file->>'fileId' = f.id OR l.file->'files' @> jsonb_build_array(jsonb_build_object('fileId', f.id))))
       AND NOT EXISTS (SELECT 1 FROM orders o WHERE ${carried('o.item')})
       AND NOT EXISTS (SELECT 1 FROM payment_attempts a WHERE a.status = 'pending' AND ${carried("a.details->'item'")})
     ORDER BY f.created_at LIMIT $1`,
    [limit]
  );
  for (const row of rows) await remove(row);
  return rows.length;
}
