/** Business rules shared by the marketplace. Server-side in production. */
export const PLATFORM = {
  /** Commission taken on each completed sale, deducted from the seller (0 = launch offer). Set by the administration. */
  feeRate: 0.1,
  /** Own rate for digital products / services; `null` = the general rate. */
  feeRateDigital: null as number | null,
  feeRateService: null as number | null,
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
  /** Smallest price of an offer. Keep it at or above LightPay's own minimum deposit: below it an offer could not be paid. */
  minPriceXaf: 1000,
  /** Own minimum for digital products / services; `null` = the general one. Set by the administration. */
  minPriceDigitalXaf: null as number | null,
  minPriceServiceXaf: null as number | null,
  /** Longest promotion with a countdown, in days: its price goes back to the former one at the end. */
  promoMaxDays: 30,
  /** Sellers may set a price of 0 (a free offer, or free during a promotion). Set by the administration. */
  freeOffers: true,
  /** Most files one digital product can deliver. Set by the administration. */
  maxProductFiles: 5,
  country: 'République du Congo',
  /** Where the team is based (footer). */
  headquarters: 'Luanda, Angola',
  currency: 'XAF',
  phonePrefix: '+242',
  supportEmail: 'contact@salacope.online',
};

/** The commission rate that applies to an offer of this kind. */
export const feeRateFor = (kind?: 'digital' | 'service') => (kind === 'digital' ? PLATFORM.feeRateDigital : kind === 'service' ? PLATFORM.feeRateService : null) ?? PLATFORM.feeRate;

/** The smallest price an offer of this kind may have. */
export const minPriceFor = (kind?: 'digital' | 'service') => (kind === 'digital' ? PLATFORM.minPriceDigitalXaf : kind === 'service' ? PLATFORM.minPriceServiceXaf : null) ?? PLATFORM.minPriceXaf;

export const computeFee = (amount: number, kind?: 'digital' | 'service') => Math.round(amount * feeRateFor(kind));

/** What the administration may change; the server sends it with the data and the app applies it. */
export interface PlatformSettings {
  feeRate: number;
  feeRateDigital: number | null;
  feeRateService: number | null;
  digitalHoldDays: number;
  serviceValidationDays: number;
  minPriceXaf: number;
  minPriceDigitalXaf: number | null;
  minPriceServiceXaf: number | null;
  promoMaxDays: number;
  freeOffers: boolean;
  maxProductFiles: number;
}

/** Fewest and most files per product the administration may allow. */
export const PRODUCT_FILES_RANGE = { min: 1, max: 20 } as const;

/** Lowest minimum price the administration may set (whole FCFA), and the highest. */
export const MIN_PRICE_RANGE = { min: 100, max: 1_000_000 } as const;

const rate = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 0.5 ? v : undefined);
const days = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 60 ? v : undefined);
const minPrice = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= MIN_PRICE_RANGE.min && v <= MIN_PRICE_RANGE.max ? v : undefined);
const productFiles = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= PRODUCT_FILES_RANGE.min && v <= PRODUCT_FILES_RANGE.max ? v : undefined);
const promoDays = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 365 ? v : undefined);

/** Replaces the defaults with the saved settings (values that make no sense are ignored). */
export function applyPlatform(s?: Partial<PlatformSettings> | null) {
  if (!s) return;
  PLATFORM.feeRate = rate(s.feeRate) ?? PLATFORM.feeRate;
  PLATFORM.feeRateDigital = s.feeRateDigital === null ? null : (rate(s.feeRateDigital) ?? PLATFORM.feeRateDigital);
  PLATFORM.feeRateService = s.feeRateService === null ? null : (rate(s.feeRateService) ?? PLATFORM.feeRateService);
  PLATFORM.digitalHoldDays = days(s.digitalHoldDays) ?? PLATFORM.digitalHoldDays;
  PLATFORM.serviceValidationDays = days(s.serviceValidationDays) ?? PLATFORM.serviceValidationDays;
  PLATFORM.minPriceXaf = minPrice(s.minPriceXaf) ?? PLATFORM.minPriceXaf;
  PLATFORM.minPriceDigitalXaf = s.minPriceDigitalXaf === null ? null : (minPrice(s.minPriceDigitalXaf) ?? PLATFORM.minPriceDigitalXaf);
  PLATFORM.minPriceServiceXaf = s.minPriceServiceXaf === null ? null : (minPrice(s.minPriceServiceXaf) ?? PLATFORM.minPriceServiceXaf);
  PLATFORM.promoMaxDays = promoDays(s.promoMaxDays) ?? PLATFORM.promoMaxDays;
  if (typeof s.freeOffers === 'boolean') PLATFORM.freeOffers = s.freeOffers;
  PLATFORM.maxProductFiles = productFiles(s.maxProductFiles) ?? PLATFORM.maxProductFiles;
}

export const percent = (r: number) => `${Math.round(r * 1000) / 10} %`;

/** The commission in a sentence: one rate, one per kind of offer, or none during the launch. */
export const commissionText = () => {
  const { feeRate, feeRateDigital, feeRateService } = PLATFORM;
  const digital = feeRateDigital ?? feeRate;
  const service = feeRateService ?? feeRate;
  if (digital === 0 && service === 0) return 'Aucune commission pendant le lancement.';
  if (digital === service) return `Commission de ${percent(digital)} par vente.`;
  return `Commission de ${percent(digital)} par vente de produit numérique, ${percent(service)} par service.`;
};

export const hasCommission = () => (PLATFORM.feeRateDigital ?? PLATFORM.feeRate) > 0 || (PLATFORM.feeRateService ?? PLATFORM.feeRate) > 0;

/** Days between delivery and automatic payout to the seller, by kind of offer. */
export const releaseDays = (kind: 'digital' | 'service') => (kind === 'digital' ? PLATFORM.digitalHoldDays : PLATFORM.serviceValidationDays);

/** The same rule in words, for pages covering both kinds. */
export const releaseRule = () => `${PLATFORM.digitalHoldDays} jours pour un produit numérique, ${PLATFORM.serviceValidationDays} jours pour un service`;

/** File storage (Cloudflare R2): what one seller may keep, and the biggest single file. */
export const STORAGE = {
  quotaBytes: 200 * 1024 * 1024,
  maxFileBytes: 100 * 1024 * 1024,
} as const;
