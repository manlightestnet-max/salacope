import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Ban, Timer } from 'lucide-react';
import { useDb } from '@/shared/db';
import { Avatar } from '@/shared/ui';
import { formatRelative } from '@/shared/lib';
import { displayName } from '@/features/session';
import { Conversation, messagePreview } from '../../chat';

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
  return (
    <li>
      <Link
        to={href}
        className={clsx('flex items-center gap-3 px-4 py-3 transition-colors', selected ? 'bg-gray-100' : 'hover:bg-gray-50')}
        aria-current={selected || undefined}
      >
        <Avatar name={name} src={logo} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={clsx('flex-1 min-w-0 truncate text-sm text-gray-900', c.unread ? 'font-semibold' : 'font-medium')}>{name}</span>
            <span className={clsx('shrink-0 text-[11px]', c.unread ? 'text-primary-600 font-medium' : 'text-gray-400')}>{formatRelative(c.lastAt)}</span>
          </span>
          <span className="flex items-center gap-2 mt-0.5">
            <span className={clsx('flex-1 min-w-0 truncate text-xs', c.unread ? 'text-gray-800' : 'text-gray-500')}>
              {c.last ? `${mine ? 'Vous : ' : ''}${messagePreview(c.last)}` : order.item.title}
            </span>
            {order.chat?.ephemeral && <Timer className="w-3 h-3 text-gray-400 shrink-0" aria-label="Messages éphémères" />}
            {order.chat?.blocked && <Ban className="w-3 h-3 text-gray-400 shrink-0" aria-label="Bloqué" />}
            {c.unread > 0 && (
              <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center tabular-nums">
                {c.unread}
              </span>
            )}
          </span>
          {c.orders.length > 1 && <span className="block mt-0.5 text-[11px] text-gray-400">{c.orders.length} commandes</span>}
        </span>
      </Link>
    </li>
  );
};

/** Inbox in the style of a messaging app: one line per person, latest first, unread in bold. */
export const ConversationList: React.FC<{
  conversations: Conversation[];
  userId: string;
  hrefFor: (c: Conversation) => string;
  isSelected: (c: Conversation) => boolean;
}> = ({ conversations, userId, hrefFor, isSelected }) => (
  <ul className="stagger divide-y divide-gray-100">
    {conversations.map((c) => (
      <Row key={c.counterpartId} conversation={c} userId={userId} href={hrefFor(c)} selected={isSelected(c)} />
    ))}
  </ul>
);
