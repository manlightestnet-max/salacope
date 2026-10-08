import React from 'react';
import { Card, EmptyState } from '@/shared/ui';
import { useOrderView } from '../../hooks';
import { perspectiveOf } from '../../model';
import { ChatHeader } from '../ChatHeader';
import { OrderActivity } from '../OrderActivity';

/** One conversation (one order), full height: the other party on top, the feed and the composer below. */
export const ChatRoom: React.FC<{ orderId: string; userId: string; backTo?: string }> = ({ orderId, userId, backTo }) => {
  const view = useOrderView(orderId);
  const perspective = view && perspectiveOf(view.order, userId);
  if (!view || !perspective) return <EmptyState title="Discussion introuvable" className="rounded-2xl border border-gray-200/70 bg-surface" />;
  return (
    <Card className="h-full min-h-0 flex flex-col overflow-hidden max-lg:rounded-none max-lg:border-0">
      <ChatHeader order={view.order} perspective={perspective} seller={view.seller} withOrder backTo={backTo} />
      <div className="flex-1 min-h-0">
        <OrderActivity order={view.order} userId={userId} users={view.users} bare fill />
      </div>
    </Card>
  );
};
