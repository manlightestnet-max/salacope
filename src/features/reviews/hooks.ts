import { useDb } from '@/shared/db';
import { SellerStats, sellerStatsOf } from './model';

/** Completed sales and rating of every seller. */
export const useSellerStats = () =>
  useDb((s) => new Map<string, SellerStats>(Object.keys(s.stats.sellers).map((id) => [id, sellerStatsOf(s.stats, id)])));

export const useSellerStat = (sellerId: string | undefined) =>
  useDb((s) => (sellerId ? sellerStatsOf(s.stats, sellerId) : undefined), [sellerId]);

export const useOrderReview = (orderId: string) => useDb((s) => s.reviews.find((r) => r.orderId === orderId), [orderId]);

export interface ReviewView {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  /** "Aline M." — buyers are shown by first name and initial. */
  author: string;
  itemTitle: string;
}

/** A store's reviews, newest first, with who wrote them and for what. */
export const useSellerReviews = (sellerId: string) =>
  useDb(
    (s) =>
      s.reviews
        .filter((r) => r.sellerId === sellerId)
        .map<ReviewView>((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          author: r.authorName ?? 'Client',
          itemTitle: r.itemTitle ?? '',
        })),
    [sellerId]
  );
