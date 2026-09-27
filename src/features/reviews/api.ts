import { mutate } from '@/shared/api';
import { DomainError } from '@/shared/db';
import { REVIEW_MAX_LENGTH } from './model';

export interface LeaveReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
}

/** The buyer rates a finished order, once. */
export async function leaveReview({ orderId, rating, comment }: LeaveReviewInput): Promise<void> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError('Choisissez une note de 1 à 5 étoiles.');
  if ((comment?.trim().length ?? 0) > REVIEW_MAX_LENGTH) throw new DomainError(`Votre avis dépasse ${REVIEW_MAX_LENGTH} caractères.`);
  await mutate('POST', `/orders/${encodeURIComponent(orderId)}/review`, { rating, comment: comment?.trim() });
}
