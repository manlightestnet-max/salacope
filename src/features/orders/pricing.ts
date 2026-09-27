import { computeFee } from '@/shared/config/platform';

/**
 * Promo codes. Demo only: in production the server validates codes,
 * otherwise anyone can read them from the bundle.
 */
const COUPONS: Record<string, number> = {
  BIENVENUE: 0.15,
  SALA10: 0.1,
};

export const findCouponRate = (code: string): number | undefined => COUPONS[code.trim().toUpperCase()];

export const priceOrder = (subtotal: number, couponCode?: string) => {
  const rate = couponCode ? findCouponRate(couponCode) ?? 0 : 0;
  const discount = Math.round(subtotal * rate);
  const total = subtotal - discount;
  const fee = computeFee(total);
  return { subtotal, discount, total, fee, net: total - fee };
};
