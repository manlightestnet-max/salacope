import type { Order } from '../db/schema.js';

export type Perspective = 'buyer' | 'seller';

type OrderShape = Pick<Order, 'buyerId' | 'sellerId' | 'status' | 'item' | 'revisionsUsed' | 'extension'>;

/** Images per chat message: more are sent in several messages (3 then 3). */
export const MAX_MESSAGE_IMAGES = 3;
export const isImageType = (type: string | undefined) => String(type ?? '').startsWith('image/');

/** A payment request card can be paid this long after the buyer first opens it. */
export const PAYMENT_REQUEST_MINUTES = 5;

/** The seller's own labels on a sale: a few short words, lower case, no duplicates. */
export const MAX_SELLER_TAGS = 5;
export const cleanSellerTags = (tags: unknown): string[] =>
  [...new Set((Array.isArray(tags) ? tags : []).map((t) => String(t).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 24)).filter(Boolean))].slice(
    0,
    MAX_SELLER_TAGS
  );

export const perspectiveOf = (order: Pick<Order, 'buyerId' | 'sellerId'>, userId: string): Perspective | null =>
  order.buyerId === userId ? 'buyer' : order.sellerId === userId ? 'seller' : null;

export const revisionsLeft = (order: Pick<Order, 'item' | 'revisionsUsed'>) =>
  Math.max(0, (order.item.revisions ?? 0) - (order.revisionsUsed ?? 0));

export const hasPendingExtension = (order: Pick<Order, 'extension'>) => order.extension?.status === 'pending';

/** What a given party may do on an order right now. The server enforces it. */
export const permissionsFor = (order: OrderShape, perspective: Perspective | null) => {
  const seller = perspective === 'seller';
  const buyer = perspective === 'buyer';
  const isService = order.item.kind === 'service';
  const { status } = order;
  return {
    accept: seller && isService && status === 'paid',
    deliver: seller && isService && (status === 'paid' || status === 'in_progress'),
    cancel: (seller && (status === 'paid' || status === 'in_progress')) || (buyer && isService && status === 'paid'),
    confirm: buyer && status === 'delivered',
    dispute: buyer && status === 'delivered',
    revise: buyer && isService && status === 'delivered' && revisionsLeft(order) > 0,
    extend: seller && isService && status === 'in_progress' && !hasPendingExtension(order),
    answerExtension: buyer && status === 'in_progress' && hasPendingExtension(order),
    message: Boolean(perspective) && status !== 'cancelled',
  };
};

export type OrderPermissions = ReturnType<typeof permissionsFor>;
