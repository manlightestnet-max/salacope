import { query } from '../db.js';
import { storeAttachments } from './attachments.js';
import { offloadImage } from './images.js';
import { readStoredFile, storeBytes, target } from './index.js';

/**
 * Moves what is already in the database (pictures, attachments, identity documents) to storage, a small batch at a time so
 * a serverless call stays short. Only the kinds whose bucket is set are touched; an item that cannot move (a seller over
 * their space, an unreadable picture) is counted as `failed` and left where it is.
 */
export interface MigrationReport {
  migrated: number;
  failed: number;
  remaining: Record<string, number>;
}

const BATCH = 12;
const count = async (sql: string) => Number((await query<{ n: number }>(sql))[0]?.n ?? 0);

export async function remaining() {
  const out: Record<string, number> = {};
  if (await target('image')) {
    out.covers = await count("SELECT COUNT(*)::int AS n FROM listings WHERE cover_image LIKE 'data:%'");
    out.galleries = await count("SELECT COUNT(*)::int AS n FROM listings WHERE gallery::text LIKE '%data:image%'");
    out.logos = await count("SELECT COUNT(*)::int AS n FROM merchants WHERE logo LIKE 'data:%'");
    out.banners = await count("SELECT COUNT(*)::int AS n FROM ad_banners WHERE image LIKE 'data:%'");
  }
  if (await target('chat')) {
    out.messages = await count("SELECT COUNT(*)::int AS n FROM order_messages WHERE attachments::text LIKE '%\"dataUrl\":\"data:%'");
    out.deliveries = await count("SELECT COUNT(*)::int AS n FROM orders WHERE delivery::text LIKE '%\"dataUrl\":\"data:%'");
  }
  if (await target('kyc')) out.kyc = await count('SELECT COUNT(*)::int AS n FROM kyc_documents WHERE data IS NOT NULL');
  return out;
}

export async function migrateBatch(adminUserId: string | null): Promise<MigrationReport> {
  let migrated = 0;
  let failed = 0;
  const attempt = async (work: () => Promise<boolean>) => {
    try {
      if (await work()) migrated += 1;
      else failed += 1;
    } catch (err) {
      console.error('[migrate]', err);
      failed += 1;
    }
  };

  if (await target('image')) {
    for (const l of await query<{ id: string; seller_id: string; cover_image: string }>("SELECT id, seller_id, cover_image FROM listings WHERE cover_image LIKE 'data:%' LIMIT $1", [BATCH])) {
      await attempt(async () => {
        const url = await offloadImage(l.seller_id, l.cover_image, l.id);
        if (url === l.cover_image) return false;
        await query('UPDATE listings SET cover_image = $2, updated_at = NOW() WHERE id = $1', [l.id, url]);
        return true;
      });
    }
    for (const l of await query<{ id: string; seller_id: string; gallery: string[] }>("SELECT id, seller_id, gallery FROM listings WHERE gallery::text LIKE '%data:image%' LIMIT $1", [BATCH])) {
      await attempt(async () => {
        const next = await Promise.all(l.gallery.map((g) => offloadImage(l.seller_id, g, l.id)));
        if (next.every((g, i) => g === l.gallery[i])) return false;
        await query('UPDATE listings SET gallery = $2::jsonb, updated_at = NOW() WHERE id = $1', [l.id, JSON.stringify(next)]);
        return true;
      });
    }
    for (const m of await query<{ user_id: string; logo: string }>("SELECT user_id, logo FROM merchants WHERE logo LIKE 'data:%' LIMIT $1", [BATCH])) {
      await attempt(async () => {
        const url = await offloadImage(m.user_id, m.logo, `logo:${m.user_id}`);
        if (url === m.logo) return false;
        await query('UPDATE merchants SET logo = $2 WHERE user_id = $1', [m.user_id, url]);
        return true;
      });
    }
    if (adminUserId) {
      for (const b of await query<{ position: number; image: string }>("SELECT position, image FROM ad_banners WHERE image LIKE 'data:%' LIMIT $1", [BATCH])) {
        await attempt(async () => {
          const url = await offloadImage(adminUserId, b.image, `banner:${b.position}`);
          if (url === b.image) return false;
          await query('UPDATE ad_banners SET image = $2 WHERE position = $1', [b.position, url]);
          return true;
        });
      }
    }
  }

  if (await target('chat')) {
    for (const m of await query<{ id: string; order_id: string; author_id: string; attachments: any[] }>(
      "SELECT id, order_id, author_id, attachments FROM order_messages WHERE attachments::text LIKE '%\"dataUrl\":\"data:%' LIMIT $1",
      [BATCH]
    )) {
      await attempt(async () => {
        const next = await storeAttachments(m.author_id, m.attachments, m.order_id);
        if (next.every((a, i) => a.dataUrl === m.attachments[i].dataUrl)) return false;
        await query('UPDATE order_messages SET attachments = $2::jsonb WHERE id = $1', [m.id, JSON.stringify(next)]);
        return true;
      });
    }
    for (const o of await query<{ id: string; seller_id: string; delivery: { note: string; at: string; files: any[] } }>(
      "SELECT id, seller_id, delivery FROM orders WHERE delivery::text LIKE '%\"dataUrl\":\"data:%' LIMIT $1",
      [BATCH]
    )) {
      await attempt(async () => {
        const files = await storeAttachments(o.seller_id, o.delivery.files, o.id);
        if (files.every((f, i) => f.dataUrl === o.delivery.files[i].dataUrl)) return false;
        await query('UPDATE orders SET delivery = $2::jsonb WHERE id = $1', [o.id, JSON.stringify({ ...o.delivery, files })]);
        return true;
      });
    }
  }

  if (await target('kyc')) {
    for (const d of await query<{ submission_id: string; kind: string; mime: string; data: Buffer; user_id: string }>(
      `SELECT d.submission_id, d.kind, d.mime, d.data, k.user_id FROM kyc_documents d JOIN kyc_submissions k ON k.id = d.submission_id WHERE d.data IS NOT NULL LIMIT $1`,
      [BATCH]
    )) {
      await attempt(async () => {
        const stored = await storeBytes('kyc', d.user_id, d.data, { name: `${d.kind}.${d.mime.split('/')[1] ?? 'bin'}`, mime: d.mime, ref: d.submission_id });
        if (!stored) return false;
        // Read back before the database copy is dropped: never lose a document.
        const back = await readStoredFile(stored.id);
        if (!back || back.bytes.length !== d.data.length) return false;
        await query('UPDATE kyc_documents SET file_id = $3, data = NULL WHERE submission_id = $1 AND kind = $2', [d.submission_id, d.kind, stored.id]);
        return true;
      });
    }
  }

  return { migrated, failed, remaining: await remaining() };
}
