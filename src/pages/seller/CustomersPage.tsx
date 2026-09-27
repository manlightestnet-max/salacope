import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Avatar, EmptyState, List, ListRow, Page, SearchField } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { useCurrentUser } from '@/features/session';
import { useSellerOrders } from '@/features/orders';

interface Customer {
  id: string;
  name: string;
  orders: number;
  spent: number;
  lastOrderAt: string;
}

export const CustomersPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    const byBuyer = new Map<string, Customer>();
    orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((o) => {
        const c = byBuyer.get(o.buyerId) ?? {
          id: o.buyerId,
          name: o.buyer.name,
          orders: 0,
          spent: 0,
          lastOrderAt: o.createdAt,
        };
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
      meta={<span className="ml-2 text-sm text-gray-400 tabular-nums">{customers.length}</span>}
      actions={customers.length > 0 && <SearchField value={search} onChange={setSearch} placeholder="Nom du client" className="w-40 sm:w-64" />}
    >
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client" />
      ) : (
        <List>
          {visible.map((c) => (
            <ListRow
              key={c.id}
              leading={<Avatar name={c.name} />}
              title={c.name}
              trailing={
                <span className="flex flex-col items-end gap-0.5">
                  <span className="font-medium text-gray-900">{formatXaf(c.spent)}</span>
                  <span className="text-xs text-gray-500">
                    {plural(c.orders, 'commande')} · {formatDate(c.lastOrderAt)}
                  </span>
                </span>
              }
            />
          ))}
        </List>
      )}
    </Page>
  );
};
