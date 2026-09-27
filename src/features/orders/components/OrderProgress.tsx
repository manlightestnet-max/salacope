import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Order, OrderEventType } from '@/shared/db';
import { formatDateTime } from '@/shared/lib';

const STEPS: { label: string; events: OrderEventType[] }[] = [
  { label: 'Payée', events: ['paid'] },
  { label: 'Acceptée', events: ['accepted'] },
  { label: 'Livrée', events: ['delivered'] },
  { label: 'Terminée', events: ['completed', 'auto_completed'] },
];

const REACHED: Record<Order['status'], number> = {
  paid: 0,
  in_progress: 1,
  delivered: 2,
  disputed: 2,
  completed: 3,
  cancelled: -1,
};

/** Where a service order stands, in one line: four steps, dated on hover. Fits a page bar. */
export const OrderProgress: React.FC<{ order: Order; className?: string }> = ({ order, className }) => {
  const cancelled = order.status === 'cancelled';
  const reached = cancelled ? order.events.filter((e) => STEPS.some((s) => s.events.includes(e.type))).length - 1 : REACHED[order.status];
  const dateOf = (types: OrderEventType[]) => [...order.events].reverse().find((e) => types.includes(e.type))?.at;

  return (
    <ol className={clsx('flex items-center gap-1.5', className)} aria-label="Avancement de la commande">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const current = i === reached && !cancelled && order.status !== 'completed';
        const alert = current && order.status === 'disputed';
        const at = done ? dateOf(step.events) : undefined;
        return (
          <li key={step.label} className="flex items-center gap-1.5" title={at ? `${step.label} · ${formatDateTime(at)}` : step.label}>
            {i > 0 && <span className={clsx('w-5 h-px', done ? 'bg-accent' : 'bg-gray-200')} aria-hidden />}
            <span
              className={clsx(
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold',
                alert ? 'bg-red-50 text-red-600 ring-1 ring-red-500/50' : done ? 'bg-accent text-on-accent' : 'bg-gray-100 text-gray-400',
                current && !alert && 'ring-[3px] ring-accent/25'
              )}
            >
              {done && !current ? <Check className="w-2.5 h-2.5" strokeWidth={3.5} /> : i + 1}
            </span>
            <span className={clsx('text-xs', current ? 'font-medium text-gray-900' : done ? 'text-gray-600' : 'text-gray-400', alert && 'text-red-600')}>
              {alert ? 'Litige' : step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
