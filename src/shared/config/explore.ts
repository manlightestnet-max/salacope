import { useSyncExternalStore } from 'react';

/**
 * How the Explorer ranks offers, set by the administration (Admin → Paramètres → Explorer). Every weight goes from 0 (not
 * used) to 10 (counts the most); the score of an offer is the sum of its signals, each one brought between 0 and 1.
 */
export interface ExploreWeights {
  /** Sales of the offer (paid, not cancelled). */
  sales: number;
  /** Visits of its page over 30 days. */
  views: number;
  /** People who saved it. */
  favorites: number;
  /** Rating of the store, weighed by its number of reviews. */
  rating: number;
  /** New offers first for `freshDays` days, so new creators are seen too. */
  freshness: number;
  /** What this visitor looked at, saved, followed, bought and searched (kept on their device). */
  taste: number;
  /** A small daily change for each visitor: the feed is never frozen and every offer gets its turn. */
  rotation: number;
}

export interface ExploreSettings {
  weights: ExploreWeights;
  freshDays: number;
  /** At most this many offers of the same store in a row. */
  sellerRun: number;
  /** "À la une": offers chosen by the administration, shown first in this order. */
  featured: string[];
}

export const DEFAULT_EXPLORE: ExploreSettings = {
  weights: { sales: 6, views: 3, favorites: 4, rating: 3, freshness: 5, taste: 6, rotation: 2 },
  freshDays: 14,
  sellerRun: 2,
  featured: [],
};

export const EXPLORE_WEIGHTS: { key: keyof ExploreWeights; label: string; help: string }[] = [
  { key: 'sales', label: 'Ventes', help: 'Les offres les plus achetées montent.' },
  { key: 'views', label: 'Visites', help: 'Les offres les plus regardées sur 30 jours montent.' },
  { key: 'favorites', label: 'Favoris', help: 'Les offres enregistrées par beaucoup de monde montent.' },
  { key: 'rating', label: 'Note de la boutique', help: 'Les boutiques bien notées montent ; peu d’avis comptent peu.' },
  { key: 'freshness', label: 'Nouveauté', help: 'Les nouvelles offres sont mises en avant, pour que les nouveaux créateurs soient vus.' },
  { key: 'taste', label: 'Goûts du visiteur', help: 'Ce que la personne a regardé, enregistré, suivi, acheté et cherché passe devant.' },
  { key: 'rotation', label: 'Rotation', help: 'Change un peu l’ordre chaque jour et pour chaque visiteur : chaque offre a son tour.' },
];

const weight = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(10, Math.max(0, Math.round(v))) : fallback);
const whole = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback);

/** Settings that make sense, whatever was sent (the server checks with it, the app reads with it). */
export function cleanExplore(input: unknown): ExploreSettings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<ExploreSettings>;
  const w = (s.weights ?? {}) as Partial<ExploreWeights>;
  return {
    weights: Object.fromEntries(Object.entries(DEFAULT_EXPLORE.weights).map(([k, d]) => [k, weight(w[k as keyof ExploreWeights], d)])) as unknown as ExploreWeights,
    freshDays: whole(s.freshDays, 1, 90, DEFAULT_EXPLORE.freshDays),
    sellerRun: whole(s.sellerRun, 1, 10, DEFAULT_EXPLORE.sellerRun),
    featured: [...new Set((Array.isArray(s.featured) ? s.featured : []).filter((id): id is string => typeof id === 'string' && /^[\w-]{3,60}$/.test(id)))].slice(0, 12),
  };
}

let current: ExploreSettings = DEFAULT_EXPLORE;
const listeners = new Set<() => void>();

/** What the server sent (it arrives with the catalogue). */
export function applyExplore(next?: unknown) {
  if (!next) return;
  const clean = cleanExplore(next);
  if (JSON.stringify(clean) === JSON.stringify(current)) return;
  current = clean;
  listeners.forEach((l) => l());
}

export const exploreSettings = () => current;

export const useExploreSettings = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current
  );
