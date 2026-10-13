import { query } from './db.js';
import { flushGuestMail } from './mail.js';
import { pushReady, sendPush } from './push.js';

/**
 * What leaves Salacope after a change, once its transaction is committed: the push of each new notification to the
 * person's phones, and a guest's e-mail. Each notification is marked first, so two servers never send it twice; one that
 * could not leave is not tried again (it is still in the app).
 */
let pushing: Promise<void> | null = null;
let lastPush = 0;

function flushPushes(): Promise<void> {
  if (!pushReady()) return Promise.resolve();
  if (!pushing && Date.now() - lastPush < 1500) return Promise.resolve();
  pushing ??= (async () => {
    lastPush = Date.now();
    try {
      const rows = await query<{ id: string; user_id: string; title: string; body: string | null; href: string }>(
        `UPDATE notifications n SET pushed_at = NOW()
         WHERE n.id IN (
           SELECT n2.id FROM notifications n2
           WHERE n2.push AND n2.pushed_at IS NULL AND n2.created_at > NOW() - interval '1 day'
             AND EXISTS (SELECT 1 FROM push_devices d WHERE d.user_id = n2.user_id)
           ORDER BY n2.created_at LIMIT 25 FOR UPDATE SKIP LOCKED)
         RETURNING n.id, n.user_id, n.title, n.body, n.href`
      );
      if (!rows.length) return;
      const devices = await query<{ token: string; user_id: string }>('SELECT token, user_id FROM push_devices WHERE user_id = ANY($1)', [[...new Set(rows.map((r) => r.user_id))]]);
      const gone = new Set<string>();
      await Promise.all(
        rows.flatMap((n) =>
          devices
            .filter((d) => d.user_id === n.user_id)
            .map(async (d) => {
              const r = await sendPush(d.token, { title: n.title, body: n.body ?? '', route: n.href, tag: n.id });
              if (r === 'invalid_token') gone.add(d.token);
            })
        )
      );
      // A phone that uninstalled the app (or signed out without saying it): forgotten.
      if (gone.size) await query('DELETE FROM push_devices WHERE token = ANY($1)', [[...gone]]);
    } catch (err: any) {
      console.error('[push] outbox', err?.message); // not migrated yet: nothing to push
    } finally {
      pushing = null;
    }
  })();
  return pushing;
}

export const flushOutbox = (origin: string) => Promise.all([flushPushes(), flushGuestMail(origin)]).then(() => undefined);
