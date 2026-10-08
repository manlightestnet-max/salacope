import React from 'react';
import { Link } from 'react-router-dom';
import { Pin } from 'lucide-react';
import clsx from 'clsx';
import { Order } from '@/shared/db';
import { KindBadge, ListingThumb, LoadingImage } from '@/features/catalog';
import { List, ListRow } from '@/shared/ui';
import { formatDate, formatRelative, formatXaf } from '@/shared/lib';
import { Perspective, hasPendingExtension, isLate } from '../model';
import { lastActivityAt, lastMessage, messagePreview, unreadCount } from '../chat';
import { OrderStatusBadge, OrderStatusIcon } from './OrderStatusBadge';
import { SellerTags } from './SellerOrderTools';

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

/** Phone row: the offer's picture as a small round avatar, the title, the last message, and the state as an icon. */
const PhoneRow: React.FC<{ order: Order; perspective: Perspective; href: string; fallback?: string }> = ({ order: o, perspective, href, fallback }) => {
  const me = perspective === 'seller' ? o.sellerId : o.buyerId;
  const last = lastMessage(o);
  const unread = unreadCount(o, me);
  const done = o.status === 'completed';
  const pinned = perspective === 'seller' && Boolean(o.sellerMeta?.pinnedAt);
  return (
    <li className={clsx(done && 'opacity-60')}>
      <Link to={href} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
        <span className="relative w-11 h-11 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-gray-950/[0.06]">
          <LoadingImage src={o.item.coverImage} className="absolute inset-0 w-full h-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            {pinned && <Pin className="w-3 h-3 shrink-0 text-gray-400" aria-label="Épinglée" />}
            <span className={clsx('truncate text-sm', done ? 'font-medium text-gray-500 line-through' : unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900')}>
              {o.item.title}
            </span>
          </span>
          <span className={clsx('block truncate text-xs mt-0.5', unread ? 'text-gray-800' : 'text-gray-500', !last && !fallback && 'italic text-gray-400')}>
            {last ? `${last.authorId === me ? 'Vous : ' : ''}${messagePreview(last)}` : fallback ?? 'Aucun message'}
          </span>
        </span>
        <span className="shrink-0 flex flex-col items-end gap-1.5">
          <span className={clsx('text-[11px]', unread ? 'font-medium text-primary-600' : 'text-gray-400')}>{formatRelative(lastActivityAt(o))}</span>
          <span className="flex items-center gap-1.5">
            {unread > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center tabular-nums">{unread}</span>
            )}
            <OrderStatusIcon order={o} perspective={perspective} />
          </span>
        </span>
      </Link>
    </li>
  );
};

/**
 * Compact rows: open orders first, finished ones apart in their own block (dimmed, titles struck through).
 * Phones in the order lists (`className="sm:hidden"`), every screen in the chat's order picker.
 */
export const CompactOrderList: React.FC<{
  orders: Order[];
  perspective: Perspective | ((o: Order) => Perspective);
  hrefFor: (o: Order) => string;
  counterpartyName?: (o: Order) => string;
  className?: string;
}> = ({ orders, perspective, hrefFor, counterpartyName, className }) => {
  const open = orders.filter((o) => o.status !== 'completed');
  const done = orders.filter((o) => o.status === 'completed');
  const row = (o: Order) => (
    <PhoneRow key={o.id} order={o} perspective={typeof perspective === 'function' ? perspective(o) : perspective} href={hrefFor(o)} fallback={counterpartyName?.(o)} />
  );
  return (
    <ul className={clsx('divide-y divide-gray-100', className)}>
      {open.map(row)}
      {done.length > 0 && open.length > 0 && (
        <li aria-hidden className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Terminées · {done.length}
        </li>
      )}
      {done.map(row)}
    </ul>
  );
};

/** Orders as rows: cover, title, reference, status and amount on wide screens; the compact phone rows below 640px. */
export const OrderList: React.FC<OrderListProps> = ({ orders, perspective, counterpartyName, hrefFor, showKind = false, columns = true }) => {
  const isSeller = perspective === 'seller';
  return (
    <>
      <CompactOrderList className="sm:hidden" orders={orders} perspective={perspective} hrefFor={hrefFor} counterpartyName={counterpartyName} />
      <List className="max-sm:hidden" columns={columns ? { main: 'Commande', meta: 'Statut', trailing: isSeller ? 'Net pour vous' : 'Total' } : undefined}>
        {orders.map((o) => (
          <ListRow
            key={o.id}
            to={hrefFor(o)}
            leading={<ListingThumb src={o.item.coverImage} category={o.item.category} size="md" />}
            title={
              isSeller && o.sellerMeta?.pinnedAt ? (
                <span className="inline-flex items-center gap-1.5 max-w-full">
                  <Pin className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-label="Épinglée" />
                  <span className="truncate">{o.item.title}</span>
                </span>
              ) : (
                o.item.title
              )
            }
            subtitle={[o.number, counterpartyName?.(o), formatDate(o.createdAt)].filter(Boolean).join(' · ')}
            meta={
              <>
                {showKind && <KindBadge kind={o.item.kind} category={o.item.category} />}
                {isSeller && <SellerTags tags={o.sellerMeta?.tags} />}
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
    </>
  );
};
