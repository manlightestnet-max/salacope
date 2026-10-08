import React from 'react';
import clsx from 'clsx';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import { ListingKind, useDb } from '@/shared/db';
import { EmptyState, Page, Tabs } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useBackLink } from '@/shared/hooks';
import { useCurrentUser } from '@/features/session';
import { ChatRoom, ConversationList, CounterpartOrders, useConversations, useUnreadCount } from '@/features/orders';

const KINDS: { value: ListingKind; label: string; param: string }[] = [
  { value: 'digital', label: 'Produits digitaux', param: 'produits' },
  { value: 'service', label: 'Services', param: 'services' },
];

/**
 * `/ac/messages[/:orderId]`: every conversation, digital products and services apart.
 * One room per order (never duplicated); a person with several orders asks which one.
 * Desktop: list + room side by side. Phone: the list, then the room on its own.
 */
export const MessagesPage: React.FC = () => {
  const user = useCurrentUser();
  const { id: roomId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomKind = useDb((s) => s.orders.find((o) => o.id === roomId)?.item.kind, [roomId]);
  const digital = useConversations(user.id, 'digital');
  const services = useConversations(user.id, 'service');
  const unreadDigital = useUnreadCount(user.id, 'digital');
  const unreadServices = useUnreadCount(user.id, 'service');

  const asked = KINDS.find((k) => k.param === params.get('type'))?.value;
  const kind: ListingKind = roomKind ?? asked ?? (digital.length === 0 && services.length > 0 ? 'service' : 'digital');
  const list = kind === 'digital' ? digital : services;
  const param = KINDS.find((k) => k.value === kind)!.param;
  const withId = params.get('avec');
  const picking = !roomId && withId ? list.find((c) => c.counterpartId === withId) : undefined;
  const back = useBackLink({ to: `${ROUTES.account.messages}?type=${param}`, label: 'Messages' });
  const open = Boolean(roomId || picking);

  const tabs = KINDS.map((k) => ({
    value: k.value,
    label: k.label,
    count: (k.value === 'digital' ? unreadDigital : unreadServices) || undefined,
  }));

  return (
    <Page
      fill
      title="Messages"
      back={open ? back : undefined}
      toolbar={
        <Tabs
          bare
          value={kind}
          items={tabs}
          onChange={(v) => navigate(`${ROUTES.account.messages}?type=${KINDS.find((k) => k.value === v)!.param}`)}
        />
      }
    >
      {digital.length + services.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Aucune discussion"
          description="Chaque commande a sa discussion avec l’autre partie : elle apparaît ici dès le premier achat ou la première vente."
          className="rounded-2xl border border-gray-200/70 bg-surface"
        />
      ) : (
        <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4">
          <section className={clsx('min-h-0 overflow-y-auto rounded-2xl border border-gray-200/70 bg-surface', open && 'hidden lg:block')}>
            {list.length ? (
              <ConversationList
                conversations={list}
                userId={user.id}
                hrefFor={(c) => (c.orders.length === 1 ? ROUTES.account.chat(c.orders[0].id) : `${ROUTES.account.messages}?type=${param}&avec=${c.counterpartId}`)}
                isSelected={(c) => c.counterpartId === withId || c.orders.some((o) => o.id === roomId)}
              />
            ) : (
              <EmptyState title={kind === 'digital' ? 'Aucune discussion sur un produit' : 'Aucune discussion sur un service'} />
            )}
          </section>

          <div className={clsx('min-h-0', !open && 'hidden lg:block')}>
            {roomId ? (
              <ChatRoom orderId={roomId} userId={user.id} />
            ) : picking ? (
              <CounterpartOrders conversation={picking} userId={user.id} hrefFor={ROUTES.account.chat} />
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-gray-200 flex items-center justify-center">
                <p className="text-sm text-gray-500">Choisissez une discussion.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
};
