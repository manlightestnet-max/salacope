/** Business rules shared by the marketplace. Server-side in production. */
export const PLATFORM = {
  /** Commission taken on each completed sale, deducted from the seller (0 = launch offer). */
  feeRate: 0.1,
  /** Digital product: no confirmation needed; funds held this many days, then paid out if no dispute. */
  digitalHoldDays: 3,
  /** Service (or product) marked delivered: validated automatically after this many days. */
  serviceValidationDays: 2,
  /** Days the seller has to deliver a requested revision. */
  revisionDays: 2,
  /** Longest extension a seller can ask for at once. */
  maxExtensionDays: 14,
  /** Most revisions a service can include. */
  maxRevisions: 5,
  /** Time the buyer has to approve the Mobile Money request on their phone. */
  paymentTimeoutSeconds: 60,
  minWithdrawalXaf: 1000,
  /** Same as the mobile-money minimum: below it an offer could not be paid. */
  minPriceXaf: 1000,
  country: 'République du Congo',
  /** Where the team is based (footer). */
  headquarters: 'Luanda, Angola',
  currency: 'XAF',
  phonePrefix: '+242',
  supportEmail: 'contact@salacope.online',
} as const;

export const computeFee = (amount: number) => Math.round(amount * PLATFORM.feeRate);

/** Days between delivery and automatic payout to the seller, by kind of offer. */
export const releaseDays = (kind: 'digital' | 'service') => (kind === 'digital' ? PLATFORM.digitalHoldDays : PLATFORM.serviceValidationDays);

/** The same rule in words, for pages covering both kinds. */
export const RELEASE_RULE = `${PLATFORM.digitalHoldDays} jours pour un produit numérique, ${PLATFORM.serviceValidationDays} jours pour un service`;
