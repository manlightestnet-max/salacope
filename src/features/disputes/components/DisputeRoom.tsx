import React from 'react';
import { Attachment } from '@/shared/db';
import { Avatar, Badge, Card, EmptyState, SkeletonRows } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatXaf } from '@/shared/lib';
import { ChatComposer, ChatFeed, ChatHeaderBar, ChatMessage } from '@/features/orders';
import salacopeMark from '@/shared/assets/salacope-mark.png';
import { DisputeDetail } from '../api';

const CLOSED: Record<string, string> = { seller: 'Clos : vendeur payé', buyer: 'Clos : acheteur remboursé', warning: 'Clos : avertissement', cleared: 'Clos : sans suite' };

/**
 * One dispute room, built from the same parts as the order chat (Messages): the header bar, the feed, the bubbles and the
 * composer. The room serves the seller, the buyer and Salacope; `viewerId` is the person's account (null for the
 * administration, which writes as Salacope). `actions` goes in the header (the administration's shortcuts, a link to the order).
 */
export const DisputeRoom: React.FC<{
  detail: DisputeDetail | undefined;
  error?: string;
  viewerId: string | null;
  onSend: (body: string, files: Attachment[]) => Promise<void>;
  actions?: React.ReactNode;
}> = ({ detail, error, viewerId, onSend, actions }) => {
  const run = useServiceAction();

  if (error && !detail) return <EmptyState title="Litige introuvable" description={error} className="rounded-2xl border border-gray-200/70 bg-surface" />;
  if (!detail) {
    return (
      <Card className="h-full p-5">
        <SkeletonRows rows={4} />
      </Card>
    );
  }
  const { dispute, order, subject, messages, me } = detail;
  const open = dispute.status === 'open';
  // Who is on the other side, for the person looking: a seller sees the buyer, a buyer the seller, an accused account Salacope.
  const other = me === 'seller' ? order?.buyerName : me === 'buyer' ? order?.sellerName : me === 'accused' ? 'Salacope' : subject?.name ?? order?.title ?? 'Litige';
  const line = order
    ? `${order.number} · ${order.title} · ${formatXaf(order.total)}${me === 'admin' ? ` · ${order.sellerName} ↔ ${order.buyerName}` : ''}`
    : `${dispute.title ?? 'Conduite'}${subject?.listing ? ` · ${subject.listing.title}` : ''}${subject?.warnings ? ` · ${subject.warnings} avertissement${subject.warnings > 1 ? 's' : ''}` : ''}`;

  return (
    <Card className="h-full min-h-0 flex flex-col overflow-hidden">
      <ChatHeaderBar
        avatar={<Avatar name={other ?? 'Litige'} />}
        title={`${dispute.label} · ${other}`}
        subtitle={line}
        trailing={
          <>
            <Badge tone={open ? 'danger' : 'neutral'} dot>
              {open ? 'Ouvert' : CLOSED[dispute.outcome ?? ''] ?? 'Clos'}
            </Badge>
            {actions}
          </>
        }
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatFeed fill watch={messages.length}>
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              name={m.role === 'salacope' ? 'Support Salacope' : m.name}
              avatar={
                m.role === 'salacope' ? (
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#0b0d0c] flex items-center justify-center">
                    <img src={salacopeMark} alt="" width={128} height={110} className="w-3.5 h-auto" />
                  </span>
                ) : (
                  <Avatar name={m.name} size="sm" />
                )
              }
              mine={viewerId === null ? m.role === 'salacope' : m.authorId === viewerId}
              ownName={viewerId === null ? 'Salacope' : undefined}
            />
          ))}
        </ChatFeed>
        {open ? (
          <ChatComposer placeholder={viewerId === null ? 'Écrire au nom de Salacope…' : 'Votre message…'} onSend={(body, files) => run(() => onSend(body, files))} />
        ) : (
          <p className="shrink-0 border-t border-gray-100 px-5 py-3 text-sm text-gray-500">Ce litige est clos : la décision est prise.</p>
        )}
      </div>
    </Card>
  );
};
