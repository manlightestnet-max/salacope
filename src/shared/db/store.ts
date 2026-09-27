import { useMemo, useSyncExternalStore } from 'react';
import { Database } from './schema';
import { createSeed } from './seed';

/**
 * Local, persisted database used while there is no backend.
 * All writes go through feature services (`features/x/api.ts`), which are the
 * seam to replace with HTTP calls later. Tabs stay in sync via the storage event.
 */
const KEY = 'salacope.db.v4';
/** Keys of earlier versions, newest first: their data is migrated, then removed. */
const PREVIOUS_KEYS = ['salacope.db.v3', 'salacope.db.v2'];
const LEGACY_KEYS = [
  'salacope_is_authenticated',
  'salacope_user',
  'salacope_favorites',
  'salacope_following',
  'salacope_purchases',
  'salacope_services',
  'salacope_digital_products',
  'salacope_orders',
  'salacope_withdrawals',
  'salacope_purchases_view_mode',
];

const byId = <T extends { id: string }>(current: T[], additions: T[]) => {
  const known = new Set(current.map((row) => row.id));
  return [...current, ...additions.filter((row) => !known.has(row.id))];
};

/**
 * Brings older local data to the current version. The visitor's own data is kept;
 * demo rows added since (seed ids are stable) and new listing settings are merged in.
 */
const migrate = (previous: Partial<Database> & Pick<Database, 'users' | 'listings' | 'orders'>): Database => {
  const seed = createSeed();
  const seedOrders = new Map(seed.orders.map((o) => [o.id, o]));
  // Demo orders from an older seed get the fields added since (payment code, brief, revisions).
  const upgraded = previous.orders.map((o) => {
    const fromSeed = seedOrders.get(o.id);
    if (!fromSeed) return o;
    return {
      ...o,
      item: { ...o.item, revisions: o.item.revisions ?? fromSeed.item.revisions },
      payment: { ...o.payment, code: o.payment.code ?? fromSeed.payment.code },
      brief: o.brief ?? fromSeed.brief,
    };
  });
  const orders = byId(upgraded, seed.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orderIds = new Set(orders.map((o) => o.id));
  const seedListings = new Map(seed.listings.map((l) => [l.id, l]));
  return {
    ...seed,
    ...previous,
    version: 4,
    listings: previous.listings.map((l) => {
      const fromSeed = seedListings.get(l.id);
      return l.kind === 'service' && fromSeed && l.briefQuestions === undefined
        ? { ...l, revisions: fromSeed.revisions, briefQuestions: fromSeed.briefQuestions }
        : l;
    }),
    orders,
    reviews: byId(previous.reviews ?? [], seed.reviews.filter((r) => orderIds.has(r.orderId))),
    paymentAttempts: byId(previous.paymentAttempts ?? [], seed.paymentAttempts),
    tickets: byId(previous.tickets ?? [], seed.tickets),
    notifications: byId(previous.notifications ?? [], seed.notifications),
  };
};

const load = (): Database => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed.version === 4) return parsed;
    }
    for (const key of PREVIOUS_KEYS) {
      const previous = localStorage.getItem(key);
      if (!previous) continue;
      localStorage.removeItem(key);
      return migrate(JSON.parse(previous));
    }
  } catch {
    // fall through to seed
  }
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  return createSeed();
};

let state: Database = load();
const listeners = new Set<() => void>();

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded (large attachments): keep working in memory.
  }
};
persist();

const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      state = JSON.parse(e.newValue);
      emit();
    }
  });
}

export const db = {
  get: (): Database => state,

  /** Applies an immutable update and notifies subscribers. */
  update(recipe: (current: Database) => Database): void {
    state = recipe(state);
    persist();
    emit();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Wipes local data and reloads the demo dataset. */
  reset(): void {
    state = createSeed();
    persist();
    emit();
  },
};

/** Reactive read: re-renders when the database changes. */
export function useDb<T>(selector: (state: Database) => T, deps: unknown[] = []): T {
  const snapshot = useSyncExternalStore(db.subscribe, db.get);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(snapshot), [snapshot, ...deps]);
}

/** Replaces the row with the same id. */
export const replaceById = <T extends { id: string }>(rows: T[], id: string, update: (row: T) => T): T[] =>
  rows.map((row) => (row.id === id ? update(row) : row));
