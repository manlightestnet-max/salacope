import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Avatar, EmptyState, List, ListRow, Page, Panel, SearchField } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { useSellerOrders } from '@/features/orders';

/**
 * The store's customers, by amount spent: a tap opens the customer's own screen (summary, orders). Contact happens only
 * in each order's conversation.
 */
export const CustomersPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    const byBuyer = new Map<string, { id: string; name: string; orders: number; spent: number; lastOrderAt: string }>();
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

  return (
    <Page
      title="Clients"
      help="Les personnes qui ont acheté dans votre boutique. Leurs coordonnées restent privées : vous échangez dans la conversation de chaque commande."
      actions={customers.length > 0 && <SearchField value={search} onChange={setSearch} placeholder="Nom du client" className="w-40 sm:w-64" />}
    >
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client" description="Vos clients apparaîtront après leur premier achat." className="rounded-2xl border border-gray-200/70 bg-surface" />
      ) : (
        <Panel title="Répertoire" count={visible.length} flush>
          {visible.length ? (
            <List columns={{ main: 'Client', meta: 'Commandes', trailing: 'Dépensé' }}>
              {visible.map((c) => (
                <ListRow
                  key={c.id}
                  to={ROUTES.seller.customer(c.id)}
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
      )}
    </Page>
  );
};
