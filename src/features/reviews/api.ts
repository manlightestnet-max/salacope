import { createId, nowIso } from '@/shared/lib';
import { DomainError, Review, db } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { withNotifications } from '@/features/notifications';
import { REVIEW_MAX_LENGTH, canBeReviewed } from './model';

export interface LeaveReviewInput {
  orderId: string;
  userId: string;
  rating: number;
  comment?: string;
}

/** The buyer rates a completed order, once. */
export function leaveReview({ orderId, userId, rating, comment }: LeaveReviewInput): Review {
  const state = db.get();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) throw new DomainError('Commande introuvable.');
  if (order.buyerId !== userId) throw new DomainError("Seul l'acheteur peut noter cette commande.");
  if (!canBeReviewed(order)) throw new DomainError('Vous pourrez noter cette commande une fois terminée.');
  if (state.reviews.some((r) => r.orderId === orderId)) throw new DomainError('Vous avez déjà noté cette commande.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError('Choisissez une note de 1 à 5 étoiles.');
  const text = comment?.trim();
  if (text && text.length > REVIEW_MAX_LENGTH) throw new DomainError(`Votre avis dépasse ${REVIEW_MAX_LENGTH} caractères.`);

  const review: Review = {
    id: createId('rev'),
    orderId,
    listingId: order.listingId,
    sellerId: order.sellerId,
    buyerId: userId,
    rating,
    comment: text || undefined,
    createdAt: nowIso(),
  };
  db.update((s) =>
    withNotifications({ ...s, reviews: [review, ...s.reviews] }, [
      {
        userId: order.sellerId,
        title: `Nouvel avis ${rating} étoile${rating > 1 ? 's' : ''}`,
        body: text || order.item.title,
        href: ROUTES.seller.sale(order.id),
      },
    ])
  );
  return review;
}
