import { ListingKind, Order, OrderMessage, PaymentRequest } from '@/shared/db';
import { PAYMENT_REQUEST_MINUTES, Perspective } from '@/shared/domain';

/** Rules of the order chat, shared by the conversation list, the room and the badges. */

export const counterpartId = (order: Pick<Order, 'buyerId' | 'sellerId'>, userId: string) =>
  order.buyerId === userId ? order.sellerId : order.buyerId;

const sideOf = (order: Pick<Order, 'buyerId'>, userId: string): Perspective => (order.buyerId === userId ? 'buyer' : 'seller');

/** Messages written to `userId` that they have not read yet. */
export const unreadCount = (order: Order, userId: string) => {
  const readAt = order.chat?.read[sideOf(order, userId)] ?? '';
  return order.messages.filter((m) => m.authorId !== userId && m.at > readAt).length;
};

export type MessageStatus = 'sent' | 'received' | 'read';

/** ✓ sent · ✓✓ received by the other party's app · ✓✓ coloured: read. */
export const messageStatus = (order: Order, message: OrderMessage, userId: string): MessageStatus => {
  const other = sideOf(order, userId) === 'buyer' ? 'seller' : 'buyer';
  if ((order.chat?.read[other] ?? '') >= message.at) return 'read';
  if ((order.chat?.seen[other] ?? '') >= message.at) return 'received';
  return 'sent';
};

export const lastMessage = (order: Order): OrderMessage | undefined => order.messages[order.messages.length - 1];

/** Last thing that happened in the conversation (message, else the order itself). */
export const lastActivityAt = (order: Order) => lastMessage(order)?.at ?? order.updatedAt;

export const messagePreview = (m: OrderMessage | undefined) => {
  if (!m) return '';
  if (m.request) return `Demande de paiement · ${m.request.title}`;
  if (m.body.trim()) return m.body.trim();
  const n = m.attachments?.length ?? 0;
  return n ? `${n} pièce${n > 1 ? 's' : ''} jointe${n > 1 ? 's' : ''}` : '';
};

export interface RequestState {
  state: 'waiting' | 'open' | 'expired';
  /** Milliseconds left while open. */
  left: number;
}

/** A payment request waits to be opened; once opened it is payable for a few minutes. */
export const requestState = (request: PaymentRequest, now = Date.now()): RequestState => {
  if (!request.openedAt) return { state: 'waiting', left: PAYMENT_REQUEST_MINUTES * 60_000 };
  const left = new Date(request.openedAt).getTime() + PAYMENT_REQUEST_MINUTES * 60_000 - now;
  return left > 0 ? { state: 'open', left } : { state: 'expired', left: 0 };
};

export const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** One line of the inbox: a person, with every order between you (one room per order, never duplicated). */
export interface Conversation {
  counterpartId: string;
  orders: Order[];
  last?: OrderMessage;
  lastAt: string;
  unread: number;
}

/** Inbox for one kind of order (digital products or services), most recent first. */
export const conversations = (orders: Order[], userId: string, kind: ListingKind): Conversation[] => {
  const byPerson = new Map<string, Order[]>();
  orders
    .filter((o) => o.item.kind === kind && (o.buyerId === userId || o.sellerId === userId))
    .forEach((o) => {
      const id = counterpartId(o, userId);
      byPerson.set(id, [...(byPerson.get(id) ?? []), o]);
    });
  return [...byPerson.entries()]
    .map(([id, list]) => {
      const sorted = [...list].sort((a, b) => lastActivityAt(b).localeCompare(lastActivityAt(a)));
      return {
        counterpartId: id,
        orders: sorted,
        last: lastMessage(sorted[0]),
        lastAt: lastActivityAt(sorted[0]),
        unread: list.reduce((n, o) => n + unreadCount(o, userId), 0),
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
};
