import React, { useMemo, useState } from 'react';
import { CheckCircle2, ReceiptText } from 'lucide-react';
import { EmptyState, ListSection, Page, SearchField, Tabs } from '@/shared/ui';
import { Order } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { OrderList, SELLER_LANES, SellerLane, sellerLane, useSellerOrders } from '@/features/orders';

type View = 'todo' | 'waiting' | 'completed' | 'cancelled' | 'all';

const VIEW_LANES: Record<Exclude<View, 'all'>, SellerLane[]> = {
  todo: SELLER_LANES.filter((l) => l.todo).map((l) => l.lane),
  waiting: ['waiting_buyer'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

/** Oldest deadline first inside a lane. */
const byDeadline = (a: Order, b: Order) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt);

/**
 * Sales as a work queue: what needs doing is grouped by next action (disputes, late,
 * to accept, revisions, to deliver), most urgent first. Other views are plain lists.
 */
export const SalesPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const [view, setView] = useState<View>('todo');
  const [search, setSearch] = useState('');

  const matching = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter(
      (o) => !q || [o.number, o.item.title, o.buyer.name].some((v) => v.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const count = (v: View) => (v === 'all' ? orders.length : orders.filter((o) => VIEW_LANES[v].includes(sellerLane(o))).length);
  const tabs = [
    { value: 'todo' as const, label: 'À traiter', count: count('todo') },
    { value: 'waiting' as const, label: 'Chez le client', count: count('waiting') },
    { value: 'completed' as const, label: 'Terminées', count: count('completed') },
    { value: 'cancelled' as const, label: 'Annulées', count: count('cancelled') },
    { value: 'all' as const, label: 'Toutes', count: count('all') },
  ];

  const list = (items: Order[]) => (
    <OrderList orders={items} perspective="seller" counterpartyName={(o) => o.buyer.name} hrefFor={(o) => ROUTES.seller.sale(o.id)} />
  );

  let content: React.ReactNode;
  if (orders.length === 0) {
    content = <EmptyState icon={ReceiptText} title="Aucune vente pour le moment" />;
  } else if (view === 'todo') {
    const lanes = SELLER_LANES.filter((l) => l.todo)
      .map((l) => ({ ...l, items: matching.filter((o) => sellerLane(o) === l.lane).sort(byDeadline) }))
      .filter((l) => l.items.length > 0);
    content = lanes.length ? (
      <div className="space-y-8">
        {lanes.map((l) => (
          <ListSection key={l.lane} title={l.label} count={l.items.length}>
            {list(l.items)}
          </ListSection>
        ))}
      </div>
    ) : (
      <EmptyState icon={CheckCircle2} title={search ? 'Aucune commande ne correspond' : 'Tout est à jour'} />
    );
  } else {
    const items = view === 'all' ? matching : matching.filter((o) => VIEW_LANES[view].includes(sellerLane(o)));
    content = items.length ? list(items) : <EmptyState title="Aucune commande dans cette vue" />;
  }

  return (
    <Page
      title="Ventes"
      actions={orders.length > 0 && <SearchField value={search} onChange={setSearch} placeholder="N°, client, offre…" className="w-40 sm:w-64" />}
      toolbar={orders.length > 0 && <Tabs bare value={view} items={tabs} onChange={setView} />}
    >
      {content}
    </Page>
  );
};
