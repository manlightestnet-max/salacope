import React from 'react';
import { Card } from '@/shared/ui';
import { Conversation } from '../../chat';
import { perspectiveOf } from '../../model';
import { CompactOrderList } from '../OrderList';
import { useCounterpart } from './ConversationList';

/** Several orders with the same person: pick the one to talk about (one room per order). */
export const CounterpartOrders: React.FC<{ conversation: Conversation; userId: string; hrefFor: (orderId: string) => string }> = ({
  conversation,
  userId,
  hrefFor,
}) => {
  const { name } = useCounterpart(conversation, userId);
  return (
    <Card className="h-full overflow-y-auto">
      <div className="px-5 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">Choisissez la commande dont vous voulez parler.</p>
      </div>
      <CompactOrderList orders={conversation.orders} perspective={(o) => perspectiveOf(o, userId) ?? 'buyer'} hrefFor={(o) => hrefFor(o.id)} />
    </Card>
  );
};
