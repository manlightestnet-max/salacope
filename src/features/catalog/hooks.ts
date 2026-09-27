import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Category, Database, useDb } from '@/shared/db';
import { CatalogQuery, CatalogSort, ListingView } from './model';

const buildViews = (s: Database, predicate: (l: Database['listings'][number]) => boolean): ListingView[] => {
  const sales = new Map<string, number>();
  s.orders.forEach((o) => {
    if (o.status !== 'cancelled') sales.set(o.listingId, (sales.get(o.listingId) ?? 0) + 1);
  });
  return s.listings.filter(predicate).map((listing) => ({
    listing,
    seller: s.users.find((u) => u.id === listing.sellerId),
    salesCount: sales.get(listing.id) ?? 0,
  }));
};

/** Everything a visitor can buy. */
export const usePublishedListings = () => useDb((s) => buildViews(s, (l) => l.status === 'published'));

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
      sort: (params.get('sort') as CatalogSort) || 'popular',
      minPrice: num('min'),
      maxPrice: num('max'),
    };
  }, [params]);

  const setQuery = useCallback(
    (patch: Partial<Record<'q' | 'cat' | 'sort' | 'min' | 'max', string | undefined>>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (!value || (key === 'sort' && value === 'popular')) next.delete(key);
        else next.set(key, value);
      });
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const hasFilters = Boolean(query.text || query.category || query.minPrice || query.maxPrice);

  return { query, setQuery, hasFilters, params };
}
