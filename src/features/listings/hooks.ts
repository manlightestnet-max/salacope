import { useEffect, useState } from 'react';
import { Listing, useDb } from '@/shared/db';
import { cacheKey, cached, remember } from '@/shared/hooks';
import type { Analytics, DateRange } from '@/shared/domain';
import { ListingInsight, fetchAnalytics, fetchInsights } from '@/features/catalog';

export interface ManagedListing {
  listing: Listing;
  sales: number;
  revenue: number;
}

/** A seller's own listings (all statuses) with sales figures. */
export const useManagedListings = (sellerId: string): ManagedListing[] =>
  useDb(
    (s) =>
      s.listings
        .filter((l) => l.sellerId === sellerId)
        .map((listing) => {
          const orders = s.orders.filter((o) => o.listingId === listing.id && o.status !== 'cancelled');
          return { listing, sales: orders.length, revenue: orders.reduce((sum, o) => sum + o.amounts.net, 0) };
        })
        .sort((a, b) => b.listing.updatedAt.localeCompare(a.listing.updatedAt)),
    [sellerId]
  );

export const useManagedListing = (listingId: string | undefined, sellerId: string) =>
  useDb((s) => s.listings.find((l) => l.id === listingId && l.sellerId === sellerId), [listingId, sellerId]);

/** Views and clicks per offer (counted by the server), `null` while they load. */
export function useListingInsights(): Map<string, ListingInsight> | null {
  const [insights, setInsights] = useState<Map<string, ListingInsight> | null>(null);
  useEffect(() => {
    let live = true;
    void fetchInsights()
      .then((rows) => live && setInsights(new Map(rows.map((r) => [r.id, r]))))
      .catch(() => live && setInsights(new Map()));
    return () => {
      live = false;
    };
  }, []);
  return insights;
}

/**
 * What the server counted for the seller over a period: offer views and clicks, and store page visits, day by day. The last
 * answer of each period is kept (coming back to the dashboard shows it at once, then it is checked again); `counted` is
 * `undefined` only the first time, `failed` if it cannot be read.
 */
export function useSellerAnalytics(range: DateRange): { counted: Analytics | undefined; failed: boolean } {
  const key = cacheKey('analytics', [range.from, range.to]);
  const [counted, setCounted] = useState<Analytics | undefined>(() => cached<Analytics>(key));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setCounted(cached<Analytics>(key));
    setFailed(false);
    fetchAnalytics(range).then(
      (r) => {
        remember(key, r);
        if (live) setCounted(r);
      },
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { counted, failed };
}
