import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Reveal } from '@/shared/ui';
import { COVER_FORMAT, CoverFormat, ListingView } from '../model';
import { ListingCard } from './ListingCard';

/** Cover height / width per shape. */
const RATIO: Record<CoverFormat, number> = { portrait: 4 / 3, landscape: 3 / 4, video: 9 / 16, square: 1 };
/** Breadcrumb, two-line title, seller and price under the cover. */
const META_HEIGHT = 112;
const GAP = 16;
const ROW_GAP = 32;

/**
 * Mixed results (search): each card keeps the shape of its category, packed in columns.
 * Cards go to the shortest column in order, so loading more never moves the ones already shown.
 */
export const ListingMasonry: React.FC<{ views: ListingView[] }> = ({ views }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const minColumn = width < 640 ? 150 : 220;
  const count = Math.max(1, Math.floor((width + GAP) / (minColumn + GAP)));
  const columnWidth = (width - GAP * (count - 1)) / count;

  const columns = useMemo(() => {
    const cols = Array.from({ length: count }, () => ({ height: 0, items: [] as { view: ListingView; index: number }[] }));
    views.forEach((view, index) => {
      const target = cols.reduce((shortest, col) => (col.height < shortest.height ? col : shortest), cols[0]);
      target.items.push({ view, index });
      target.height += columnWidth * RATIO[COVER_FORMAT[view.listing.category]] + META_HEIGHT + ROW_GAP;
    });
    return cols;
  }, [views, count, columnWidth]);

  return (
    <div ref={ref} className="flex items-start gap-4">
      {width > 0 &&
        columns.map((col, i) => (
          <div key={i} className="flex-1 min-w-0 flex flex-col gap-8">
            {col.items.map(({ view, index }) => (
              <Reveal key={view.listing.id} delay={(index % count) * 60}>
                <ListingCard view={view} />
              </Reveal>
            ))}
          </div>
        ))}
    </div>
  );
};
