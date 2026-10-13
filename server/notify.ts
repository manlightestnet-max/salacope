import type { Query } from './db.js';
import { newId } from './ids.js';
import { messageDef, fillTemplate } from '../src/shared/config/messages.js';
import { currentMessages } from './settings.js';

/**
 * One message to one person: a message template (src/shared/config/messages.ts, rewritable in Admin → Paramètres →
 * Messages) filled with its values. It lands in the app's notifications at once (same transaction as the change it
 * describes); its push to the phones and a guest's e-mail leave right after the answer (see outbox.ts).
 */
export interface NotifyInput {
  userId: string;
  event: string;
  vars?: Record<string, string | number | undefined | null>;
  href: string;
}

/** The text as the administration last wrote it (or the original), filled. Null when the message is turned off. */
export function renderMessage(event: string, vars: NotifyInput['vars'] = {}) {
  const base = messageDef(event);
  if (!base) throw new Error(`Unknown message ${event}`);
  const t = { ...base, ...(currentMessages()[event] ?? {}) };
  if (!t.enabled) return null;
  return { title: fillTemplate(t.title, vars) || fillTemplate(base.title, vars), body: fillTemplate(t.body, vars), push: t.push };
}

export async function notify(q: Query, inputs: NotifyInput[]): Promise<void> {
  for (const n of inputs) {
    const m = renderMessage(n.event, n.vars);
    if (!m) continue;
    await q('INSERT INTO notifications (id, user_id, title, body, href, push, event) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
      newId('ntf'),
      n.userId,
      m.title.slice(0, 200),
      m.body.slice(0, 300) || null,
      n.href,
      m.push,
      n.event,
    ]);
  }
}
