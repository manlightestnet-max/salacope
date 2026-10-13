import type { Category, Listing } from '../db/schema';
import { stem, words } from './text';

/**
 * What this person looked at, chose and searched, kept on this device only (never sent anywhere): the Explorer uses it to
 * put first what matches their interests. Older interests fade (half every two weeks), so the feed follows the person.
 * Without any history, nothing is guessed: the Explorer ranks by the catalogue's own signals.
 */
export interface Taste {
  categories: Partial<Record<Category, number>>;
  sellers: Record<string, number>;
  words: Record<string, number>;
  /** Offers opened, with the last time (ms): seen too often, they make room for others. */
  seen: Record<string, number>;
  at: number;
}

const KEY = 'salacope.taste';
const HALF_LIFE_DAYS = 14;
const MAX_WORDS = 80;
const MAX_SELLERS = 40;
const MAX_SEEN = 200;

const empty = (): Taste => ({ categories: {}, sellers: {}, words: {}, seen: {}, at: Date.now() });

let cached: Taste | null = null;
const listeners = new Set<() => void>();

const decay = (t: Taste): Taste => {
  const days = (Date.now() - t.at) / 86_400_000;
  if (days < 0.5) return t;
  const f = Math.pow(0.5, days / HALF_LIFE_DAYS);
  const scale = <K extends string>(m: Partial<Record<K, number>>) =>
    Object.fromEntries(Object.entries(m as Record<string, number>).map(([k, v]) => [k, v * f]).filter(([, v]) => (v as number) > 0.05)) as Record<K, number>;
  return { categories: scale(t.categories), sellers: scale(t.sellers), words: scale(t.words), seen: t.seen, at: Date.now() };
};

const top = (m: Record<string, number>, n: number) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n));

export function readTaste(): Taste {
  if (cached) return cached;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    cached = raw && typeof raw === 'object' ? decay({ ...empty(), ...raw }) : empty();
  } catch {
    cached = empty();
  }
  return cached;
}

const save = (t: Taste) => {
  cached = t;
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // full or private window: kept for this visit
  }
  listeners.forEach((l) => l());
};

/** How much each gesture says about an interest: buying says more than a glance. */
const WEIGHT = { view: 1, click: 3, like: 4, follow: 4, buy: 6 } as const;
export type TasteGesture = keyof typeof WEIGHT;

export function noteListing(listing: Pick<Listing, 'id' | 'category' | 'sellerId' | 'title' | 'features'>, gesture: TasteGesture) {
  const t = readTaste();
  const w = WEIGHT[gesture];
  const next: Taste = {
    ...t,
    categories: { ...t.categories, [listing.category]: (t.categories[listing.category] ?? 0) + w },
    sellers: top({ ...t.sellers, [listing.sellerId]: (t.sellers[listing.sellerId] ?? 0) + w }, MAX_SELLERS),
    words: { ...t.words },
    seen: gesture === 'view' ? { ...t.seen, [listing.id]: Date.now() } : t.seen,
  };
  for (const word of words(`${listing.title} ${(listing.features ?? []).slice(0, 4).join(' ')}`)) next.words[stem(word)] = (next.words[stem(word)] ?? 0) + w * 0.5;
  next.words = top(next.words, MAX_WORDS);
  if (Object.keys(next.seen).length > MAX_SEEN) next.seen = top(next.seen, MAX_SEEN);
  save(next);
}

export function noteSearch(text: string) {
  const t = readTaste();
  const next = { ...t, words: { ...t.words } };
  for (const word of words(text)) next.words[stem(word)] = (next.words[stem(word)] ?? 0) + 2;
  next.words = top(next.words, MAX_WORDS);
  save(next);
}

/** Forgets everything this device learnt (offered in the cookie policy). */
export function clearTaste() {
  save(empty());
}

export const subscribeTaste = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
