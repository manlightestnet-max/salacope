import React, { useEffect, useMemo, useRef } from 'react';
import { SearchX } from 'lucide-react';
import { Button, EmptyState, Pending, SkeletonCards, useBooting } from '@/shared/ui';
import { useHideFooter, useInfiniteList } from '@/shared/hooks';
import { plural } from '@/shared/lib';
import { ListingView, categoryLabel, placeholderViews, queryListings } from '../model';
import { useCatalogQuery, usePublishedListings } from '../hooks';
import { SortSelect } from './CatalogFilters';
import { ListingGrid } from './ListingCard';
import { ListingMasonry } from './ListingMasonry';
import { ListingSections } from './ListingSections';

const PAGE_SIZE = 24;

/** Results loaded page by page while scrolling; the site footer waits until the last page. */
const ResultsGrid: React.FC<{ views: ListingView[]; mixed: boolean; resetKey: string }> = ({ views, mixed, resetKey }) => {
  const { visible, hasMore, sentinelRef } = useInfiniteList(views, PAGE_SIZE, resetKey);
  useHideFooter(hasMore);

  return (
    <>
      {mixed ? <ListingMasonry views={visible} /> : <ListingGrid views={visible} reveal />}
      {hasMore && (
        <div ref={sentinelRef} className="pt-6">
          <SkeletonCards />
        </div>
      )}
    </>
  );
};

export interface CatalogBrowserProps {
  /** Pinned above the results while scrolling (the storefront's category chips). */
  toolbar?: React.ReactNode;
  /** Next to the sort select in grid mode. */
  toolbarExtra?: React.ReactNode;
  /** Id of the catalogue top, for "Explorer le catalogue" links. */
  anchorId?: string;
  /** Always show the grid, even with nothing selected (search page). */
  alwaysGrid?: boolean;
  /** The sort and extra filters are elsewhere (the back-office search puts them in its pinned toolbar). */
  hideControls?: boolean;
}

/**
 * The catalogue body shared by the storefront, the search page and the back-office Explorer.
 * Driven by the URL:
 * - nothing selected → one panel per category, with "Voir tout";
 * - a category, a search or a price filter → a single grid with infinite scroll
 *   (uniform for one category, packed columns when cover shapes are mixed).
 */
export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({ toolbar, toolbarExtra, anchorId, alwaysGrid = false, hideControls = false }) => {
  const views = usePublishedListings();
  const { query, setQuery, hasFilters } = useCatalogQuery();
  const booting = useBooting();
  const found = useMemo(() => queryListings(views, query), [views, query]);
  // Before the offers arrive the same blocks are drawn with stand-in cards painted as shimmer.
  const pending = booting && found.length === 0;
  const results = useMemo(
    () => (pending ? placeholderViews(query.category ? [query.category] : undefined, query.category ? 12 : 4) : found),
    [pending, found, query.category]
  );
  const topRef = useRef<HTMLDivElement>(null);

  const filtered = Boolean(query.text || query.minPrice || query.maxPrice);
  const gridMode = alwaysGrid || Boolean(query.category) || filtered;
  const listKey = gridMode
    ? ['grid', query.category, query.text, query.sort, query.minPrice, query.maxPrice].join(':')
    : 'panels';

  // Switching view (category, "Voir tout", search) brings the top of the list back into view.
  const shownKey = useRef(listKey);
  useEffect(() => {
    if (shownKey.current === listKey) return;
    shownKey.current = listKey;
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [listKey]);

  const resetFilters = () => setQuery({ q: undefined, cat: undefined, min: undefined, max: undefined });

  let content: React.ReactNode;
  if (!gridMode) {
    content = results.length ? (
      <ListingSections views={results} mode="panels" onViewAll={(cat) => setQuery({ cat })} />
    ) : (
      <EmptyState title="Aucune offre pour le moment" />
    );
  } else {
    const title = query.text
      ? `Résultats pour « ${query.text} »`
      : query.category
      ? categoryLabel(query.category)
      : 'Toutes les offres';
    content = (
      <>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 truncate">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {pending ? <Pending>12 offres</Pending> : plural(results.length, 'offre')}
              {hasFilters && (
                <>
                  {' · '}
                  <button type="button" onClick={resetFilters} className="hover:text-gray-900 underline-offset-2 hover:underline">
                    tout effacer
                  </button>
                </>
              )}
            </p>
          </div>
          {!hideControls && (
            <div className="flex flex-wrap items-center gap-2">
              {toolbarExtra}
              <SortSelect value={query.sort ?? 'popular'} onChange={(sort) => setQuery({ sort })} />
            </div>
          )}
        </div>
        {results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Aucun résultat"
            action={hasFilters ? <Button onClick={resetFilters}>Effacer les filtres</Button> : undefined}
          />
        ) : (
          <ResultsGrid views={results} mixed={!query.category} resetKey={listKey} />
        )}
      </>
    );
  }

  return (
    <div>
      <div ref={topRef} id={anchorId} className="scroll-mt-[calc(var(--sticky-offset,0px)-0.75rem)]" />
      {toolbar && (
        <div className="sticky top-[var(--sticky-offset,0px)] z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5 mt-3 bg-canvas sm:bg-canvas/80 sm:backdrop-blur-xl border-b border-gray-200/60">
          {toolbar}
        </div>
      )}
      <div key={listKey} className="pt-6">
        {content}
      </div>
    </div>
  );
};
