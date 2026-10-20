import crypto from 'node:crypto';
import { query } from './db.js';
import { addressOf } from './ratelimit.js';

/** Crawlers, link previews and scripts: they are not visitors. */
const NOT_A_VISITOR = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python-requests|httpclient|go-http/i;

/**
 * True the first time this visitor is seen today for this page (`kind` + `target`), false for the next ones and for anything
 * that is not a person. The visitor is a hash of address, browser and day: it cannot be traced back and is dropped after two days.
 */
export async function firstSight(kind: 'view' | 'click' | 'store', target: string, headers: Headers): Promise<boolean> {
  const agent = headers.get('user-agent') ?? '';
  if (!agent || NOT_A_VISITOR.test(agent)) return false;
  const today = new Date().toISOString().slice(0, 10);
  const visitor = crypto.createHash('sha256').update(`${addressOf(headers)}|${agent}|${today}`).digest('hex').slice(0, 32);
  const rows = await query('INSERT INTO visit_seen (kind, target, visitor) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING 1', [kind, target, visitor]);
  if (Math.random() < 0.02) void query("DELETE FROM visit_seen WHERE day < CURRENT_DATE - 2").catch(() => undefined);
  return rows.length > 0;
}
