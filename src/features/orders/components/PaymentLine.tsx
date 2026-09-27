import React from 'react';
import clsx from 'clsx';
import { Order } from '@/shared/db';
import { formatXaf } from '@/shared/lib';
import { PAYMENT_CHANNELS } from '@/shared/config/payment';
import { FundsState, Perspective, fundsState } from '../model';

const FUNDS: Record<FundsState, { label: string; dot: string }> = {
  escrow: { label: 'Retenus par Salacope', dot: 'bg-amber-500' },
  released: { label: 'Versés au vendeur', dot: 'bg-accent' },
  refunded: { label: 'Remboursés au client', dot: 'bg-gray-400' },
  frozen: { label: 'Bloqués (litige)', dot: 'bg-red-500' },
};

/** The money of an order on one line: amount, where the funds sit, operator, reference, code. */
export const PaymentLine: React.FC<{ order: Order; perspective: Perspective; className?: string }> = ({ order, perspective, className }) => {
  const funds = FUNDS[fundsState(order.status)];
  const seller = perspective === 'seller';
  const net = order.amounts.net !== order.amounts.total;

  return (
    <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500', className)}>
      <span className="text-base font-semibold tracking-tight tabular-nums text-gray-900">{formatXaf(seller ? order.amounts.net : order.amounts.total)}</span>
      {seller && net && <span className="tabular-nums">sur {formatXaf(order.amounts.total)} payés</span>}
      {order.amounts.discount > 0 && (
        <span className="tabular-nums">
          remise {order.couponCode} −{formatXaf(order.amounts.discount)}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span className={clsx('w-1.5 h-1.5 rounded-full', funds.dot)} />
        {funds.label}
      </span>
      <span>
        {PAYMENT_CHANNELS[order.payment.channel].label} · {order.payment.reference}
      </span>
      {order.payment.code && <span className="font-mono text-gray-600">{order.payment.code}</span>}
    </div>
  );
};
