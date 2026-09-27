import { Order, User, useDb } from '@/shared/db';

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
