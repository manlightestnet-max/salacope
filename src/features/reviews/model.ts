import { Order, Review } from '@/shared/db';

/** Services once completed; digital products as soon as the file is in hand. */
export const canBeReviewed = (order: Pick<Order, 'status' | 'item'>) =>
  order.status === 'completed' || (order.item.kind === 'digital' && order.status === 'delivered');

export interface SellerStats {
  /** Average stars, 0 while unrated. */
  rating: number;
  reviews: number;
  completedSales: number;
}

/** A creator promoted on the storefront: proven sales and well rated by several buyers. */
export const TOP_CREATOR = { minCompletedSales: 2, minReviews: 2, minRating: 4 } as const;

export const REVIEW_MAX_LENGTH = 600;

export const isTopCreator = (s: SellerStats | undefined): s is SellerStats =>
  Boolean(
    s &&
      s.completedSales >= TOP_CREATOR.minCompletedSales &&
      s.reviews >= TOP_CREATOR.minReviews &&
      s.rating >= TOP_CREATOR.minRating
  );

/** Completed sales and average rating per seller. */
export const computeSellerStats = (orders: Order[], reviews: Review[]): Map<string, SellerStats> => {
  const stats = new Map<string, SellerStats & { total: number }>();
  const entry = (sellerId: string) => {
    let s = stats.get(sellerId);
    if (!s) stats.set(sellerId, (s = { rating: 0, reviews: 0, completedSales: 0, total: 0 }));
    return s;
  };
  orders.forEach((o) => {
    if (o.status === 'completed') entry(o.sellerId).completedSales += 1;
  });
  reviews.forEach((r) => {
    const s = entry(r.sellerId);
    s.reviews += 1;
    s.total += r.rating;
  });
  const result = new Map<string, SellerStats>();
  stats.forEach(({ total, ...s }, id) => result.set(id, { ...s, rating: s.reviews ? total / s.reviews : 0 }));
  return result;
};

/** "4,5" */
export const formatRating = (rating: number) =>
  rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
