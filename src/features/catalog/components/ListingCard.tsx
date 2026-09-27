import React from 'react';
import clsx from 'clsx';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatXaf } from '@/shared/lib';
import { Reveal, usePane } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { FavoriteButton } from '@/features/library';
import { displayName } from '@/features/session';
import { COVER_FORMAT, CoverFormat, ListingView, cardBreadcrumb } from '../model';
import { ListingCover } from './ListingCover';

export const QUICK_VIEW_PARAM = 'produit';

/**
 * Storefront card: frameless cover in the shape of its category, then
 * "Type › detail", title, seller and price in the brand colour. Opens the quick view.
 */
/**
 * Where a listing opens. The quick view (dialog) is for browsing the catalogue only: the
 * storefront and the back-office Explorer. Anywhere else in the back-office the offer opens
 * as a page of the shell.
 */
export const useQuickViewTo = (listingId: string) => {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const inShell = Boolean(usePane());
  if (inShell && pathname !== ROUTES.account.explorer) return ROUTES.account.offer(listingId);
  const next = new URLSearchParams(params);
  next.set(QUICK_VIEW_PARAM, listingId);
  return { search: next.toString() };
};

/** "E-book › PDF" line above a listing title. */
export const CardBreadcrumb: React.FC<{ listing: ListingView['listing']; className?: string }> = ({ listing, className }) => {
  const [type, detail] = cardBreadcrumb(listing);
  return (
    <p className={clsx('flex items-center gap-1 text-xs text-gray-500 min-w-0', className)}>
      <span className="shrink-0">{type}</span>
      <ChevronRight className="w-3 h-3 shrink-0" />
      <span className="truncate">{detail}</span>
    </p>
  );
};

export const ListingCard: React.FC<{ view: ListingView }> = ({ view: { listing, seller } }) => {
  const to = useQuickViewTo(listing.id);

  return (
    <Link to={to} className="group block" preventScrollReset>
      <ListingCover
        bare
        src={listing.coverImage}
        category={listing.category}
        className="transition duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:-translate-y-1 group-hover:shadow-lg"
      >
        <FavoriteButton listingId={listing.id} revealOnHover className="absolute top-2 right-2" />
      </ListingCover>
      <div className="pt-3">
        <CardBreadcrumb listing={listing} />
        <h3 className="mt-1 text-sm font-semibold text-gray-900 leading-snug line-clamp-2 transition-colors group-hover:text-gray-950">
          {listing.title}
        </h3>
        <p className="mt-1 text-[12.5px] text-gray-500 truncate">{displayName(seller)}</p>
        <p className="mt-2 text-sm font-semibold text-primary-700 tabular-nums whitespace-nowrap">{formatXaf(listing.priceXaf)}</p>
      </div>
    </Link>
  );
};

/**
 * Minimum card width per cover shape (same as the rails): the grid fits as many columns as the
 * width allows, so a wide screen shows more cards instead of bigger ones.
 */
const GRID_COLUMNS: Record<CoverFormat, string> = {
  portrait: 'grid-cols-[repeat(auto-fill,minmax(148px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(188px,1fr))]',
  square: 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
  landscape: 'grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
  video: 'grid-cols-[repeat(auto-fill,minmax(250px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]',
};

/**
 * Grid of listings of ONE category, so every cover in a row has the same shape.
 * Mixed results use `ListingMasonry`. `reveal`: cards fade in as they scroll into view.
 */
export const ListingGrid: React.FC<{ views: ListingView[]; className?: string; reveal?: boolean }> = ({
  views,
  className,
  reveal = false,
}) => {
  if (views.length === 0) return null;
  const format = COVER_FORMAT[views[0].listing.category];
  return (
    <div className={clsx('grid gap-x-4 gap-y-8', GRID_COLUMNS[format], className)}>
      {views.map((v, i) =>
        reveal ? (
          <Reveal key={v.listing.id} delay={(i % 4) * 60}>
            <ListingCard view={v} />
          </Reveal>
        ) : (
          <ListingCard key={v.listing.id} view={v} />
        )
      )}
    </div>
  );
};
