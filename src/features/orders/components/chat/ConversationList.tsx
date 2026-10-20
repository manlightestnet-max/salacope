import React from 'react';
import { Ban, Timer } from 'lucide-react';
import { Badge } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { displayName } from '@/features/session';
import { Conversation, messagePreview } from '../../chat';
import { needsAction } from '../../model';
import { ConversationRow } from './ChatParts';

/** Name and photo of the other party: the store for a buyer, the client's name for a seller. */
export const useCounterpart = (c: Pick<Conversation, 'counterpartId' | 'orders'>, userId: string) => {
  const user = useDb((s) => s.users.find((u) => u.id === c.counterpartId), [c.counterpartId]);
  const asBuyer = c.orders[0]?.buyerId === userId;
  return { name: asBuyer ? displayName(user) : c.orders[0]?.buyer.name ?? 'Client', logo: asBuyer ? user?.merchant?.logo : undefined };
};

const Row: React.FC<{ conversation: Conversation; userId: string; href: string; selected: boolean }> = ({ conversation: c, userId, href, selected }) => {
  const { name, logo } = useCounterpart(c, userId);
  const order = c.orders[0];
  const mine = c.last?.authorId === userId;
  // Something waits for this person on one of the orders: accept, deliver, validate…
  const waiting = c.orders.some((o) => needsAction(o, o.buyerId === userId ? 'buyer' : 'seller'));
  return (
    <ConversationRow
      href={href}
      selected={selected}
      name={name}
      avatar={{ name, src: logo }}
      at={c.lastAt}
      unread={c.unread}
      preview={c.last ? `${mine ? 'Vous : ' : ''}${messagePreview(c.last)}` : order.item.title}
      extras={
        <>
          {waiting && <Badge tone="warning">À traiter</Badge>}
          {order.chat?.ephemeral && <Timer className="w-3 h-3 text-gray-400 shrink-0" aria-label="Messages éphémères" />}
          {order.chat?.blocked && <Ban className="w-3 h-3 text-gray-400 shrink-0" aria-label="Bloqué" />}
        </>
      }
      note={c.orders.length > 1 ? `${c.orders.length} commandes` : undefined}
    />
  );
};

/** Inbox in the style of a messaging app: one line per person, latest first, unread in bold. */
export const ConversationList: React.FC<{
  conversations: Conversation[];
  userId: string;
  hrefFor: (c: Conversation) => string;
  isSelected: (c: Conversation) => boolean;
}> = ({ conversations, userId, hrefFor, isSelected }) => (
  <ul className="divide-y divide-gray-100">
    {conversations.map((c) => (
      <Row key={c.counterpartId} conversation={c} userId={userId} href={hrefFor(c)} selected={isSelected(c)} />
    ))}
  </ul>
);
