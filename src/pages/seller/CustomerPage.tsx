import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, EmptyState, Page, Panel, Stat, StatGrid, Tabs } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { OrderList, useSellerOrders } from '@/features/orders';

type View = 'resume' | 'commandes';

/** `/dashboard/clients/:id`: one customer of the store, in tabs (summary, orders). */
export const CustomerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const [view, setView] = useRememberedParam<View>('seller.customer', 'vue', ['resume', 'commandes'], 'resume');
  const mine = useMemo(() => orders.filter((o) => o.buyerId === id), [orders, id]);
  const paid = mine.filter((o) => o.status !== 'cancelled');
  const back = { to: ROUTES.seller.customers, label: 'Clients' };

  if (!mine.length) {
    return (
      <Page title="Client" back={back} width="narrow">
        <EmptyState title="Client introuvable" />
      </Page>
    );
  }
  const name = mine[0].buyer.name;
  const since = mine[mine.length - 1].createdAt;

  return (
    <Page
      title={name}
      back={back}
      width="narrow"
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={setView}
          items={[
            { value: 'resume', label: 'Résumé' },
            { value: 'commandes', label: 'Commandes', count: mine.length },
          ]}
        />
      }
    >
      {view === 'resume' ? (
        <Panel>
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <div className="text-base font-semibold text-gray-900 truncate">{name}</div>
              <div className="text-xs text-gray-500">Client depuis le {formatDate(since)}</div>
            </div>
          </div>
          <StatGrid columns={2}>
            <Stat label="Commandes" value={plural(paid.length, 'commande')} />
            <Stat label="Dépensé" value={formatXaf(paid.reduce((n, o) => n + o.amounts.total, 0))} help="Total payé par ce client, annulations exclues." />
          </StatGrid>
        </Panel>
      ) : (
        <Panel title="Ses commandes" count={mine.length} flush>
          <OrderList orders={mine} perspective="seller" columns={false} hrefFor={(o) => ROUTES.seller.sale(o.id)} />
        </Panel>
      )}
    </Page>
  );
};
