import React from 'react';
import clsx from 'clsx';
import { Download, Wrench } from 'lucide-react';
import { Category, ListingKind } from '@/shared/db';
import { CATEGORIES } from '../model';

/**
 * Makes the product / service split obvious in tables: a digital product is
 * delivered instantly, a service is work with a deadline.
 */
export const KindBadge: React.FC<{ kind: ListingKind; category: Category; className?: string }> = ({ kind, category, className }) => {
  const type = CATEGORIES.find((c) => c.id === category)?.type ?? category;
  const service = kind === 'service';
  const Icon = service ? Wrench : Download;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full text-xs font-medium whitespace-nowrap',
        service ? 'bg-blue-50 text-blue-700' : 'bg-primary-50 text-primary-700',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {service ? 'Service' : 'Numérique'}
      {type !== 'Service' && <span className="opacity-70">· {type}</span>}
    </span>
  );
};

export const KIND_FILTERS = [
  { value: 'all', label: 'Tout' },
  { value: 'digital', label: 'Numériques' },
  { value: 'service', label: 'Services' },
] as const;

export type KindFilter = (typeof KIND_FILTERS)[number]['value'];
