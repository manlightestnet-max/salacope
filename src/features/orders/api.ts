import { mutate } from '@/shared/api';
import { Attachment, DomainError } from '@/shared/db';
import { CONTACT_BLOCKED, containsContact } from '@/shared/domain';

/**
 * Order actions. The server checks who may do what, moves the money on LightPay
 * (validation pays the seller, cancellation refunds the buyer, a dispute freezes it)
 * and tells the other party.
 */
const act = (orderId: string, action: string, body: object = {}) => mutate('POST', `/orders/${encodeURIComponent(orderId)}/${action}`, body);

const noContact = (text: string) => {
  if (containsContact(text)) throw new DomainError(CONTACT_BLOCKED);
};

export const acceptOrder = (orderId: string) => act(orderId, 'accept');

export async function deliverOrder(orderId: string, note: string, files: Attachment[]) {
  if (!note.trim() && files.length === 0) throw new DomainError('Ajoutez un message ou un fichier à la livraison.');
  noContact(note);
  await act(orderId, 'deliver', { note, files });
}

export const confirmOrder = (orderId: string) => act(orderId, 'confirm');

export async function cancelOrder(orderId: string, reason: string) {
  if (!reason.trim()) throw new DomainError("Indiquez la raison de l'annulation.");
  await act(orderId, 'cancel', { reason });
}

export async function disputeOrder(orderId: string, reason: string) {
  if (!reason.trim()) throw new DomainError('Décrivez le problème rencontré.');
  await act(orderId, 'dispute', { reason });
}

/** The buyer sends the work back with what to change. */
export async function requestRevision(orderId: string, note: string) {
  if (!note.trim()) throw new DomainError('Décrivez ce qui doit être modifié.');
  noContact(note);
  await act(orderId, 'revise', { note });
}

/** The seller asks for more time on a service in progress; the buyer accepts or declines. */
export async function requestExtension(orderId: string, days: number, reason: string) {
  if (!reason.trim()) throw new DomainError('Expliquez pourquoi il vous faut plus de temps.');
  noContact(reason);
  await act(orderId, 'extend', { days, reason });
}

export const answerExtension = (orderId: string, accept: boolean) => act(orderId, 'extension', { accept });

export async function sendMessage(orderId: string, body: string, attachments: Attachment[] = []) {
  if (!body.trim() && attachments.length === 0) return;
  noContact(body);
  await act(orderId, 'messages', { body, attachments });
}

export interface ReportResult {
  /** `dispute`: funds frozen on the order. `ticket`: order already closed, support takes over. */
  kind: 'dispute' | 'ticket';
  /** Reference shown to the buyer (order number or ticket number). */
  reference: string;
  ticketId?: string;
}

/**
 * The buyer reports a problem in one step. While funds are still held it opens a dispute;
 * once the order is closed it files a support ticket.
 */
export async function reportProblem(orderId: string, reason: string, detail = ''): Promise<ReportResult> {
  if (!reason.trim()) throw new DomainError('Choisissez ce qui ne va pas.');
  const { result } = await act(orderId, 'report', { reason, detail });
  return result;
}

// ---------------------------------------------------------------- chat

/** The conversation is on screen: the other party sees their messages as read. */
export const markRead = (orderId: string) => act(orderId, 'read');

/** Buyer only: messages erased once the order is closed. */
export const setEphemeral = (orderId: string, on: boolean) => act(orderId, 'ephemeral', { on });

/** Seller: one of their offers to pay, as a card valid a few minutes once opened. */
export const sendPaymentRequest = (orderId: string, listingId: string) => act(orderId, 'payment-requests', { listingId });

/** Buyer opens the card: the countdown starts (first time only). */
export const openPaymentRequest = (orderId: string, messageId: string) => act(orderId, `messages/${encodeURIComponent(messageId)}/open`);

/** Buyer: the seller can no longer write to them (or again, when `blocked` is false). */
export const blockSeller = (sellerId: string, blocked: boolean) => mutate('POST', '/blocks', { sellerId, blocked });

/** Seller's own organisation of a sale; never shown to the buyer. */
export const setSellerTags = (orderId: string, tags: string[]) => mutate('PATCH', `/orders/${encodeURIComponent(orderId)}/seller-meta`, { tags });
export const setPinned = (orderId: string, pinned: boolean) => mutate('PATCH', `/orders/${encodeURIComponent(orderId)}/seller-meta`, { pinned });
