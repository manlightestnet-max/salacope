import React from 'react';
import clsx from 'clsx';
import { useParams } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Button, EmptyState, MoreRows, Page, SkeletonRows } from '@/shared/ui';
import { usePagedList } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { DisputeList, DisputeRoom, disputesApi, useDisputeRoom } from '@/features/disputes';

/**
 * `/dashboard/litiges[/:id]` (seller) and `/ac/litiges[/:id]` (buyer): the dispute rooms, in the style of Messages.
 * Desktop: the list and the room side by side. Phone: the list, then the room on its own.
 */
export const DisputesPage: React.FC<{ as: 'seller' | 'buyer' }> = ({ as }) => {
  const user = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const base = as === 'seller' ? ROUTES.seller.disputes : ROUTES.account.disputes;
  const hrefFor = as === 'seller' ? ROUTES.seller.dispute : ROUTES.account.dispute;
  const list = usePagedList((offset) => disputesApi.list(offset), []);
  const room = useDisputeRoom(id, disputesApi.detail);

  return (
    <Page
      fill
      title="Litiges"
      help="Quand un acheteur signale un problème, l’argent reste bloqué et une salle s’ouvre ici : vous, l’acheteur et Salacope y échangez, puis Salacope décide."
      back={id ? { to: base, label: 'Litiges' } : undefined}
    >
      {list.error && !list.items ? (
        <EmptyState title="Litiges indisponibles" description={list.error} />
      ) : !list.items ? (
        <SkeletonRows rows={4} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Aucun litige"
          description="Quand un acheteur signale un problème sur une commande, la salle du litige apparaît ici."
          className="rounded-2xl border border-gray-200/70 bg-surface"
        />
      ) : (
        <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4">
          <section className={clsx('min-h-0 overflow-y-auto rounded-2xl border border-gray-200/70 bg-surface', id && 'hidden lg:block')}>
            <DisputeList
              selectedId={id}
              hrefFor={hrefFor}
              items={list.items.map((d) => ({
                id: d.id,
                label: d.label,
                name: d.counterpart,
                subtitle: d.last_body ?? d.title,
                at: d.updated_at,
                open: d.status === 'open',
                unread: d.unread,
              }))}
            />
            <MoreRows hasMore={list.hasMore} loading={list.loadingMore} sentinelRef={list.sentinelRef} onMore={list.next} />
          </section>
          <div className={clsx('min-h-0', !id && 'hidden lg:block')}>
            {id ? (
              <DisputeRoom
                detail={room.detail}
                error={room.error}
                viewerId={user.id}
                onSend={async (body, files) => {
                  room.set(await disputesApi.send(id, body, files));
                }}
                actions={
                  room.detail && (
                    <Button size="sm" variant="ghost" to={as === 'seller' ? ROUTES.seller.sale(room.detail.order.id) : ROUTES.account.order(room.detail.order.id)}>
                      Commande
                    </Button>
                  )
                }
              />
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-gray-200 flex items-center justify-center">
                <p className="text-sm text-gray-500">Choisissez un litige.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
};
