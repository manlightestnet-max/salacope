import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Order, User, useDb } from '@/shared/db';
import { Avatar, Button, Dialog, Stat, StatGrid } from '@/shared/ui';
import { formatDate, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName } from '@/features/session';
import { Perspective, orderHref } from '../../model';
import { OrderStatusBadge } from '../OrderStatusBadge';

/**
 * Tap on the other party's avatar: everything between you at once — each order with its
 * status, amount and receipt (on the order page), no digging. Never any contact details.
 */
export const CounterpartSheet: React.FC<{ order: Order; perspective: Perspective; open: boolean; onClose: () => void }> = ({
  order,
  perspective,
  open,
  onClose,
}) => {
  const isBuyer = perspective === 'buyer';
  const other = useDb((s) => s.users.find((u) => u.id === (isBuyer ? order.sellerId : order.buyerId)), [order.sellerId, order.buyerId, isBuyer]);
  const history = useDb(
    (s) =>
      s.orders
        .filter((o) => o.sellerId === order.sellerId && o.buyerId === order.buyerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [order.sellerId, order.buyerId]
  );
  const name = isBuyer ? displayName(other) : order.buyer.name;
  const paid = history.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (isBuyer ? o.amounts.total : o.amounts.net), 0);

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={<Identity name={name} user={isBuyer ? other : undefined} />}>
      <div className="space-y-5">
        <StatGrid columns={2}>
          <Stat label="Commandes" value={history.length} />
          <Stat label={isBuyer ? 'Payé au total' : 'Reçu au total (net)'} value={formatXaf(paid)} />
        </StatGrid>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Commandes, paiements et reçus</p>
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {history.map((o) => (
              <li key={o.id}>
                <Link to={orderHref(o, perspective)} onClick={onClose} className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-900 truncate">{o.item.title}</span>
                    <span className="block text-xs text-gray-500 tabular-nums">
                      {o.number} · {formatDate(o.createdAt)} · {o.payment.reference}
                    </span>
                  </span>
                  <OrderStatusBadge order={o} perspective={perspective} />
                  <span className="w-24 text-right text-sm font-medium text-gray-900 tabular-nums">
                    {formatXaf(isBuyer ? o.amounts.total : o.amounts.net)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {isBuyer && (
          <Button to={ROUTES.account.store(order.sellerId)} onClick={onClose}>
            Voir la boutique
          </Button>
        )}
      </div>
    </Dialog>
  );
};

const Identity: React.FC<{ name: string; user?: User }> = ({ name, user }) => (
  <span className="flex items-center gap-3">
    <Avatar name={name} src={user?.merchant?.logo} size="lg" />
    <span className="min-w-0">
      <span className="block text-base font-semibold text-gray-900 truncate">{name}</span>
      {user?.merchant?.headline && <span className="block text-xs font-normal text-gray-500 truncate">{user.merchant.headline}</span>}
    </span>
  </span>
);
