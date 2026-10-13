import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Category, Database, ListingKind, useDb } from '@/shared/db';
import { useExploreSettings } from '@/shared/config/explore';
import { readTaste } from '@/shared/lib';
import { CatalogQuery, CatalogSort, ListingView } from './model';
import { RankContext } from './ranking';

const buildViews = (s: Database, predicate: (l: Database['listings'][number]) => boolean): ListingView[] =>
  s.listings.filter(predicate).map((listing) => ({
    listing,
    seller: s.users.find((u) => u.id === listing.sellerId),
    salesCount: s.stats.listings[listing.id] ?? 0,
  }));

/**
 * Everything a visitor can buy in the catalogue. Offers of a private store (opened by its link in this tab) never mix with
 * the catalogue; `includePrivate` keeps them where the person put them themselves (favourites).
 */
export const usePublishedListings = (includePrivate = false) =>
  useDb((s) => {
    const hidden = includePrivate ? null : new Set(s.users.filter((u) => u.merchant?.private).map((u) => u.id));
    return buildViews(s, (l) => l.status === 'published' && !hidden?.has(l.sellerId));
  }, [includePrivate]);

export const useListingView = (id: string | undefined): ListingView | undefined =>
  useDb((s) => buildViews(s, (l) => l.id === id)[0], [id]);

/** Published listings of one seller. */
export const useSellerListings = (sellerId: string | undefined) =>
  useDb((s) => buildViews(s, (l) => l.sellerId === sellerId && l.status === 'published'), [sellerId]);

/**
 * Catalogue filters live in the URL so results can be shared and survive reloads:
 * `?q=&cat=&sort=&min=&max=`.
 */
export function useCatalogQuery() {
  const [params, setParams] = useSearchParams();

  const query = useMemo<CatalogQuery>(() => {
    const num = (key: string) => {
      const n = parseInt(params.get(key) ?? '', 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      text: params.get('q') ?? '',
      category: (params.get('cat') as Category) || undefined,
      kind: (params.get('type') as ListingKind) || undefined,
      sort: (params.get('sort') as CatalogSort) || 'for_you',
      minPrice: num('min'),
      maxPrice: num('max'),
    };
  }, [params]);

  const setQuery = useCallback(
    (patch: Partial<Record<'q' | 'cat' | 'type' | 'sort' | 'min' | 'max', string | undefined>>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (!value || (key === 'sort' && value === 'for_you')) next.delete(key);
        else next.set(key, value);
      });
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const hasFilters = Boolean(query.text || query.category || query.kind || query.minPrice || query.maxPrice);

  return { query, setQuery, hasFilters, params };
}

/**
 * What the Explorer ranks with. The visitor's interests are read once per visit: opening an offer never reshuffles the
 * feed under their eyes (it counts from the next visit). The rotation changes once a day, per visitor.
 */
let visitTaste: ReturnType<typeof readTaste> | null = null;
const SEED = 'salacope.seed';
const deviceSeed = () => {
  try {
    let seed = localStorage.getItem(SEED);
    if (!seed) localStorage.setItem(SEED, (seed = Math.random().toString(36).slice(2)));
    return seed;
  } catch {
    return 'visitor';
  }
};

export function useRankContext(): RankContext {
  const settings = useExploreSettings();
  const parts = useDb((s) => {
    const me = s.sessionUserId;
    return {
      stats: s.stats,
      favorites: new Set(s.favorites.map((f) => f.listingId)),
      follows: new Set(s.follows.map((f) => f.sellerId)),
      bought: new Set(s.orders.filter((o) => o.buyerId === me && o.status !== 'cancelled').map((o) => o.listingId)),
      me,
    };
  });
  return useMemo(() => {
    visitTaste ??= readTaste();
    const day = new Date().toISOString().slice(0, 10);
    return { settings, taste: visitTaste, stats: parts.stats, favorites: parts.favorites, follows: parts.follows, bought: parts.bought, seed: `${day}:${parts.me ?? deviceSeed()}`, now: Date.now() };
  }, [settings, parts]);
}
