/** Business rules shared by the marketplace. Server-side in production. */
export const PLATFORM = {
  /** Commission taken on each completed sale, deducted from the seller (0 = launch offer). */
  feeRate: 0.1,
  /** Days the buyer has to confirm or dispute a delivery before funds are released. */
  escrowDays: 7,
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
