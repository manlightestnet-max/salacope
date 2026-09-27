import { nowIso, createId } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { PAYMENT_CHANNELS, PaymentChannel } from '@/shared/config/payment';
import { ROUTES } from '@/shared/config/routes';
import { DomainError, Order, PaymentAttempt, PaymentFailure, db, replaceById } from '@/shared/db';
import { withNotifications } from '@/features/notifications';
import { PlaceOrderInput, findCouponRate, placeOrder, priceOrder, validateBrief } from '@/features/orders';
import { attemptOutcome, createPaymentCode, isValidPhone } from './model';

export interface StartPaymentInput {
  listingId: string;
  buyerId: string;
  channel: PaymentChannel;
  phone: string;
  couponCode?: string;
  brief?: Record<string, string>;
}

const getAttempt = (attemptId: string): PaymentAttempt => {
  const attempt = db.get().paymentAttempts.find((a) => a.id === attemptId);
  if (!attempt) throw new DomainError('Paiement introuvable.');
  return attempt;
};

/**
 * Sends the Mobile Money request to the buyer's phone. Nothing is ordered yet: the order is
 * created only when the operator confirms. The attempt gets its code right away.
 */
export function startPayment(input: StartPaymentInput): PaymentAttempt {
  const state = db.get();
  const listing = state.listings.find((l) => l.id === input.listingId);
  if (!listing || listing.status !== 'published') throw new DomainError("Cette offre n'est plus disponible.");
  if (listing.sellerId === input.buyerId) throw new DomainError('Vous ne pouvez pas acheter votre propre offre.');
  if (input.couponCode && findCouponRate(input.couponCode) === undefined) throw new DomainError('Code promo invalide.');
  if (!isValidPhone(input.phone)) throw new DomainError(`Numéro ${PAYMENT_CHANNELS[input.channel].label} invalide.`);
  validateBrief(listing.id, input.brief);

  const now = nowIso();
  const attempt: PaymentAttempt = {
    id: createId('pay'),
    code: createPaymentCode(),
    buyerId: input.buyerId,
    listingId: listing.id,
    sellerId: listing.sellerId,
    channel: input.channel,
    phone: input.phone.trim(),
    amount: priceOrder(listing.priceXaf, input.couponCode).total,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  db.update((s) => ({
    ...s,
    // A new request replaces any request of this buyer still waiting.
    paymentAttempts: [
      attempt,
      ...s.paymentAttempts.map((a) =>
        a.buyerId === input.buyerId && a.status === 'pending' ? { ...a, status: 'cancelled' as const, updatedAt: now } : a
      ),
    ],
  }));
  return attempt;
}

const closeAttempt = (attempt: PaymentAttempt, patch: Partial<PaymentAttempt>) => {
  const closed = { ...attempt, ...patch, updatedAt: nowIso() };
  db.update((s) =>
    withNotifications({ ...s, paymentAttempts: replaceById(s.paymentAttempts, attempt.id, () => closed) }, [
      {
        userId: attempt.buyerId,
        title: 'Paiement non abouti',
        body: `${attempt.code} · ${attemptOutcome(closed)}`,
        href: ROUTES.account.support,
      },
    ])
  );
};

const pendingAttempt = (attemptId: string) => {
  const attempt = getAttempt(attemptId);
  if (attempt.status !== 'pending') throw new DomainError("Cette demande de paiement n'est plus active.");
  return attempt;
};

/** Operator confirmed: the order is created and linked to the attempt. */
export function confirmPayment(
  attemptId: string,
  details: Omit<PlaceOrderInput, 'listingId' | 'buyerId' | 'channel' | 'paymentPhone' | 'paymentCode'>
): Order {
  const attempt = pendingAttempt(attemptId);
  let order: Order;
  try {
    order = placeOrder({
      ...details,
      listingId: attempt.listingId,
      buyerId: attempt.buyerId,
      channel: attempt.channel,
      paymentPhone: attempt.phone,
      paymentCode: attempt.code,
    });
  } catch (e) {
    closeAttempt(attempt, { status: 'failed', failure: 'declined' });
    throw e;
  }
  db.update((s) => ({
    ...s,
    paymentAttempts: replaceById(s.paymentAttempts, attempt.id, (a) => ({ ...a, status: 'succeeded', orderId: order.id, updatedAt: nowIso() })),
  }));
  return order;
}

/** Operator refused the payment. */
export function failPayment(attemptId: string, failure: PaymentFailure): void {
  closeAttempt(pendingAttempt(attemptId), { status: 'failed', failure });
}

/** Not approved on the phone within `paymentTimeoutSeconds`. Idempotent. */
export function expirePayment(attemptId: string): void {
  const attempt = getAttempt(attemptId);
  if (attempt.status === 'pending') closeAttempt(attempt, { status: 'expired' });
}

/** The buyer gave up (or wants to change number) before approving. */
export function cancelPayment(attemptId: string): void {
  const attempt = getAttempt(attemptId);
  if (attempt.status !== 'pending') return;
  db.update((s) => ({
    ...s,
    paymentAttempts: replaceById(s.paymentAttempts, attempt.id, (a) => ({ ...a, status: 'cancelled', updatedAt: nowIso() })),
  }));
}

export const PAYMENT_TIMEOUT_MS = PLATFORM.paymentTimeoutSeconds * 1000;

/** Requests left pending (page closed before the phone answered) expire after the timeout. Idempotent. */
export function expireStalePayments(now = Date.now()): void {
  db.get()
    .paymentAttempts.filter((a) => a.status === 'pending' && new Date(a.createdAt).getTime() + PAYMENT_TIMEOUT_MS <= now)
    .forEach((a) => expirePayment(a.id));
}
