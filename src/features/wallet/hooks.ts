import { useDb } from '@/shared/db';
import { PLATFORM } from '@/shared/config/platform';
import { buildLedger, computeBalance, upcomingReleases } from './model';

export function useWallet(sellerId: string) {
  return useDb(
    (s) => {
      const orders = s.orders.filter((o) => o.sellerId === sellerId);
      const withdrawals = s.withdrawals.filter((w) => w.sellerId === sellerId);
      return {
        balance: computeBalance(orders, withdrawals),
        ledger: buildLedger(orders, withdrawals),
        releases: upcomingReleases(orders, PLATFORM.escrowDays),
        withdrawals,
      };
    },
    [sellerId]
  );
}
