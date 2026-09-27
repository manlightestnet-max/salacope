import { useMemo, useSyncExternalStore } from 'react';
import { Database } from './schema';

/**
 * In-memory copy of what the server lets this person see (catalogue, own orders…).
 * Filled by the bootstrap, then kept current by the rows each write returns and by the sync.
 * Screens read it synchronously with `useDb`; nothing is written here without the server.
 */
export const emptyDatabase = (): Database => ({
  sessionUserId: null,
  stats: { listings: {}, sellers: {} },
  users: [],
  listings: [],
  orders: [],
  favorites: [],
  follows: [],
  reviews: [],
  paymentAttempts: [],
  tickets: [],
  notifications: [],
});

type Collection = 'users' | 'listings' | 'orders' | 'favorites' | 'follows' | 'reviews' | 'paymentAttempts' | 'tickets' | 'notifications';

/** Rows that changed, by collection (upserted). */
export type Patch = Partial<Pick<Database, Collection>> & { stats?: Database['stats'] };
/** Keys of rows that no longer exist (favorites by listing id, follows by seller id). */
export type Removal = Partial<Record<Collection, string[]>>;

const keyOf: Record<Collection, (row: any) => string> = {
  users: (r) => r.id,
  listings: (r) => r.id,
  orders: (r) => r.id,
  favorites: (r) => r.listingId,
  follows: (r) => r.sellerId,
  reviews: (r) => r.id,
  paymentAttempts: (r) => r.id,
  tickets: (r) => r.id,
  notifications: (r) => r.id,
};

/** Newest first, like the server sends them. */
const ORDER_BY: Partial<Record<Collection, (a: any, b: any) => number>> = {
  orders: (a, b) => b.createdAt.localeCompare(a.createdAt),
  notifications: (a, b) => b.createdAt.localeCompare(a.createdAt),
  paymentAttempts: (a, b) => b.createdAt.localeCompare(a.createdAt),
  tickets: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  reviews: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

let state: Database = emptyDatabase();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const db = {
  get: (): Database => state,

  /** Replaces everything (bootstrap, sign-in, sign-out). */
  load(next: Database): void {
    state = next;
    emit();
  },

  /** Merges rows sent by the server. */
  apply(patch: Patch = {}, removed: Removal = {}): void {
    const next: Database = { ...state };
    (Object.keys(keyOf) as Collection[]).forEach((c) => {
      const rows = patch[c] as any[] | undefined;
      const gone = removed[c];
      if (!rows?.length && !gone?.length) return;
      const key = keyOf[c];
      const drop = new Set(gone ?? []);
      const incoming = new Map((rows ?? []).map((r) => [key(r), r]));
      const kept = (state[c] as any[]).filter((r) => !drop.has(key(r))).map((r) => incoming.get(key(r)) ?? r);
      const known = new Set(kept.map(key));
      const merged = [...kept, ...[...incoming.values()].filter((r) => !known.has(key(r)))];
      (next as any)[c] = ORDER_BY[c] ? merged.sort(ORDER_BY[c]) : merged;
    });
    if (patch.stats) next.stats = patch.stats;
    state = next;
    emit();
  },

  /** Local-only change (optimistic display); the server stays the reference. */
  update(recipe: (current: Database) => Database): void {
    state = recipe(state);
    emit();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Reactive read: re-renders when the data changes. */
export function useDb<T>(selector: (state: Database) => T, deps: unknown[] = []): T {
  const snapshot = useSyncExternalStore(db.subscribe, db.get);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(snapshot), [snapshot, ...deps]);
}

/** Replaces the row with the same id. */
export const replaceById = <T extends { id: string }>(rows: T[], id: string, update: (row: T) => T): T[] =>
  rows.map((row) => (row.id === id ? update(row) : row));
