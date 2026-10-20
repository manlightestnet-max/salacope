import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Timer } from 'lucide-react';
import { Listing } from '@/shared/db';
import { useNow } from '@/shared/hooks';
import { refreshCatalog } from '@/shared/api';
import { discountOf } from './ListingPrice';

const pad = (n: number) => String(n).padStart(2, '0');

const Unit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="min-w-[3.25rem] rounded-lg bg-surface px-2 py-1.5 text-center">
    <div className="text-lg font-semibold leading-none tabular-nums text-gray-900">{pad(value)}</div>
    <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
  </div>
);

/**
 * The clock of a promotion, at the top of the offer: days, hours, minutes and seconds ticking in real time, and a bar that
 * empties as the end comes closer. When it reaches zero the catalogue is read again, so the regular price is back at once.
 */
export const PromoCountdown: React.FC<{ listing: Pick<Listing, 'promo' | 'priceXaf' | 'compareAtXaf'>; className?: string }> = ({ listing, className }) => {
  const promo = listing.promo;
  const now = useNow(1000, Boolean(promo));
  const asked = useRef(false);
  const end = promo ? new Date(promo.endsAt).getTime() : 0;
  const left = Math.max(0, end - now);
  useEffect(() => {
    if (promo && left === 0 && !asked.current) {
      asked.current = true;
      void refreshCatalog(true).catch(() => undefined);
    }
  }, [promo, left]);
  if (!promo || left === 0) return null;

  const start = new Date(promo.startsAt).getTime();
  const share = end > start ? Math.min(1, Math.max(0, left / (end - start))) : 0;
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const off = discountOf(listing);

  return (
    <section role="timer" aria-label="Fin de la promotion" className={clsx('rounded-2xl border border-red-200 bg-red-50 p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
          <Timer className="w-4 h-4" />
          {listing.priceXaf === 0 ? 'Gratuit' : off > 0 ? `Promotion −${off} %` : 'Promotion'} · se termine dans
        </p>
        <div className="flex items-center gap-1.5">
          {days > 0 && <Unit value={days} label="jours" />}
          <Unit value={hours} label="heures" />
          <Unit value={minutes} label="min" />
          <Unit value={seconds} label="sec" />
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-red-100" aria-hidden>
        <div className="h-full rounded-full bg-red-500 transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${(share * 100).toFixed(2)}%` }} />
      </div>
    </section>
  );
};
