import React, { useMemo, useState } from 'react';
import { CheckCircle2, ReceiptText } from 'lucide-react';
import { EmptyState, ListSection, Page, SearchField, Select, Tabs } from '@/shared/ui';
import { Order } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { useCurrentUser } from '@/features/session';
import { OrderList, SELLER_LANES, SellerLane, sellerLane, useSellerOrders, useSellerTagList } from '@/features/orders';

type View = 'todo' | 'waiting' | 'completed' | 'cancelled' | 'all';

const VIEW_LANES: Record<Exclude<View, 'all'>, SellerLane[]> = {
  todo: SELLER_LANES.filter((l) => l.todo).map((l) => l.lane),
  waiting: ['waiting_buyer'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

/** What each lane of the queue means (ⓘ). */
const LANE_HELP: Partial<Record<SellerLane, string>> = {
  disputed: 'Le client a signalé un problème : l’argent est gelé par LightPay jusqu’à la décision.',
  late: 'La date de livraison est passée : livrez ou demandez un délai au client.',
  to_accept: 'Payées par le client, en attente de votre acceptation.',
  revision: `Le client a demandé une retouche : vous avez ${PLATFORM.revisionDays} jours pour relivrer.`,
  to_deliver: 'Acceptées, à livrer avant la date prévue.',
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
  const [client, setClient] = useState('');
  const [tag, setTag] = useState('');
  const tags = useSellerTagList(user.id);

  // One entry per client (their name as shown on their orders), alphabetical.
  const clients = useMemo(() => {
    const byId = new Map(orders.map((o) => [o.buyerId, o.buyer.name]));
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr')).map(([value, label]) => ({ value, label }));
  }, [orders]);

  // Search (number, client, offer, tag), then the client and tag filters.
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter(
      (o) =>
        (!q || [o.number, o.item.title, o.buyer.name, ...(o.sellerMeta?.tags ?? [])].some((v) => v.toLowerCase().includes(q))) &&
        (!client || o.buyerId === client) &&
        (!tag || o.sellerMeta?.tags.includes(tag))
    );
  }, [orders, search, client, tag]);
  // Pinned sales sit on top of every view, once.
  const pinned = filtered
    .filter((o) => o.sellerMeta?.pinnedAt)
    .sort((a, b) => (b.sellerMeta!.pinnedAt ?? '').localeCompare(a.sellerMeta!.pinnedAt ?? ''));
  const matching = filtered.filter((o) => !o.sellerMeta?.pinnedAt);
  const filtering = Boolean(search || client || tag);

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

  const empty = (title: string) => <EmptyState icon={CheckCircle2} title={title} className="rounded-2xl border border-gray-200/70 bg-surface" />;

  let content: React.ReactNode;
  if (orders.length === 0) {
    content = (
      <EmptyState
        icon={ReceiptText}
        title="Aucune vente pour le moment"
        description="Vos commandes apparaîtront ici dès le premier paiement."
        className="rounded-2xl border border-gray-200/70 bg-surface"
      />
    );
  } else if (view === 'todo') {
    const lanes = SELLER_LANES.filter((l) => l.todo)
      .map((l) => ({ ...l, items: matching.filter((o) => sellerLane(o) === l.lane).sort(byDeadline) }))
      .filter((l) => l.items.length > 0);
    content = lanes.length ? (
      <div className="space-y-6">
        {lanes.map((l) => (
          <ListSection key={l.lane} title={l.label} count={l.items.length} help={LANE_HELP[l.lane]}>
            {list(l.items)}
          </ListSection>
        ))}
      </div>
    ) : (
      !pinned.length && empty(filtering ? 'Aucune commande ne correspond' : 'Tout est à jour')
    );
  } else {
    const items = view === 'all' ? matching : matching.filter((o) => VIEW_LANES[view].includes(sellerLane(o)));
    const tab = tabs.find((t) => t.value === view)!;
    content = (
      <ListSection title={tab.label} count={items.length}>
        {items.length ? list(items) : <EmptyState title="Aucune commande dans cette vue" />}
      </ListSection>
    );
  }

  return (
    <Page
      title="Ventes"
      help="Vos commandes rangées par prochaine action, la plus urgente en premier."
      actions={orders.length > 0 && <SearchField value={search} onChange={setSearch} placeholder="N°, client, offre…" className="w-40 sm:w-64" />}
      toolbar={
        orders.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3">
            <Tabs bare value={view} items={tabs} onChange={setView} className="min-w-0" />
            <div className="flex gap-2 pb-2 sm:py-2 sm:ml-auto shrink-0">
              <Select aria-label="Client" value={client} options={[{ value: '', label: 'Tous les clients' }, ...clients]} onChange={setClient} />
              {tags.length > 0 && (
                <Select aria-label="Tag" value={tag} options={[{ value: '', label: 'Tous les tags' }, ...tags.map((t) => ({ value: t, label: t }))]} onChange={setTag} />
              )}
            </div>
          </div>
        )
      }
    >
      {pinned.length > 0 && (
        <ListSection title="Épinglées" count={pinned.length} className="mb-6">
          {list(pinned)}
        </ListSection>
      )}
      {content}
    </Page>
  );
};
