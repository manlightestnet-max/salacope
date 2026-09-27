import type { Order } from '../db/schema.js';

export type Perspective = 'buyer' | 'seller';

type OrderShape = Pick<Order, 'buyerId' | 'sellerId' | 'status' | 'item' | 'revisionsUsed' | 'extension'>;

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
