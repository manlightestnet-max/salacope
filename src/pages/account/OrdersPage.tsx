import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Button, EmptyState, Page, Segmented, Table, TBody, THead, Td, Th, Tr, Tabs } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName, useCurrentUser } from '@/features/session';
import { KIND_FILTERS, KindBadge, KindFilter, ListingThumb } from '@/features/catalog';
import {
  ORDER_STATUS_FILTERS,
  OrderFilter,
  OrderList,
  OrderStatusBadge,
  buyerFollowUp,
  matchesFilter,
  useBuyerOrders,
} from '@/features/orders';

/**
 * `/compte/achats`: every purchase in a table (order, offer, type, status, next step, amount),
 * filtered by status and by kind: digital products apart from services.
 */
export const OrdersPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useBuyerOrders(user.id);
  const users = useDb((s) => s.users, []);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');

  const ofKind = useMemo(() => orders.filter((o) => kind === 'all' || o.item.kind === kind), [orders, kind]);
  const visible = useMemo(() => ofKind.filter((o) => matchesFilter(o, filter, 'buyer')), [ofKind, filter]);
  const tabs = ORDER_STATUS_FILTERS.map((f) => ({
    ...f,
    label: f.value === 'todo' ? 'À valider' : f.label,
    count: ofKind.filter((o) => matchesFilter(o, f.value, 'buyer')).length,
  }));
  const seller = (sellerId: string) => displayName(users.find((u) => u.id === sellerId));
  const spent = visible.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.amounts.total, 0);

  return (
    <Page
      title="Mes achats"
      actions={orders.length > 0 && <Segmented label="Type d'achat" value={kind} options={KIND_FILTERS} onChange={setKind} />}
      toolbar={orders.length > 0 && <Tabs bare value={filter} items={tabs} onChange={setFilter} />}
    >
      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucun achat" action={<Button to={ROUTES.account.explorer}>Explorer le catalogue</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState title="Aucun achat dans cette vue" />
      ) : (
        <>
          <p className="mb-3 px-1 text-sm text-gray-500">
            {plural(visible.length, 'achat')} · {formatXaf(spent)} dépensés
          </p>

          <div className="hidden md:block">
            <Table>
              <THead>
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
    </Page>
  );
};
