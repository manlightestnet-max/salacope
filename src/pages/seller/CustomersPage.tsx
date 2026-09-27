import React, { useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { Avatar, EmptyState, List, ListRow, Page, Panel, SearchField, Stat, StatGrid } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { OrderList, useSellerOrders } from '@/features/orders';

interface Customer {
  id: string;
  name: string;
  orders: number;
  spent: number;
  lastOrderAt: string;
}

/**
 * The store's customers (by amount spent) and, beside them, the selected customer's
 * figures and orders. Contact happens only in each order's conversation.
 */
export const CustomersPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const detailRef = useRef<HTMLDivElement>(null);

  const customers = useMemo(() => {
    const byBuyer = new Map<string, Customer>();
    orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((o) => {
        const c = byBuyer.get(o.buyerId) ?? { id: o.buyerId, name: o.buyer.name, orders: 0, spent: 0, lastOrderAt: o.createdAt };
        c.orders += 1;
        c.spent += o.amounts.total;
        if (o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt;
        byBuyer.set(o.buyerId, c);
      });
    return [...byBuyer.values()].sort((a, b) => b.spent - a.spent);
  }, [orders]);

  const q = search.toLowerCase().trim();
  const visible = customers.filter((c) => !q || c.name.toLowerCase().includes(q));
  const selected = customers.find((c) => c.id === selectedId) ?? visible[0];
  const selectedOrders = selected ? orders.filter((o) => o.buyerId === selected.id) : [];

  const select = (id: string) => {
    setSelectedId(id);
    // Phones: the detail sits under the list.
    if (window.matchMedia('(max-width: 1023px)').matches) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Page
      title="Clients"
      help="Les personnes qui ont acheté dans votre boutique. Leurs coordonnées restent privées : vous échangez dans la conversation de chaque commande."
      actions={customers.length > 0 && <SearchField value={search} onChange={setSearch} placeholder="Nom du client" className="w-40 sm:w-64" />}
    >
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client" description="Vos clients apparaîtront après leur premier achat." className="rounded-2xl border border-gray-200/70 bg-surface" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          <Panel title="Répertoire" count={visible.length} flush className="min-w-0">
            {visible.length ? (
              <List columns={{ main: 'Client', meta: 'Commandes', trailing: 'Dépensé' }}>
                {visible.map((c) => (
                  <ListRow
                    key={c.id}
                    onClick={() => select(c.id)}
                    selected={c.id === selected?.id}
                    leading={<Avatar name={c.name} />}
                    title={c.name}
                    subtitle={`Dernier achat le ${formatDate(c.lastOrderAt)}`}
                    meta={<span className="text-sm text-gray-700 tabular-nums">{plural(c.orders, 'commande')}</span>}
                    trailing={<span className="font-medium text-gray-900">{formatXaf(c.spent)}</span>}
                  />
                ))}
              </List>
            ) : (
              <EmptyState title="Aucun client ne correspond" />
            )}
          </Panel>

          <div ref={detailRef} className="lg:sticky lg:top-0 scroll-mt-4">
            {selected && (
              <Panel title="Détail du client">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={selected.name} size="lg" />
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 truncate">{selected.name}</div>
                    <div className="text-xs text-gray-500">Client depuis le {formatDate(selectedOrders[selectedOrders.length - 1]?.createdAt)}</div>
                  </div>
                </div>
                <StatGrid columns={2}>
                  <Stat label="Commandes" value={selected.orders} />
                  <Stat label="Dépensé" value={formatXaf(selected.spent)} help="Total payé par ce client, annulations exclues." />
                </StatGrid>
                <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ses commandes</h3>
                <div className="-mx-4 sm:-mx-5 border-t border-gray-200/70">
                  <OrderList
                    orders={selectedOrders}
                    perspective="seller"
                    columns={false}
                    hrefFor={(o) => ROUTES.seller.sale(o.id)}
                  />
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </Page>
  );
};
