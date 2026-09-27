import { Order } from '@/shared/db';
import { fundsState } from '@/features/orders';

/** The seller's sales, by where the money is. Payouts themselves happen on LightPay. */
export interface SalesBalance {
  /** Paid orders not yet validated: held by LightPay. */
  escrow: number;
  /** Orders under dispute: frozen by LightPay. */
  frozen: number;
  /** Validated sales, paid into the seller's LightPay wallet. */
  released: number;
}

export const computeBalance = (orders: Order[]): SalesBalance => {
  const sum = (list: Order[]) => list.reduce((s, o) => s + o.amounts.net, 0);
  return {
    escrow: sum(orders.filter((o) => fundsState(o.status) === 'escrow')),
    frozen: sum(orders.filter((o) => fundsState(o.status) === 'frozen')),
    released: sum(orders.filter((o) => fundsState(o.status) === 'released')),
  };
};

export interface LedgerEntry {
  id: string;
  at: string;
  label: string;
  detail: string;
  amount: number;
}

/** Sales paid into the LightPay wallet, newest first. */
export const buildLedger = (orders: Order[]): LedgerEntry[] =>
  orders
    .filter((o) => o.status === 'completed')
    .map((o) => ({
      id: o.id,
      at: [...o.events].reverse().find((e) => e.type === 'completed' || e.type === 'auto_completed')?.at ?? o.updatedAt,
      label: `Vente ${o.number}`,
      detail: o.item.title,
      amount: o.amounts.net,
    }))
    .sort((a, b) => b.at.localeCompare(a.at));

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
