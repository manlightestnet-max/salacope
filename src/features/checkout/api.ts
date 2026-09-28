import { boot, guest, mutate } from '@/shared/api';
import { PaymentAttempt } from '@/shared/db';

export interface StartCheckoutInput {
  listingId: string;
  /** Answers to the listing's brief questions, by question id. */
  brief?: Record<string, string>;
  invoice?: { companyName: string; taxId: string };
}

/**
 * Opens the LightPay payment page for this offer (Mobile Money or LightPay wallet). No account
 * needed: a visitor buys as a guest.
 * Nothing is ordered yet: the order is created once LightPay confirms; the money stays
 * held until the buyer validates. Resolves to the page to go to.
 */
export async function startCheckout(input: StartCheckoutInput): Promise<{ checkoutUrl: string; attemptId: string }> {
  const { checkoutUrl, attempt, guestKey } = await mutate<{ checkoutUrl: string; attempt: PaymentAttempt; guestKey?: string }>('POST', '/checkout', input);
  if (guestKey) {
    // First purchase without an account: this browser now holds the guest profile (order, chat).
    guest.save(guestKey);
    await boot();
  }
  return { checkoutUrl, attemptId: attempt.id };
}

/** Asks LightPay where the payment stands (after the return, then while it confirms). */
export async function refreshAttempt(attemptId: string): Promise<PaymentAttempt> {
  const { attempt } = await mutate<{ attempt: PaymentAttempt }>('POST', `/checkout/${encodeURIComponent(attemptId)}/refresh`);
  return attempt;
}

/** The buyer gave up before paying. */
export async function cancelAttempt(attemptId: string): Promise<void> {
  await mutate('POST', `/checkout/${encodeURIComponent(attemptId)}/cancel`);
}
