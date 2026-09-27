import React from 'react';
import { Category } from '@/shared/db';
import { CATEGORIES, COVER_FORMAT, CoverFormat, ListingView } from '../model';
import { ListingGrid } from './ListingCard';
import { ListingRail } from './ListingRail';

export interface ListingSectionsProps {
  views: ListingView[];
  /**
   * `panels`: storefront blocks, narrow covers first so short categories share a row.
   * `rails`: full-width rows. `grids`: every result, one grid per category.
   */
  mode: 'panels' | 'rails' | 'grids';
  onViewAll?: (category: Category) => void;
}

/** Panels are ordered by cover shape: books and squares share a row, wide covers the next. */
const PANEL_ORDER: CoverFormat[] = ['portrait', 'square', 'video', 'landscape'];

/** Listings split by category (in catalogue order) so each block has a single cover shape. */
export const ListingSections: React.FC<ListingSectionsProps> = ({ views, mode, onViewAll }) => {
  const groups = CATEGORIES.map((c) => ({ config: c, items: views.filter((v) => v.listing.category === c.id) })).filter(
    (g) => g.items.length > 0
  );

  if (mode === 'panels') {
    const ordered = [...groups].sort(
      (a, b) => PANEL_ORDER.indexOf(COVER_FORMAT[a.config.id]) - PANEL_ORDER.indexOf(COVER_FORMAT[b.config.id])
    );
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-10 sm:gap-y-4">
        {ordered.map(({ config, items }) => (
          <ListingRail
            key={config.id}
            variant="panel"
            title={config.section}
            views={items}
            onViewAll={onViewAll && (() => onViewAll(config.id))}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {groups.map(({ config, items }) =>
        mode === 'rails' ? (
          <ListingRail key={config.id} title={config.section} views={items} onViewAll={onViewAll && (() => onViewAll(config.id))} />
        ) : (
          <section key={config.id} aria-label={config.label}>
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">{config.label}</h2>
              <span className="text-sm text-gray-500 tabular-nums">{items.length}</span>
            </div>
            <ListingGrid views={items} />
          </section>
        )
      )}
    </div>
  );
};
