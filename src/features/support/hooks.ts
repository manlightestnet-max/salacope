import { useDb } from '@/shared/db';

export const useTickets = (userId: string) => useDb((s) => s.tickets.filter((t) => t.userId === userId), [userId]);

export const useTicket = (ticketId: string | undefined, userId: string) =>
  useDb((s) => s.tickets.find((t) => t.id === ticketId && t.userId === userId), [ticketId, userId]);

/** Tickets waiting on the user (support replied). */
export const useAnsweredTicketCount = (userId: string) =>
  useDb((s) => s.tickets.filter((t) => t.userId === userId && t.status === 'answered').length, [userId]);

/** What a ticket can refer to: the user's latest payments and orders. */
export const useSupportReferences = (userId: string) =>
  useDb(
    (s) => ({
      attempts: s.paymentAttempts.filter((a) => a.buyerId === userId).slice(0, 8),
      orders: s.orders.filter((o) => o.buyerId === userId || o.sellerId === userId).slice(0, 8),
    }),
    [userId]
  );
