import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Order } from '@/shared/db';
import { Card } from '@/shared/ui';
import { formatDate, formatDateTime, formatRelative } from '@/shared/lib';
import { Perspective, isLate, revisionsLeft } from '../model';

const HOUR = 3_600_000;

/** "2 j 5 h", "3 h 20 min", "12 min". */
const formatSpan = (ms: number) => {
  const minutes = Math.max(0, Math.round(Math.abs(ms) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days) return `${days} j ${hours} h`;
  if (hours) return `${hours} h ${minutes % 60} min`;
  return `${minutes} min`;
};

/** Re-renders every minute so the countdown stays true. */
const useNow = () => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};

/** The clock of a service order: time left to deliver (or to validate), and revisions. */
export const DeadlineCard: React.FC<{ order: Order; perspective: Perspective }> = ({ order, perspective }) => {
  const now = useNow();
  const seller = perspective === 'seller';
  const included = order.item.revisions ?? 0;
  const left = revisionsLeft(order);

  let label = '';
  let figure = '';
  let hint = '';
  let progress: number | null = null;
  let late = false;

  if (order.status === 'paid') {
    label = 'Délai de livraison';
    figure = `${order.item.deliveryDays ?? 3} jours`;
    hint = seller ? `Le chrono démarre à l'acceptation. Commande reçue ${formatRelative(order.createdAt)}.` : "Démarre quand le vendeur accepte.";
  } else if (order.status === 'in_progress' && order.dueAt) {
    const due = new Date(order.dueAt).getTime();
    const start = [...order.events].reverse().find((e) => e.type === 'accepted' || e.type === 'revision_requested')?.at;
    const from = start ? new Date(start).getTime() : due - (order.item.deliveryDays ?? 3) * 24 * HOUR;
    late = isLate(order, now);
    label = late ? 'En retard de' : 'Temps restant';
    figure = formatSpan(due - now);
    hint = `Livraison attendue le ${formatDateTime(order.dueAt)}`;
    progress = Math.min(1, Math.max(0, (now - from) / Math.max(1, due - from)));
  } else if (order.status === 'delivered' && order.releaseAt) {
    label = seller ? 'Paiement automatique dans' : 'Validation automatique dans';
    figure = formatSpan(new Date(order.releaseAt).getTime() - now);
    hint = seller ? `Si le client ne répond pas, vous êtes payé le ${formatDate(order.releaseAt)}.` : `Sans réponse de votre part, le vendeur est payé le ${formatDate(order.releaseAt)}.`;
  } else {
    return null;
  }

  return (
    <Card className="p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={clsx('mt-1 text-2xl font-semibold tracking-tight tabular-nums', late ? 'text-red-600' : 'text-gray-900')}>{figure}</p>
      {progress !== null && (
        <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={clsx('h-full rounded-full transition-[width] duration-700', late ? 'bg-red-500' : progress > 0.75 ? 'bg-amber-500' : 'bg-accent')}
            style={{ width: `${Math.max(4, progress * 100)}%` }}
          />
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">{hint}</p>
      {included > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Retouches</span>
          <span className="flex items-center gap-1" aria-label={`${left} sur ${included} restantes`}>
            {Array.from({ length: included }, (_, i) => (
              <span key={i} className={clsx('w-2 h-2 rounded-full', i < left ? 'bg-gray-900' : 'bg-gray-200')} />
            ))}
            <span className="ml-1.5 text-gray-900 tabular-nums">
              {left}/{included}
            </span>
          </span>
        </div>
      )}
    </Card>
  );
};
