import { Order, Withdrawal } from '@/shared/db';
import { fundsState } from '@/features/orders';

export interface Balance {
  /** Released sales minus withdrawals: can be withdrawn now. */
  available: number;
  /** Paid orders not yet confirmed by the buyer. */
  escrow: number;
  /** Orders under dispute. */
  frozen: number;
  /** Withdrawals requested, not yet paid out. */
  pendingWithdrawals: number;
  /** Total sent to the seller's Mobile Money account. */
  paidOut: number;
}

export const computeBalance = (orders: Order[], withdrawals: Withdrawal[]): Balance => {
  const sum = (list: Order[]) => list.reduce((s, o) => s + o.amounts.net, 0);
  const released = sum(orders.filter((o) => fundsState(o.status) === 'released'));
  const reserved = withdrawals.filter((w) => w.status !== 'rejected').reduce((s, w) => s + w.amountXaf, 0);
  return {
    available: Math.max(0, released - reserved),
    escrow: sum(orders.filter((o) => fundsState(o.status) === 'escrow')),
    frozen: sum(orders.filter((o) => fundsState(o.status) === 'frozen')),
    pendingWithdrawals: withdrawals.filter((w) => w.status === 'pending').reduce((s, w) => s + w.amountXaf, 0),
    paidOut: withdrawals.filter((w) => w.status === 'paid').reduce((s, w) => s + w.amountXaf, 0),
  };
};

export interface LedgerEntry {
  id: string;
  at: string;
  label: string;
  detail: string;
  amount: number;
  status: 'credited' | 'pending' | 'paid' | 'rejected';
  href?: string;
}

/** Money movements on the seller balance: released sales (+) and withdrawals (−). */
export const buildLedger = (orders: Order[], withdrawals: Withdrawal[]): LedgerEntry[] => {
  const sales: LedgerEntry[] = orders
    .filter((o) => o.status === 'completed')
    .map((o) => {
      const releasedAt = [...o.events].reverse().find((e) => e.type === 'completed' || e.type === 'auto_completed')?.at ?? o.updatedAt;
      return {
        id: o.id,
        at: releasedAt,
        label: `Vente ${o.number}`,
        detail: o.item.title,
        amount: o.amounts.net,
        status: 'credited' as const,
      };
    });
  const payouts: LedgerEntry[] = withdrawals.map((w) => ({
    id: w.id,
    at: w.createdAt,
    label: `Retrait ${w.reference}`,
    detail: w.phone,
    amount: -w.amountXaf,
    status: w.status,
  }));
  return [...sales, ...payouts].sort((a, b) => b.at.localeCompare(a.at));
};

export interface UpcomingRelease {
  order: Order;
  /** When the funds become available; estimated while the service is not delivered yet. */
  at?: string;
  estimated: boolean;
}

const DAY = 86_400_000;

/** Money still held, soonest first: delivered orders have a firm date, services in progress an estimate. */
export const upcomingReleases = (orders: Order[], escrowDays: number): UpcomingRelease[] =>
  orders
    .filter((o) => fundsState(o.status) === 'escrow')
    .map((order) => {
      if (order.status === 'delivered') return { order, at: order.releaseAt, estimated: false };
      if (order.status === 'in_progress' && order.dueAt) {
        return { order, at: new Date(new Date(order.dueAt).getTime() + escrowDays * DAY).toISOString(), estimated: true };
      }
      return { order, estimated: true };
    })
    .sort((a, b) => (a.at ?? '9999').localeCompare(b.at ?? '9999'));
