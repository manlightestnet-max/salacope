import { useDb } from '@/shared/db';

export const usePaymentAttempt = (attemptId: string | undefined) =>
  useDb((s) => (attemptId ? s.paymentAttempts.find((a) => a.id === attemptId) : undefined), [attemptId]);

/** A buyer's latest payment attempts, whatever their outcome. */
export const usePaymentAttempts = (buyerId: string, limit = 10) =>
  useDb((s) => s.paymentAttempts.filter((a) => a.buyerId === buyerId).slice(0, limit), [buyerId, limit]);
