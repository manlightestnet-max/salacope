import React from 'react';
import clsx from 'clsx';
import { AlarmClock, AlertTriangle, CalendarClock, CheckCircle2, Hourglass, Loader, LucideIcon, PackageCheck, RotateCcw, XCircle } from 'lucide-react';
import { Order } from '@/shared/db';
import { Badge, TONES } from '@/shared/ui';
import { Perspective, hasPendingExtension, isLate, isRevising, statusDisplay } from '../model';

export const OrderStatusBadge: React.FC<{ order: Order; perspective: Perspective }> = ({ order, perspective }) => {
  const { label, tone } = statusDisplay(order, perspective);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
};

/** One icon per state of an order: waiting, in progress, delivered, done, cancelled, dispute… */
const iconOf = (order: Order): LucideIcon => {
  switch (order.status) {
    case 'paid':
      return Hourglass;
    case 'in_progress':
      if (hasPendingExtension(order)) return CalendarClock;
      if (isLate(order)) return AlarmClock;
      return isRevising(order) ? RotateCcw : Loader;
    case 'delivered':
      return PackageCheck;
    case 'completed':
      return CheckCircle2;
    case 'cancelled':
      return XCircle;
    case 'disputed':
      return AlertTriangle;
  }
};

/** The state alone, as a small coloured icon (phones): the words are in the tooltip and for screen readers. */
export const OrderStatusIcon: React.FC<{ order: Order; perspective: Perspective; className?: string }> = ({ order, perspective, className }) => {
  const { label, tone } = statusDisplay(order, perspective);
  const Icon = iconOf(order);
  return (
    <span role="img" aria-label={label} title={label} className={clsx('inline-flex w-6 h-6 items-center justify-center rounded-full', TONES[tone].badge, className)}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
};
