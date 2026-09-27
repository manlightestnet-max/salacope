import { useEffect, useSyncExternalStore } from 'react';
import { Database, db, emptyDatabase } from '@/shared/db';
import { auth } from './auth';
import { request } from './client';

/**
 * Loads the data at start and keeps it current: a light sync every 30 s,
 * every few seconds while a conversation is open, and when the tab comes back.
 */
export type BootStatus = 'loading' | 'ready' | 'offline';

let status: BootStatus = 'loading';
let lastSync: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const setStatus = (s: BootStatus) => {
  status = s;
  notify();
};

interface BootstrapResponse {
  userId: string | null;
  needsAccount: boolean;
  serverTime: string;
  data: Omit<Database, 'sessionUserId'>;
}

/** (Re)loads everything for the current identity. */
export async function boot(): Promise<void> {
  try {
    let res = await request<BootstrapResponse>('GET', '/bootstrap');
    if (res.needsAccount) {
      // Signed in to LightPay/Firebase but never used Salacope: the account is created now.
      await request('POST', '/session', {});
      res = await request<BootstrapResponse>('GET', '/bootstrap');
    }
    db.load({ ...emptyDatabase(), ...res.data, sessionUserId: res.userId });
    lastSync = res.serverTime;
    setStatus('ready');
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      auth.signOut();
      return boot();
    }
    if (status === 'loading') setStatus('offline');
    throw err;
  }
}

/** Fetches what changed since the last sync (orders, messages, notifications…). */
export async function syncNow(): Promise<void> {
  if (!lastSync || !db.get().sessionUserId) return;
  try {
    const res = await request<{ serverTime: string; patch: any }>('GET', `/sync?since=${encodeURIComponent(lastSync)}`);
    db.apply(res.patch);
    lastSync = res.serverTime;
    notify();
  } catch {
    // next tick
  }
}

export const useBootStatus = () => useSyncExternalStore(subscribe, () => status);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** When the data was last refreshed from the server (ISO), for "Données à jour à …". */
export const useLastSync = () => useSyncExternalStore(subscribe, () => lastSync);

/** Keeps data fresh while mounted; `fast` for live screens (order chat). */
export function useLiveSync(fast = false) {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    const id = setInterval(tick, fast ? 4_000 : 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fast]);
}
