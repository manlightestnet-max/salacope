import { DomainError } from '../../src/shared/domain/errors.js';
import { query } from '../db.js';
import { deleteObject, target } from './index.js';

/** The product file a seller attached must be theirs, a product file, and fully uploaded. → its stored size. */
export async function checkProductFile(sellerId: string, fileId: string): Promise<number> {
  const [row] = await query<{ size: number }>("SELECT size FROM stored_files WHERE id = $1 AND owner_id = $2 AND purpose = 'product' AND status = 'ready'", [fileId, sellerId]);
  if (!row) throw new DomainError('Le fichier du produit n’est pas (ou plus) disponible : envoyez-le à nouveau.');
  return Number(row.size);
}

/**
 * Product files that an offer no longer uses are removed from storage, unless an order already carries them (buyers keep
 * what they bought). `keep` is the file now attached.
 */
export async function pruneProductFiles(listingId: string, keep: string | undefined) {
  const t = await target('product');
  if (!t) return;
  const rows = await query<{ id: string; object_key: string }>("SELECT id, object_key FROM stored_files WHERE purpose = 'product' AND ref = $1 AND id <> $2", [listingId, keep ?? '']);
  for (const row of rows) {
    const [sold] = await query("SELECT 1 FROM orders WHERE item->'file'->>'fileId' = $1 LIMIT 1", [row.id]);
    if (sold) continue;
    await deleteObject(t, row.object_key);
    await query('DELETE FROM stored_files WHERE id = $1', [row.id]);
  }
}
