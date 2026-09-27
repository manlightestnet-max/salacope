import type { Order } from '../db/schema.js';

export const REVIEW_MAX_LENGTH = 600;

/** Services once completed; digital products as soon as the file is in hand. */
export const canBeReviewed = (order: Pick<Order, 'status' | 'item'>) =>
  order.status === 'completed' || (order.item.kind === 'digital' && order.status === 'delivered');
