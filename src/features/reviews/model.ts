import { Stats } from '@/shared/db';

export { REVIEW_MAX_LENGTH, canBeReviewed } from '@/shared/domain';

export interface SellerStats {
  /** Average stars, 0 while unrated. */
  rating: number;
  reviews: number;
  completedSales: number;
}

/** A creator promoted on the storefront: proven sales and well rated by several buyers. */
export const TOP_CREATOR = { minCompletedSales: 2, minReviews: 2, minRating: 4 } as const;

export const isTopCreator = (s: SellerStats | undefined): s is SellerStats =>
  Boolean(
    s &&
      s.completedSales >= TOP_CREATOR.minCompletedSales &&
      s.reviews >= TOP_CREATOR.minReviews &&
      s.rating >= TOP_CREATOR.minRating
  );

const EMPTY: SellerStats = { rating: 0, reviews: 0, completedSales: 0 };

/** Public figures of a store, computed by the server. */
export const sellerStatsOf = (stats: Stats, sellerId: string): SellerStats => {
  const s = stats.sellers[sellerId];
  return s ? { rating: s.rating, reviews: s.reviews, completedSales: s.completedSales } : EMPTY;
};

/** "4,5" */
export const formatRating = (rating: number) =>
  rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
