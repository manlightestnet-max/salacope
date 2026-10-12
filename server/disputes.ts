import { ROUTES } from '../src/shared/config/routes.js';
import type { Query } from './db.js';
import { newId } from './ids.js';
import { formatXaf, OrderRow } from './orders.js';
import { notify } from './notify.js';

/** The dispute room of an order: opened with the dispute, closed by the decision (see routes/disputes.ts). */

export const disputeLabel = (n: number) => `Litige ${String(n).padStart(2, '0')}`;

/** Opens the room with the buyer's reason as its first message; the seller is told where it is. */
export async function openDisputeRoom(q: Query, row: OrderRow, openedBy: string, reason: string): Promise<string> {
  const [existing] = await q('SELECT id FROM disputes WHERE order_id = $1', [row.id]);
  if (existing) return existing.id as string;
  const [{ n }] = await q<{ n: number }>("SELECT nextval('dispute_number_seq') AS n");
  const id = newId('dsp');
  const at = new Date().toISOString();
  await q('INSERT INTO disputes (id, number, order_id, opened_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)', [id, n, row.id, openedBy, at]);
  await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body, at) VALUES ($1, $2, $3, $4, $5)', [newId('dmg'), id, openedBy, reason, at]);
  await q('INSERT INTO dispute_reads (dispute_id, user_id, read_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, openedBy, at]);
  await notify(q, [{ userId: row.seller_id, title: `${disputeLabel(n)} · ${row.number}`, body: reason, href: ROUTES.seller.dispute(id) }]);
  return id;
}

/** The decision closes the room: Salacope's last message says what was decided and why. */
export async function closeDisputeRoom(q: Query, orderId: string, outcome: 'seller' | 'buyer', reason: string, amount: number) {
  const [d] = await q('UPDATE disputes SET status = \'resolved\', outcome = $2, closed_at = NOW(), updated_at = NOW() WHERE order_id = $1 AND status = \'open\' RETURNING id', [orderId, outcome]);
  if (!d) return;
  const text =
    outcome === 'seller'
      ? `Décision de Salacope : le vendeur est payé. ${reason}`
      : `Décision de Salacope : l’acheteur est remboursé de ${formatXaf(amount)}. ${reason}`;
  await q('INSERT INTO dispute_messages (id, dispute_id, author_id, body) VALUES ($1, $2, NULL, $3)', [newId('dmg'), d.id, text]);
}
