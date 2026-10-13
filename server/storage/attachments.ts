import type { Attachment } from '../../src/shared/db/schema.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { query } from '../db.js';
import { signedUrl, storeBytes, target } from './index.js';

const DATA = /^data:([^;,]*)(?:;[^,]*)?;base64,([A-Za-z0-9+/]+={0,2})$/;
/** Shown in the page itself; anything else is only ever offered as a download. */
const INLINE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const TWELVE_HOURS = 12 * 3600;

/**
 * Files attached to a message or a delivery (sent by the app as data URLs) go to the private chat bucket and are kept as
 * `{ id, name, size, type, fileId }`. Files never go into the database: with no chat bucket yet they are refused.
 */
export async function storeAttachments(ownerId: string, files: Attachment[], ref: string): Promise<Attachment[]> {
  if (!files.length) return files;
  if (!(await target('chat'))) {
    if (files.some((f) => f.dataUrl?.startsWith('data:'))) throw new DomainError('L’envoi de fichiers n’est pas encore ouvert sur Salacope : écrivez votre message sans pièce jointe.', 503);
    return files;
  }
  return Promise.all(
    files.map(async (f) => {
      const m = f.dataUrl?.match(DATA);
      if (!m) return f;
      const type = m[1] || f.type || 'application/octet-stream';
      const stored = await storeBytes('chat', ownerId, Buffer.from(m[2], 'base64'), { name: f.name, mime: type, ref });
      return stored ? { id: stored.id, name: f.name, size: f.size, type: f.type || type, fileId: stored.id } : f;
    })
  );
}

interface Carrier {
  attachments?: Attachment[];
}

/**
 * Before orders are sent to the app, every stored attachment gets a short-lived address in `dataUrl`, where the app already
 * looks for it: pictures open in the page, other files download. Rows are changed in place.
 */
export async function signAttachments(carriers: Carrier[]): Promise<void> {
  const wanted = carriers.flatMap((c) => c.attachments ?? []).filter((a) => a.fileId);
  if (!wanted.length) return;
  const t = await target('chat');
  if (!t) return;
  const rows = await query<{ id: string; object_key: string; mime: string; name: string }>(
    "SELECT id, object_key, mime, name FROM stored_files WHERE id = ANY($1) AND status = 'ready'",
    [wanted.map((a) => a.fileId)]
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const a of wanted) {
    const file = byId.get(a.fileId!);
    if (!file) continue;
    const inline = INLINE.has(file.mime);
    a.dataUrl = signedUrl(t, file.object_key, 'GET', TWELVE_HOURS, inline ? undefined : { 'response-content-disposition': `attachment; filename="${file.name.replace(/"/g, '')}"` });
  }
}
