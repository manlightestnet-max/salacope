import React, { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, ChevronDown, Lock, LucideIcon, Undo2 } from 'lucide-react';
import { Order } from '@/shared/db';
import { TONES, Tone } from '@/shared/ui';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { FundsState, Perspective, fundsState, paymentMethodLabel } from '../model';

const FUNDS: Record<FundsState, { label: string; icon: LucideIcon; tone: Tone }> = {
  escrow: { label: 'Retenus par Salacope', icon: Lock, tone: 'warning' },
  released: { label: 'Versés au vendeur', icon: CheckCircle2, tone: 'success' },
  refunded: { label: 'Remboursés au client', icon: Undo2, tone: 'neutral' },
  frozen: { label: 'Bloqués (litige)', icon: AlertTriangle, tone: 'danger' },
};

/** What the state means, with the time it refers to. */
const explain = (order: Order, state: FundsState) => {
  switch (state) {
    case 'escrow':
      return `L’argent est gardé en sécurité jusqu’à la validation du client${order.releaseAt ? `, ou versé automatiquement ${formatRelative(order.releaseAt)} (${formatDateTime(order.releaseAt)})` : ''}.`;
    case 'released':
      return `L’argent a été versé au vendeur · ${formatDateTime(order.updatedAt)}.`;
    case 'refunded':
      return `Le client a été remboursé · ${formatDateTime(order.updatedAt)}.`;
    case 'frozen':
      return 'Un litige est ouvert : l’argent est bloqué jusqu’à la décision de Salacope.';
  }
};

/** The money of an order on one line: amount, where the funds sit (a tappable indicator), operator, reference, code. */
export const PaymentLine: React.FC<{ order: Order; perspective: Perspective; className?: string }> = ({ order, perspective, className }) => {
  const [open, setOpen] = useState(false);
  const state = fundsState(order.status);
  const funds = FUNDS[state];
  const Icon = funds.icon;
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-full border border-gray-200 bg-surface font-medium text-gray-800 transition hover:border-gray-300 active:scale-[0.98]"
      >
        <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center', TONES[funds.tone].badge)}>
          <Icon className="w-3 h-3" />
        </span>
        {funds.label}
        <ChevronDown className={clsx('w-3 h-3 text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <span>
        {paymentMethodLabel(order)} · {order.payment.reference}
      </span>
      {order.payment.code && <span className="font-mono text-gray-600">{order.payment.code}</span>}
      {open && <p className="basis-full rounded-xl border border-gray-200/70 bg-gray-50 px-3.5 py-2.5 text-gray-600 animate-fade-up motion-reduce:animate-none">{explain(order, state)}</p>}
    </div>
  );
};
