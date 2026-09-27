import { useCallback, useEffect, useState } from 'react';
import { useDb } from '@/shared/db';
import { PLATFORM } from '@/shared/config/platform';
import { LightPayWallet, fetchLightPayWallet } from './api';
import { buildLedger, computeBalance, upcomingReleases } from './model';

export function useWallet(sellerId: string) {
  return useDb(
    (s) => {
      const orders = s.orders.filter((o) => o.sellerId === sellerId);
      return {
        balance: computeBalance(orders),
        ledger: buildLedger(orders),
        releases: upcomingReleases(orders, PLATFORM.escrowDays),
      };
    },
    [sellerId]
  );
}

/** Live LightPay balance; `error` when LightPay cannot be reached. */
export function useLightPayWallet() {
  const [wallet, setWallet] = useState<LightPayWallet>();
  const [error, setError] = useState<string>();
  const load = useCallback(() => {
    setError(undefined);
    fetchLightPayWallet().then(setWallet, (err) => setError((err as Error).message));
  }, []);
  useEffect(load, [load]);
  return { wallet, error, reload: load };
}
