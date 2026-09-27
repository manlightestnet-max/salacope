import { computeFee } from '../config/platform.js';

/** Order amounts: what the buyer pays and what the seller receives once released. */
export const priceOrder = (subtotal: number) => {
  const discount = 0;
  const total = subtotal - discount;
  const fee = computeFee(total);
  return { subtotal, discount, total, fee, net: total - fee };
};
