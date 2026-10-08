import React, { useMemo } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Button, EmptyState, Page, Panel, Segmented, Select, Stat, StatGrid, Table, TBody, THead, Td, Th, Tr, Tabs } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { formatDate, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { usePersistedState } from '@/shared/hooks';
import { displayName, useCurrentUser } from '@/features/session';
import { KIND_FILTERS, KindBadge, KindFilter, ListingThumb } from '@/features/catalog';
import {
  ORDER_STATUS_FILTERS,
  OrderFilter,
  OrderPeriod,
  inPeriod,
  periodOptions,
  OrderList,
  OrderStatusBadge,
  buyerFollowUp,
  matchesFilter,
  useBuyerOrders,
} from '@/features/orders';

/**
 * `/ac/achats`: every purchase in a table (order, offer, type, status, next step, amount),
 * filtered by status and by kind: digital products apart from services.
 */
export const OrdersPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useBuyerOrders(user.id);
  const users = useDb((s) => s.users, []);
  const navigate = useNavigate();
  // Opening an order and coming back finds the list as it was: same filters, same scroll.
  const [filter, setFilter] = usePersistedState<OrderFilter>('orders:filter', 'all');
  const [kind, setKind] = usePersistedState<KindFilter>('orders:kind', 'all');
  const [period, setPeriod] = usePersistedState<OrderPeriod>('orders:period', 'all');
  const periods = useMemo(() => periodOptions(orders), [orders]);

  const ofKind = useMemo(() => orders.filter((o) => (kind === 'all' || o.item.kind === kind) && inPeriod(o, period)), [orders, kind, period]);
  const visible = useMemo(() => ofKind.filter((o) => matchesFilter(o, filter, 'buyer')), [ofKind, filter]);
  const tabs = ORDER_STATUS_FILTERS.map((f) => ({
    ...f,
    label: f.value === 'todo' ? 'À valider' : f.label,
    count: ofKind.filter((o) => matchesFilter(o, f.value, 'buyer')).length,
  }));
  const seller = (sellerId: string) => displayName(users.find((u) => u.id === sellerId));
  const spent = visible.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.amounts.total, 0);
  const toValidate = ofKind.filter((o) => matchesFilter(o, 'todo', 'buyer')).length;
  const held = ofKind.filter((o) => ['paid', 'in_progress', 'delivered', 'disputed'].includes(o.status)).reduce((s, o) => s + o.amounts.total, 0);

  return (
    <Page
      fill
      title="Mes achats"
      help="Vos commandes et leur suivi. Tant que vous n’avez pas validé, votre argent reste bloqué chez LightPay : le vendeur n’est pas encore payé."
      actions={orders.length > 0 && <Segmented label="Type d'achat" value={kind} options={KIND_FILTERS} onChange={setKind} />}
      toolbar={orders.length > 0 && <Tabs bare value={filter} items={tabs} onChange={setFilter} />}
    >
      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucun achat"
          action={<Button to={ROUTES.account.explorer}>Explorer le catalogue</Button>}
          className="rounded-2xl border border-gray-200/70 bg-surface"
        />
      ) : (
        // The history card stays pinned below the overview; only its rows scroll.
        <div className="h-full flex flex-col gap-4 lg:gap-6">
          <Panel title="Aperçu" className="shrink-0 hidden sm:block">
            <StatGrid columns={3}>
              <Stat label="Achats" value={visible.length} hint={`${formatXaf(spent)} dépensés`} />
              <Stat label="À valider" value={toValidate} help="Livraisons à vérifier, ou demandes de délai auxquelles répondre." />
              <Stat label="Protégé par LightPay" value={formatXaf(held)} help="Montant de vos commandes en cours : bloqué jusqu’à votre validation, remboursé en cas d’annulation." />
            </StatGrid>
          </Panel>

          <Panel
            title="Historique"
            count={visible.length}
            flush
            className="flex-1 min-h-0 flex flex-col"
            bodyClassName="flex-1 min-h-0 overflow-y-auto"
            scrollKey="orders"
            actions={<Select aria-label="Période" value={period} options={periods} onChange={setPeriod} />}
          >
            {visible.length === 0 ? (
              <EmptyState title="Aucun achat dans cette vue" />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table className="!overflow-visible">
                    <THead sticky>
                      <Th>Commande</Th>
                      <Th>Offre</Th>
                      <Th>Type</Th>
                      <Th>Statut</Th>
                      <Th>Suivi</Th>
                      <Th align="right">Montant</Th>
                    </THead>
                    <TBody>
                      {visible.map((o) => {
                        const next = buyerFollowUp(o);
                        return (
                          <Tr key={o.id} onClick={() => navigate(ROUTES.account.order(o.id))}>
                            <Td className="whitespace-nowrap">
                              <div className="font-medium text-gray-900">{o.number}</div>
                              <div className="text-xs text-gray-500">{formatDate(o.createdAt)}</div>
                            </Td>
                            <Td className="w-full max-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <ListingThumb src={o.item.coverImage} category={o.item.category} />
                                <div className="min-w-0">
                                  <div className="text-gray-900 truncate">{o.item.title}</div>
                                  <div className="text-xs text-gray-500 truncate">{seller(o.sellerId)}</div>
                                </div>
                              </div>
                            </Td>
                            <Td>
                              <KindBadge kind={o.item.kind} category={o.item.category} />
                            </Td>
                            <Td>
                              <OrderStatusBadge order={o} perspective="buyer" />
                            </Td>
                            <Td className={clsx('text-xs max-w-[14rem]', next.urgent ? 'text-amber-600 font-medium' : 'text-gray-500')}>{next.text}</Td>
                            <Td align="right" className="font-medium text-gray-900 whitespace-nowrap">
                              {formatXaf(o.amounts.total)}
                            </Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <OrderList showKind orders={visible} perspective="buyer" counterpartyName={(o) => seller(o.sellerId)} hrefFor={(o) => ROUTES.account.order(o.id)} />
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </Page>
  );
};
