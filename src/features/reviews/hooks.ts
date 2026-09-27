import { useDb } from '@/shared/db';
import { computeSellerStats } from './model';

/** Completed sales and rating of every seller. */
export const useSellerStats = () => useDb((s) => computeSellerStats(s.orders, s.reviews));

export const useSellerStat = (sellerId: string | undefined) =>
  useDb(
    (s) =>
      sellerId
        ? computeSellerStats(
            s.orders.filter((o) => o.sellerId === sellerId),
            s.reviews.filter((r) => r.sellerId === sellerId)
          ).get(sellerId)
        : undefined,
    [sellerId]
  );

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

const shortName = (name = '') => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0]}.` : first || 'Client';
};

/** A store's reviews, newest first, with who wrote them and for what. */
export const useSellerReviews = (sellerId: string) =>
  useDb(
    (s) =>
      s.reviews
        .filter((r) => r.sellerId === sellerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map<ReviewView>((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          author: shortName(s.users.find((u) => u.id === r.buyerId)?.name),
          itemTitle: s.orders.find((o) => o.id === r.orderId)?.item.title ?? '',
        })),
    [sellerId]
  );
