import { mutate } from '@/shared/api';
import { DomainError, Ticket, TicketTopic } from '@/shared/db';

export interface OpenTicketInput {
  topic: TicketTopic;
  subject: string;
  body: string;
  /** Payment code (TX-…) or order number (SC-…). */
  reference?: string;
}

/** Support answers first with what Salacope already knows about the reference. */
export async function openTicket({ topic, subject, body, reference }: OpenTicketInput): Promise<Ticket> {
  if (subject.trim().length < 4) throw new DomainError('Donnez un objet à votre demande.');
  if (body.trim().length < 10) throw new DomainError('Décrivez votre problème en quelques mots.');
  const { ticket } = await mutate<{ ticket: Ticket }>('POST', '/tickets', { topic, subject, body, reference });
  return ticket;
}

/** Adds a message; writing on a resolved ticket reopens it. */
export async function replyToTicket(ticketId: string, body: string): Promise<void> {
  if (!body.trim()) throw new DomainError('Écrivez votre message.');
  await mutate('POST', `/tickets/${encodeURIComponent(ticketId)}/messages`, { body });
}

export async function resolveTicket(ticketId: string): Promise<void> {
  await mutate('POST', `/tickets/${encodeURIComponent(ticketId)}/resolve`);
}
