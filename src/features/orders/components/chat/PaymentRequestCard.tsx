import React from 'react';
import clsx from 'clsx';
import { Timer } from 'lucide-react';
import { Order, OrderMessage, useDb } from '@/shared/db';
import { Button } from '@/shared/ui';
import { useNow, useServiceAction } from '@/shared/hooks';
import { formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { PAYMENT_REQUEST_MINUTES } from '@/shared/domain';
import { ListingThumb } from '@/features/catalog';
import { openPaymentRequest } from '../../api';
import { formatCountdown, requestState } from '../../chat';

/**
 * Seller's payment request in the chat. The buyer's first tap starts a
 * {PAYMENT_REQUEST_MINUTES}-minute countdown, live on both sides; then it expires.
 */
export const PaymentRequestCard: React.FC<{ order: Order; message: OrderMessage; mine: boolean }> = ({ order, message, mine }) => {
  const request = message.request!;
  const initial = requestState(request);
  const now = useNow(1000, initial.state === 'open');
  const { state, left } = requestState(request, now);
  const run = useServiceAction();
  // Paid: the buyer bought this offer after opening the card.
  const paid = useDb(
    (s) => Boolean(request.openedAt) && s.orders.some((o) => o.listingId === request.listingId && o.buyerId === order.buyerId && o.createdAt >= request.openedAt!),
    [request.listingId, request.openedAt, order.buyerId]
  );
  const isBuyer = !mine;

  return (
    <div className="w-72 max-w-full rounded-2xl border border-gray-200 bg-surface p-3 space-y-3">
      <div className="flex items-center gap-3">
        <ListingThumb src={request.coverImage} category={request.category} />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Demande de paiement</p>
          <p className="text-sm font-medium text-gray-900 truncate">{request.title}</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatXaf(request.priceXaf)}</p>
        </div>
      </div>

      <p className={clsx('flex items-center gap-1.5 text-xs', state === 'expired' ? 'text-gray-400' : 'text-gray-600')}>
        <Timer className="w-3.5 h-3.5 shrink-0" />
        {paid && 'Payée.'}
        {!paid && state === 'waiting' &&
          (isBuyer ? `Valable ${PAYMENT_REQUEST_MINUTES} min dès que vous l’ouvrez.` : 'Pas encore ouverte par le client.')}
        {!paid && state === 'open' && <span className="tabular-nums">Expire dans {formatCountdown(left)}</span>}
        {!paid && state === 'expired' && (isBuyer ? 'Expirée : demandez au vendeur de la renvoyer.' : 'Expirée.')}
      </p>

      {isBuyer && !paid && state === 'waiting' && (
        <Button block size="sm" variant="primary" onClick={() => run(() => openPaymentRequest(order.id, message.id))}>
          Ouvrir la demande
        </Button>
      )}
      {isBuyer && !paid && state === 'open' && (
        <Button block size="sm" variant="primary" to={ROUTES.account.checkout(request.listingId)}>
          Payer {formatXaf(request.priceXaf)}
        </Button>
      )}
    </div>
  );
};
