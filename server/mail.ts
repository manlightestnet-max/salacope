import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ListingFile } from '../src/shared/db/schema.js';
import { filesOf } from '../src/shared/domain/listings.js';
import { currentIdentity } from './settings.js';
import { query } from './db.js';

/**
 * E-mails of Salacope, sent through Resend (RESEND_API_KEY; sender in SALACOPE_MAIL_FROM, e.g. "Salacope <commandes@salacope.online>").
 * Only guests get them: they have no account to open, so what Salacope would tell them in the app (their file is ready, a
 * message in a dispute, a decision) also goes to the e-mail they left at checkout. Without the key nothing is sent and
 * nothing fails: the notifications stay in the app.
 */
export const mailReady = () => Boolean(process.env.RESEND_API_KEY);

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendMail(to: string, subject: string, lines: string[], links: { label: string; url: string }[]): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.SALACOPE_MAIL_FROM || 'Salacope <commandes@salacope.online>';
  const text = [...lines, '', ...links.map((l) => `${l.label} : ${l.url}`), '', `— Salacope · ${currentIdentity().contactEmail}`].join('\n');
  // Plain, readable everywhere, no image to load: a title, the message, the links as buttons.
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#18181b;max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:17px;font-weight:600;margin:0 0 12px">${escape(subject)}</p>
${lines.map((l) => `<p style="margin:0 0 10px">${escape(l)}</p>`).join('\n')}
${links.map((l) => `<p style="margin:18px 0 0"><a href="${escape(l.url)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:999px">${escape(l.label)}</a></p>`).join('\n')}
<p style="margin:28px 0 0;font-size:12px;color:#71717a">Salacope · ${escape(currentIdentity().contactEmail)}. Ne partagez pas ces liens : ils donnent accès à votre achat.</p>
</div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  }).catch(() => null);
  if (!res?.ok) console.error('[mail]', res?.status, await res?.text().catch(() => ''));
  return Boolean(res?.ok);
}

// ---------------------------------------------------------------- download links

const linkSecret = () => process.env.SALACOPE_LINK_SECRET || process.env.SALACOPE_SETTINGS_KEY || '';
const DAY = 86_400_000;

const sign = (orderId: string, expires: number) => createHmac('sha256', linkSecret()).update(`download:${orderId}:${expires}`).digest('base64url');

/** A link that downloads the file of a paid order without signing in (sent to the guest's e-mail), valid 30 days. */
export function downloadLink(origin: string, orderId: string, fileId?: string): string | null {
  if (!linkSecret()) return null;
  const expires = Date.now() + 30 * DAY;
  // `f` only picks a file of the order (a product may have several): the server checks it belongs to the order.
  return `${origin}/api/orders/${encodeURIComponent(orderId)}/download?e=${expires}&t=${sign(orderId, expires)}${fileId ? `&f=${encodeURIComponent(fileId)}` : ''}`;
}

export function checkDownloadLink(orderId: string, expires: string | null, token: string | null): boolean {
  const e = Number(expires);
  if (!linkSecret() || !token || !Number.isFinite(e) || e < Date.now()) return false;
  const want = Buffer.from(sign(orderId, e));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

// ---------------------------------------------------------------- guests

let flushing: Promise<void> | null = null;
let lastFlush = 0;

/**
 * Sends guests the notifications they have not received by e-mail yet (a few at a time). Each one is marked first, so two
 * servers never send it twice; one that could not be sent is not tried again (it is still in the app).
 */
export function flushGuestMail(origin: string): Promise<void> {
  if (!mailReady()) return Promise.resolve();
  if (!flushing && Date.now() - lastFlush < 2000) return Promise.resolve();
  flushing ??= (async () => {
    lastFlush = Date.now();
    try {
      const rows = await query<{ id: string; title: string; body: string | null; href: string; email: string }>(
        `UPDATE notifications n SET mailed_at = NOW()
         FROM users u
         WHERE n.id IN (
           SELECT n2.id FROM notifications n2 JOIN users u2 ON u2.id = n2.user_id
           WHERE n2.mailed_at IS NULL AND u2.firebase_uid IS NULL AND u2.contact_email IS NOT NULL AND n2.created_at > NOW() - interval '1 day'
           ORDER BY n2.created_at LIMIT 10 FOR UPDATE OF n2 SKIP LOCKED)
           AND u.id = n.user_id
         RETURNING n.id, n.title, n.body, n.href, u.contact_email AS email`
      );
      for (const n of rows) {
        const orderId = n.href.match(/\/ac\/achats\/([^/?#]+)/)?.[1];
        const links: { label: string; url: string }[] = [];
        if (orderId) {
          const [o] = await query<{ kind: string; status: string; file: ListingFile | null }>("SELECT item->>'kind' AS kind, status, item->'file' AS file FROM orders WHERE id = $1", [orderId]);
          if (o?.kind === 'digital' && ['delivered', 'completed', 'disputed'].includes(o.status)) {
            // One link per file when the product has several (the first few; the rest is one tap away in the app).
            const files = filesOf(o.file).filter((f) => f.fileId);
            if (files.length > 1) {
              for (const f of files.slice(0, 5)) {
                const url = downloadLink(origin, orderId, f.fileId);
                if (url) links.push({ label: `Télécharger ${f.name}`, url });
              }
            } else {
              const url = downloadLink(origin, orderId);
              if (url) links.push({ label: 'Télécharger le fichier', url });
            }
          }
        }
        links.push({ label: 'Ouvrir sur Salacope', url: `${origin}${n.href}` });
        const lines = [n.body ?? '', 'Pour répondre, ouvrez Salacope sur l’appareil de votre achat, ou créez un compte avec cette adresse e-mail : vos achats vous suivent.'].filter(Boolean);
        await sendMail(n.email, n.title, lines, links).catch(() => false);
      }
    } catch (err: any) {
      console.error('[mail] guests', err?.message); // not migrated yet: nothing to send
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}
