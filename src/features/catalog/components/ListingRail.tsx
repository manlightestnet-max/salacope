import React from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useInfiniteList } from '@/shared/hooks';
import { plural } from '@/shared/lib';
import { ListingView } from '../model';
import { ListingGrid } from './ListingCard';

/** A section never lists more than this many offers (the rest is behind "Voir tout"); they load as the page scrolls. */
export const SECTION_MAX = 20;
const PAGE = 8;

export interface ListingRailProps {
  title: string;
  views: ListingView[];
  /** Shows a "Voir tout" link. */
  onViewAll?: () => void;
  /** `plain`: a full-width block. `panel`: the same inside a rounded card (storefront), plain on phones. */
  variant?: 'plain' | 'panel';
}

/**
 * One category of the storefront: its title, then a grid that fits the screen (columns follow the cover shape) and grows
 * downwards while the page scrolls, up to `SECTION_MAX` offers.
 */
export const ListingRail: React.FC<ListingRailProps> = ({ title, views, onViewAll, variant = 'plain' }) => {
  const all = views.slice(0, SECTION_MAX);
  const { visible, hasMore, sentinelRef } = useInfiniteList(all, PAGE, title);

  if (views.length === 0) return null;
  const panel = variant === 'panel';

  return (
    <section
      aria-label={title}
      className={clsx(panel && 'w-full min-w-0 sm:rounded-[22px] sm:border sm:border-gray-200/60 sm:bg-surface sm:p-6')}
    >
      <div className={clsx('flex items-center justify-between gap-4', panel ? 'mb-5' : 'mb-4')}>
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2 className={clsx('font-semibold tracking-tight text-gray-900 truncate', panel ? 'text-lg' : 'text-lg sm:text-xl')}>{title}</h2>
          {panel && <span className="shrink-0 text-[12.5px] text-gray-500">{plural(all.length, 'offre')}</span>}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium text-primary-700 hover:underline underline-offset-2"
          >
            Voir tout
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <ListingGrid views={visible} />
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </section>
  );
};
