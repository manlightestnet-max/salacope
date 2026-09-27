import type { Query } from './db.js';
import { newId } from './ids.js';

export interface NotifyInput {
  userId: string;
  title: string;
  body?: string;
  href: string;
}

/** Written in the same transaction as the change it describes. */
export async function notify(q: Query, inputs: NotifyInput[]): Promise<void> {
  for (const n of inputs) {
    await q('INSERT INTO notifications (id, user_id, title, body, href) VALUES ($1, $2, $3, $4, $5)', [
      newId('ntf'),
      n.userId,
      n.title.slice(0, 200),
      n.body?.slice(0, 300) ?? null,
      n.href,
    ]);
  }
}
