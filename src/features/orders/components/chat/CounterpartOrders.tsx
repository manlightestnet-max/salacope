import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import { ListingThumb } from '@/features/catalog';
import { Conversation, unreadCount } from '../../chat';
import { perspectiveOf } from '../../model';
import { OrderStatusBadge } from '../OrderStatusBadge';
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
      <ul className="divide-y divide-gray-100">
        {conversation.orders.map((o) => {
          const unread = unreadCount(o, userId);
          return (
            <li key={o.id}>
              <Link to={hrefFor(o.id)} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <ListingThumb src={o.item.coverImage} category={o.item.category} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900 truncate">{o.item.title}</span>
                  <span className="block text-xs text-gray-500">
                    {o.number} · {formatDate(o.createdAt)}
                  </span>
                </span>
                <OrderStatusBadge order={o} perspective={perspectiveOf(o, userId) ?? 'buyer'} />
                {unread > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center">{unread}</span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
