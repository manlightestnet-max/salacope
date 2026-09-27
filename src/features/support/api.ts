import { createId, formatXaf, nowIso } from '@/shared/lib';
import { PAYMENT_CHANNELS } from '@/shared/config/payment';
import { DomainError, Order, PaymentAttempt, Ticket, TicketTopic, db, replaceById } from '@/shared/db';
import { attemptOutcome } from '@/features/checkout';
import { SUPPORT_DELAY_HOURS } from './model';

export interface OpenTicketInput {
  userId: string;
  topic: TicketTopic;
  subject: string;
  body: string;
  /** Payment code (TX-…) or order number (SC-…). */
  reference?: string;
}

/** Automatic first reply: what Salacope already knows about the reference. */
const acknowledgement = (attempt?: PaymentAttempt, order?: Order) => {
  const delay = `Nous vous répondons sous ${SUPPORT_DELAY_HOURS} h.`;
  if (attempt && attempt.status !== 'succeeded') {
    return `Demande reçue. Tentative ${attempt.code} (${formatXaf(attempt.amount)}) : ${attemptOutcome(attempt).toLowerCase()}, aucune commande créée. Si votre compte ${PAYMENT_CHANNELS[attempt.channel].label} a été débité, l’opérateur annule le débit sous 72 h ; nous vérifions de notre côté. ${delay}`;
  }
  if (attempt) return `Demande reçue. Le paiement ${attempt.code} a bien abouti${order ? ` (commande ${order.number})` : ''}. ${delay}`;
  if (order) return `Demande reçue pour la commande ${order.number}. ${delay}`;
  return `Demande reçue. ${delay}`;
};

const nextTicketNumber = () => {
  const max = db.get().tickets.reduce((m, t) => Math.max(m, Number(t.number.replace(/\D/g, '')) || 0), 1000);
  return `SUP-${max + 1}`;
};

export function openTicket({ userId, topic, subject, body, reference }: OpenTicketInput): Ticket {
  if (subject.trim().length < 4) throw new DomainError('Donnez un objet à votre demande.');
  if (body.trim().length < 10) throw new DomainError('Décrivez votre problème en quelques mots.');

  const state = db.get();
  const ref = reference?.trim().toUpperCase() || undefined;
  const attempt = ref ? state.paymentAttempts.find((a) => a.code === ref && a.buyerId === userId) : undefined;
  const order = ref
    ? state.orders.find((o) => o.number === ref && (o.buyerId === userId || o.sellerId === userId)) ??
      (attempt?.orderId ? state.orders.find((o) => o.id === attempt.orderId) : undefined)
    : undefined;
  if (ref && !attempt && !order) {
    throw new DomainError('Référence introuvable sur votre compte : vérifiez le code (TX-…) ou le numéro de commande (SC-…).');
  }

  const now = nowIso();
  const ticket: Ticket = {
    id: createId('tkt'),
    number: nextTicketNumber(),
    userId,
    topic,
    subject: subject.trim(),
    reference: ref,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    messages: [
      { id: createId('tkm'), authorId: userId, body: body.trim(), at: now },
      { id: createId('tkm'), authorId: null, body: acknowledgement(attempt, order), at: now },
    ],
  };
  db.update((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
  return ticket;
}

const ownTicket = (ticketId: string, userId: string) => {
  const ticket = db.get().tickets.find((t) => t.id === ticketId);
  if (!ticket || ticket.userId !== userId) throw new DomainError('Ticket introuvable.');
  return ticket;
};

/** Adds a message; writing on a resolved ticket reopens it. */
export function replyToTicket(ticketId: string, userId: string, body: string): void {
  ownTicket(ticketId, userId);
  if (!body.trim()) throw new DomainError('Écrivez votre message.');
  const at = nowIso();
  db.update((s) => ({
    ...s,
    tickets: replaceById(s.tickets, ticketId, (t) => ({
      ...t,
      status: 'open',
      updatedAt: at,
      messages: [...t.messages, { id: createId('tkm'), authorId: userId, body: body.trim(), at }],
    })),
  }));
}

export function resolveTicket(ticketId: string, userId: string): void {
  ownTicket(ticketId, userId);
  db.update((s) => ({ ...s, tickets: replaceById(s.tickets, ticketId, (t) => ({ ...t, status: 'resolved', updatedAt: nowIso() })) }));
}
