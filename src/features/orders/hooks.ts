import { ListingKind, Order, User, useDb } from '@/shared/db';
import { conversations, unreadCount } from './chat';

export const useBuyerOrders = (userId: string) =>
  useDb((s) => s.orders.filter((o) => o.buyerId === userId), [userId]);

export const useSellerOrders = (sellerId: string) =>
  useDb((s) => s.orders.filter((o) => o.sellerId === sellerId), [sellerId]);

export interface OrderView {
  order: Order;
  seller: User | undefined;
  buyerUser: User | undefined;
  users: Map<string, User>;
}

export const useOrderView = (orderId: string | undefined): OrderView | undefined =>
  useDb(
    (s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return undefined;
      const users = new Map(s.users.filter((u) => u.id === order.buyerId || u.id === order.sellerId).map((u) => [u.id, u]));
      return { order, seller: users.get(order.sellerId), buyerUser: users.get(order.buyerId), users };
    },
    [orderId]
  );

/** Inbox of one kind (digital products or services) for this person, latest first. */
export const useConversations = (userId: string, kind: ListingKind) => useDb((s) => conversations(s.orders, userId, kind), [userId, kind]);

/** Messages waiting to be read, for the menu badge and the inbox tabs. */
export const useUnreadCount = (userId: string, kind?: ListingKind) =>
  useDb((s) => s.orders.filter((o) => !kind || o.item.kind === kind).reduce((n, o) => n + unreadCount(o, userId), 0), [userId, kind]);

/** Every tag this seller already uses, to offer them again. */
export const useSellerTagList = (sellerId: string) =>
  useDb((s) => [...new Set(s.orders.filter((o) => o.sellerId === sellerId).flatMap((o) => o.sellerMeta?.tags ?? []))].sort(), [sellerId]);
