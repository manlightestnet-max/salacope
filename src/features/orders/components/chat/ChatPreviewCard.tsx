import React from 'react';
import clsx from 'clsx';
import { MessagesSquare } from 'lucide-react';
import { Order, User } from '@/shared/db';
import { Button, Card } from '@/shared/ui';
import { formatRelative } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName } from '@/features/session';
import { messagePreview, unreadCount } from '../../chat';
import { Perspective } from '../../model';

/**
 * The conversation kept apart from the order details: the last messages at a glance and
 * the way into the room (Messages), where the back arrow returns to this order.
 */
export const ChatPreviewCard: React.FC<{ order: Order; perspective: Perspective; userId: string; users: Map<string, User> }> = ({
  order,
  perspective,
  userId,
  users,
}) => {
  const name = perspective === 'buyer' ? displayName(users.get(order.sellerId)) : order.buyer.name;
  const unread = unreadCount(order, userId);
  const last = order.messages.slice(-2);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessagesSquare className="w-4 h-4 text-gray-400" />
        <p className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">Discussion avec {name}</p>
        {unread > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center">{unread}</span>
        )}
      </div>
      {last.length ? (
        <ul className="space-y-1.5">
          {last.map((m) => (
            <li key={m.id} className={clsx('text-xs truncate', m.authorId === userId ? 'text-gray-500' : 'text-gray-800')}>
              <span className="font-medium">{m.authorId === userId ? 'Vous' : name}</span> · {messagePreview(m)}
              <span className="text-gray-400"> · {formatRelative(m.at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">Aucun message pour l’instant.</p>
      )}
      <Button size="sm" block variant={unread ? 'primary' : 'secondary'} to={ROUTES.account.chat(order.id)}>
        {unread ? `Lire ${unread > 1 ? `les ${unread} messages` : 'le message'}` : 'Ouvrir la discussion'}
      </Button>
    </Card>
  );
};
