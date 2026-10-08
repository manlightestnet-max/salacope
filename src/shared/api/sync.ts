import { useEffect, useSyncExternalStore } from 'react';
import { Database, db, emptyDatabase } from '@/shared/db';
import { auth } from './auth';
import { guest } from './guest';
import { request } from './client';

/**
 * Loads the data at start and keeps it current: a light sync every 30 s,
 * every few seconds while a conversation is open, and when the tab comes back.
 */
export type BootStatus = 'loading' | 'ready' | 'offline';

let status: BootStatus = 'loading';
let lastSync: string | null = null;
// The catalogue as the server last described it (a fingerprint) and when this device last asked.
let catalogVersion: string | null = null;
let catalogAt = 0;
let catalogRequest: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const setStatus = (s: BootStatus) => {
  status = s;
  notify();
};

interface BootstrapResponse {
  userId: string | null;
  catalogVersion?: string;
  needsAccount: boolean;
  serverTime: string;
  data: Omit<Database, 'sessionUserId'>;
}

/**
 * Last view of the data, kept on this device for signed-in accounts only (removed at sign-out):
 * the app opens on it at once, the server answer then replaces it in the background.
 */
const SNAPSHOT = 'salacope.snapshot';
const readSnapshot = (): { userId: string; data: Omit<Database, 'sessionUserId'> } | null => {
  const uid = auth.uid();
  if (!uid) return null;
  try {
    const s = JSON.parse(localStorage.getItem(SNAPSHOT) ?? 'null');
    return s?.uid === uid && s.userId && s.data ? s : null;
  } catch {
    return null;
  }
};
const writeSnapshot = (userId: string | null, data: unknown) => {
  const uid = auth.uid();
  try {
    if (uid && userId) localStorage.setItem(SNAPSHOT, JSON.stringify({ uid, userId, data }));
    else localStorage.removeItem(SNAPSHOT);
  } catch {
    // full or private window: next start simply waits for the server
  }
};

/** (Re)loads everything for the current identity. */
export async function boot(): Promise<void> {
  try {
    // A visitor (no account, no guest profile) asks for the copy every visitor shares, which the CDN may keep a few seconds.
    const visitor = !auth.signedIn() && !guest.key();
    let res = await request<BootstrapResponse>('GET', visitor ? '/bootstrap?anon=1' : '/bootstrap');
    if (res.needsAccount) {
      // Signed in to LightPay/Firebase but never used Salacope: the account is created now.
      await request('POST', '/session', {});
      guest.clear();
      res = await request<BootstrapResponse>('GET', '/bootstrap');
    }
    // A guest key nobody holds any more (taken over by an account): forget it.
    if (!res.userId && !auth.signedIn() && guest.key()) guest.clear();
    db.load({ ...emptyDatabase(), ...res.data, sessionUserId: res.userId });
    lastSync = res.serverTime;
    catalogVersion = res.catalogVersion ?? null;
    catalogAt = Date.now();
    writeSnapshot(res.userId, res.data);
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

/**
 * Brings the catalogue (offers, stores, sales, reviews) up to date with the database. It asks with the fingerprint it
 * knows, so when nothing changed the answer is a few bytes and nothing is redrawn; otherwise the data is replaced in
 * place. Called when a screen that shows offers opens (and when the tab comes back), at most every 12 s unless `force`.
 */
export function refreshCatalog(force = false): Promise<void> {
  if (status !== 'ready') return Promise.resolve();
  if (!force && Date.now() - catalogAt < 12_000) return Promise.resolve();
  if (catalogRequest) return catalogRequest;
  catalogRequest = request<{ unchanged?: boolean; version: string; data?: Pick<Database, 'users' | 'listings' | 'stats' | 'reviews'> }>(
    'GET',
    `/catalog?${[catalogVersion ? `v=${encodeURIComponent(catalogVersion)}` : '', !auth.signedIn() && !guest.key() ? 'anon=1' : ''].filter(Boolean).join('&')}`
  )
    .then((res) => {
      catalogAt = Date.now();
      if (res.unchanged || !res.data) return;
      catalogVersion = res.version;
      const { users, listings, stats, reviews } = res.data;
      db.update((s) => ({ ...s, users, listings, stats, reviews }));
    })
    .catch(() => undefined)
    .finally(() => {
      catalogRequest = null;
    });
  return catalogRequest;
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

/** Shows the last known data before the server answers (first start only). Returns whether it did. */
export function showSnapshot(): boolean {
  if (status !== 'loading') return false;
  const s = readSnapshot();
  if (!s) return false;
  db.load({ ...emptyDatabase(), ...s.data, sessionUserId: s.userId });
  setStatus('ready');
  return true;
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

/**
 * Screens that show offers call this: the catalogue is checked against the database when they open (`force`: right now,
 * for an offer or a search) and when the tab comes back. What is on screen stays until the fresh data replaces it.
 */
export function useFreshCatalog(force = false, key?: string) {
  useEffect(() => {
    void refreshCatalog(force);
    const onVisible = () => document.visibilityState === 'visible' && void refreshCatalog();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [force, key]);
}

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
