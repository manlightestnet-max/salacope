import React from 'react';
import { Link } from 'react-router-dom';
import { Order, User, useDb } from '@/shared/db';
import { Avatar } from '@/shared/ui';
import { plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName } from '@/features/session';
import { Perspective } from '../model';

/**
 * Who is on the other side of the conversation. The seller sees the client and their
 * history with the store (never their contact details); the buyer sees the store.
 */
export const ChatHeader: React.FC<{ order: Order; perspective: Perspective; seller: User | undefined }> = ({ order, perspective, seller }) => {
  const history = useDb(
    (s) => s.orders.filter((o) => o.sellerId === order.sellerId && o.buyerId === order.buyerId).length,
    [order.sellerId, order.buyerId]
  );

  if (perspective === 'buyer') {
    return (
      <div className="shrink-0 h-14 px-4 sm:px-5 flex items-center gap-3 border-b border-gray-100">
        <Avatar name={displayName(seller)} />
        <div className="min-w-0 flex-1">
          <Link to={ROUTES.account.store(order.sellerId)} className="block text-sm font-medium text-gray-900 truncate hover:underline underline-offset-2">
            {displayName(seller)}
          </Link>
          <p className="text-xs text-gray-500 truncate">{seller?.merchant?.headline ?? 'Vendeur'}</p>
        </div>
      </div>
    );
  }

  const { name } = order.buyer;
  return (
    <div className="shrink-0 h-14 px-4 sm:px-5 flex items-center gap-3 border-b border-gray-100">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">
          {history > 1 ? `${plural(history, 'commande')} chez vous` : 'Première commande chez vous'}
          {order.invoice && ` · ${order.invoice.companyName}`}
        </p>
      </div>
    </div>
  );
};
