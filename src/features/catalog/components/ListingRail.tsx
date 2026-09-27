import React from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { ScrollArrows, useHorizontalScroll } from '@/shared/ui';
import { plural } from '@/shared/lib';
import { COVER_FORMAT, CoverFormat, ListingView } from '../model';
import { ListingCard } from './ListingCard';

/** Card width in a rail, per cover shape. */
const RAIL_WIDTH: Record<CoverFormat, string> = {
  portrait: 'w-[148px] sm:w-[180px]',
  square: 'w-[160px] sm:w-[188px]',
  landscape: 'w-[240px] sm:w-[280px]',
  video: 'w-[250px] sm:w-[300px]',
};

export interface ListingRailProps {
  title: string;
  views: ListingView[];
  /** Shows a "Voir tout" link. */
  onViewAll?: () => void;
  /**
   * `plain`: a full-width row. `panel`: a rounded block sized to its cards, so short
   * categories sit side by side (storefront); it becomes a plain row on phones.
   */
  variant?: 'plain' | 'panel';
}

/** Horizontal row of listings with snap scrolling; arrows appear only when the cards overflow. */
export const ListingRail: React.FC<ListingRailProps> = ({ title, views, onViewAll, variant = 'plain' }) => {
  const scroll = useHorizontalScroll(views.length);

  if (views.length === 0) return null;
  const width = RAIL_WIDTH[COVER_FORMAT[views[0].listing.category]];
  const panel = variant === 'panel';

  return (
    <section
      aria-label={title}
      className={clsx(
        panel &&
          'basis-full sm:basis-auto flex-auto min-w-0 max-w-full sm:rounded-[22px] sm:border sm:border-gray-200/60 sm:bg-surface sm:p-6'
      )}
    >
      <div className={clsx('flex items-center justify-between gap-4', panel ? 'mb-5' : 'mb-4')}>
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2 className={clsx('font-semibold tracking-tight text-gray-900 truncate', panel ? 'text-lg' : 'text-lg sm:text-xl')}>{title}</h2>
          {panel && <span className="shrink-0 text-[12.5px] text-gray-500">{plural(views.length, 'offre')}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-0.5 text-[13px] font-medium text-primary-700 hover:underline underline-offset-2"
            >
              Voir tout
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <ScrollArrows scroll={scroll} />
        </div>
      </div>
      <div
        ref={scroll.ref}
        onScroll={scroll.onScroll}
        className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-px-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:scroll-px-0"
      >
        {views.map((v) => (
          <div key={v.listing.id} className={clsx('shrink-0 snap-start', width)}>
            <ListingCard view={v} />
          </div>
        ))}
      </div>
    </section>
  );
};
