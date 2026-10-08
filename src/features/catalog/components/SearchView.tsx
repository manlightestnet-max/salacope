import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, SearchField, Select } from '@/shared/ui';
import { useFreshCatalog } from '@/shared/api';
import { useBodyScrollLock, useKeyPress } from '@/shared/hooks';
import { CATEGORIES, SORT_OPTIONS, queryListings } from '../model';
import { useCatalogQuery, usePublishedListings } from '../hooks';
import { CatalogBrowser } from './CatalogBrowser';

/** Type (category) with its count, sort and price: the same content in the side column and in the phone sheet. */
const Filters: React.FC = () => {
  const { query, setQuery, hasFilters } = useCatalogQuery();
  const views = usePublishedListings();
  const [min, setMin] = useState(query.minPrice ? String(query.minPrice) : '');
  const [max, setMax] = useState(query.maxPrice ? String(query.maxPrice) : '');
  useEffect(() => {
    setMin(query.minPrice ? String(query.minPrice) : '');
    setMax(query.maxPrice ? String(query.maxPrice) : '');
  }, [query.minPrice, query.maxPrice]);

  // Counts follow the search and the price, whatever type is chosen, so each type tells what it would show.
  const counts = useMemo(() => {
    const matching = queryListings(views, { ...query, category: undefined });
    return { all: matching.length, byCategory: (id: string) => matching.filter((v) => v.listing.category === id).length };
  }, [views, query]);

  const row = (active: boolean) =>
    clsx(
      'w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md text-sm text-left transition-colors',
      active ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
    );
  const label = 'px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500';

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4">
        <p className={label}>Type</p>
        <div className="space-y-0.5">
          <button type="button" className={row(!query.category)} onClick={() => setQuery({ cat: undefined })} aria-pressed={!query.category}>
            Tout
            <span className="text-xs tabular-nums text-gray-500">{counts.all}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={row(query.category === c.id)} onClick={() => setQuery({ cat: c.id })} aria-pressed={query.category === c.id}>
              {c.label}
              <span className="text-xs tabular-nums text-gray-500">{counts.byCategory(c.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <p className={label}>Trier par</p>
        <Select
          className="w-full"
          aria-label="Trier par"
          value={query.sort ?? 'popular'}
          options={SORT_OPTIONS}
          onChange={(sort) => setQuery({ sort })}
        />
      </div>

      <form
        className="p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ min: min || undefined, max: max || undefined });
        }}
      >
        <p className={label}>Prix</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="numeric" min={0} placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Prix minimum" />
          <Input type="number" inputMode="numeric" min={0} placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Prix maximum" />
        </div>
        <Button type="submit" block className="mt-2">
          Appliquer
        </Button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setQuery({ cat: undefined, min: undefined, max: undefined })}
            className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
          >
            Effacer les filtres
          </button>
        )}
      </form>
    </div>
  );
};

/**
 * The search screen (public `/recherche` and the back-office's `/ac/recherche`): a title, the search field with its
 * button, the filters in a column on computers (a sheet behind a "Filtres" button on phones) and the results beside them.
 * Submitting loads the route with `?q=`; the field of the top bar steps aside here, this one is the search.
 */
export const SearchView: React.FC = () => {
  const { query, params } = useCatalogQuery();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [text, setText] = useState(query.text ?? '');
  const [sheet, setSheet] = useState(false);
  // A search is answered from the database: checked now, and again each time the words change.
  useFreshCatalog(true, query.text);
  useEffect(() => setText(query.text ?? ''), [query.text]);
  useBodyScrollLock(sheet);
  useKeyPress('Escape', () => setSheet(false), sheet);

  const active = [query.category, query.minPrice, query.maxPrice].filter(Boolean).length;

  // On a phone the search words are required: the screen opens with the field ready to type in, and no results are listed
  // until there is something to look for (computers can still browse everything with the filters).
  const field = useRef<HTMLInputElement>(null);
  const noWords = !query.text;
  useEffect(() => {
    if (noWords && window.matchMedia('(max-width: 1023px)').matches) field.current?.focus();
  }, [noWords]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && window.matchMedia('(max-width: 1023px)').matches) {
      field.current?.focus();
      return;
    }
    const next = new URLSearchParams(params);
    if (text.trim()) next.set('q', text.trim());
    else next.delete('q');
    // A new search is a new entry of the history: back returns to the previous results.
    navigate({ pathname, search: next.toString() });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Recherche</h1>
      <p className="mt-1 text-sm text-gray-500">Trouvez des formations, des e-books, des services et plus encore.</p>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <SearchField ref={field} value={text} onChange={setText} placeholder="Rechercher" className="flex-1 min-w-0" />
        <Button type="submit" variant="primary" className="shrink-0">
          Rechercher
        </Button>
      </form>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--sticky-offset,0px)+1rem)] rounded-2xl border border-gray-200/70 bg-surface overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-12 border-b border-gray-100 text-sm font-semibold text-gray-900">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            Filtres
          </div>
          <Filters />
        </aside>

        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-haspopup="dialog"
            className="lg:hidden mb-4 h-10 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-surface px-3 text-base text-gray-800"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {active > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center justify-center">{active}</span>}
          </button>
          {noWords && (
            <div className="lg:hidden flex flex-col items-center text-center px-6 py-14 text-gray-500">
              <Search className="w-8 h-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">Que cherchez-vous ?</p>
              <p className="mt-1 text-sm">Saisissez un mot dans le champ ci-dessus : une formation, un e-book, un service.</p>
            </div>
          )}
          <div className={noWords ? 'max-lg:hidden' : undefined}>
            <CatalogBrowser alwaysGrid hideControls />
          </div>
        </div>
      </div>

      {sheet &&
        createPortal(
          <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Filtres">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface border-t border-gray-200 pb-[max(1rem,env(safe-area-inset-bottom))] animate-sheet">
              <div className="sticky top-0 bg-surface flex items-center justify-between px-4 h-12 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-900">Filtres</span>
                <Button size="sm" variant="primary" onClick={() => setSheet(false)}>
                  Voir les résultats
                </Button>
              </div>
              <Filters />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
