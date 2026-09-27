import { Listing, useDb } from '@/shared/db';

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
