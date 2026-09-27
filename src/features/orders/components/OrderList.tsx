import React from 'react';
import clsx from 'clsx';
import { Order } from '@/shared/db';
import { KindBadge, ListingThumb } from '@/features/catalog';
import { List, ListRow } from '@/shared/ui';
import { formatDate, formatRelative, formatXaf } from '@/shared/lib';
import { Perspective, hasPendingExtension, isLate } from '../model';
import { OrderStatusBadge } from './OrderStatusBadge';

export interface OrderListProps {
  orders: Order[];
  perspective: Perspective;
  /** Counterparty name for each order (buyer for sellers, store for buyers); omitted when obvious. */
  counterpartyName?: (order: Order) => string;
  hrefFor: (order: Order) => string;
  /** Shows the digital / service badge next to the status. */
  showKind?: boolean;
  /** Column labels above the rows (default: on). */
  columns?: boolean;
}

/** The deadline that matters now, for the seller. */
const SellerDue: React.FC<{ order: Order }> = ({ order }) => {
  if (order.status === 'in_progress' && order.dueAt) {
    return (
      <span className={clsx('text-xs', isLate(order) ? 'text-red-600' : 'text-gray-500')}>
        {isLate(order) ? `prévue ${formatRelative(order.dueAt)}` : `à livrer ${formatRelative(order.dueAt)}`}
        {hasPendingExtension(order) && ' · délai demandé'}
      </span>
    );
  }
  if (order.status === 'delivered' && order.releaseAt) {
    return <span className="text-xs text-gray-500">payé {formatRelative(order.releaseAt)}</span>;
  }
  return null;
};

/** Orders as rows: cover, title, reference, status and amount. Same layout on every screen size. */
export const OrderList: React.FC<OrderListProps> = ({ orders, perspective, counterpartyName, hrefFor, showKind = false, columns = true }) => {
  const isSeller = perspective === 'seller';
  return (
    <List columns={columns ? { main: 'Commande', meta: 'Statut', trailing: isSeller ? 'Net pour vous' : 'Total' } : undefined}>
      {orders.map((o) => (
        <ListRow
          key={o.id}
          to={hrefFor(o)}
          leading={<ListingThumb src={o.item.coverImage} category={o.item.category} size="md" />}
          title={o.item.title}
          subtitle={[o.number, counterpartyName?.(o), formatDate(o.createdAt)].filter(Boolean).join(' · ')}
          meta={
            <>
              {showKind && <KindBadge kind={o.item.kind} category={o.item.category} />}
              <OrderStatusBadge order={o} perspective={perspective} />
            </>
          }
          trailing={
            <span className="flex flex-col items-end gap-0.5">
              <span className="font-medium text-gray-900">{formatXaf(isSeller ? o.amounts.net : o.amounts.total)}</span>
              {isSeller && <SellerDue order={o} />}
            </span>
          }
        />
      ))}
    </List>
  );
};
