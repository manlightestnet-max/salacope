import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ProtectedImage, ScrollArrows, useHorizontalScroll } from '@/shared/ui';
import { getInitials, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { FollowButton } from '@/features/library';
import { RatingSummary, isTopCreator, useSellerStats } from '@/features/reviews';
import { displayName } from '@/features/session';
import { ListingView } from '../model';

/** Avatar tints, picked from the seller id so a creator keeps the same colour everywhere. */
const TINTS = [
  'bg-primary-50 text-primary-700',
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-800',
  'bg-red-50 text-red-700',
  'bg-gray-100 text-gray-700',
];

export const creatorTint = (id: string) => TINTS[[...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TINTS.length];

/**
 * Best creators only: enough completed sales and well rated by their buyers (see `TOP_CREATOR`).
 * Scrolls sideways; a card opens the creator's offers in the search.
 */
export const CreatorStrip: React.FC<{ views: ListingView[]; limit?: number; className?: string }> = ({ views, limit = 12, className }) => {
  const stats = useSellerStats();

  const creators = useMemo(() => {
    const offers = new Map<string, number>();
    views.forEach(({ listing }) => offers.set(listing.sellerId, (offers.get(listing.sellerId) ?? 0) + 1));
    const sellers = new Map(views.flatMap(({ seller }) => (seller ? [[seller.id, seller] as const] : [])));

    return [...sellers.values()]
      .map((seller) => ({ seller, offers: offers.get(seller.id) ?? 0, stats: stats.get(seller.id) }))
      .filter((c): c is typeof c & { stats: NonNullable<typeof c.stats> } => isTopCreator(c.stats))
      .sort(
        (a, b) =>
          b.stats.rating - a.stats.rating ||
          b.stats.reviews - a.stats.reviews ||
          b.stats.completedSales - a.stats.completedSales ||
          displayName(a.seller).localeCompare(displayName(b.seller), 'fr')
      )
      .slice(0, limit);
  }, [views, stats, limit]);

  const scroll = useHorizontalScroll<HTMLUListElement>(creators.length);

  if (creators.length === 0) return null;

  return (
    <section aria-labelledby="creators-title" className={className}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id="creators-title" className="text-2xl font-semibold tracking-tight text-gray-900">
            Créateurs à suivre
          </h2>
          <p className="mt-1 text-sm text-gray-500">Les mieux notés par leurs clients.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScrollArrows scroll={scroll} />
        </div>
      </div>
      <ul
        ref={scroll.ref}
        onScroll={scroll.onScroll}
        className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-px-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:scroll-px-0"
      >
        {creators.map(({ seller, offers, stats: s }) => {
          const name = displayName(seller);
          return (
            <li
              key={seller.id}
              className="w-[172px] shrink-0 snap-start rounded-[18px] border border-gray-200/60 bg-surface px-3 pt-5 pb-4 flex flex-col items-center gap-3 text-center transition-colors hover:border-gray-300"
            >
              <Link to={ROUTES.store(seller.id)} className="group w-full min-w-0 flex flex-col items-center gap-2">
                <span
                  aria-hidden
                  className={clsx('w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-[17px] font-semibold', creatorTint(seller.id))}
                >
                  {seller.merchant?.logo ? <ProtectedImage src={seller.merchant.logo} /> : getInitials(name)}
                </span>
                <span className="mt-0.5 text-[13.5px] font-semibold leading-tight text-gray-900 line-clamp-2 group-hover:text-gray-950">{name}</span>
                <RatingSummary stats={s} className="text-xs" />
                <span className="text-xs text-gray-500">
                  {plural(s.completedSales, 'vente')} · {plural(offers, 'offre')}
                </span>
              </Link>
              <FollowButton sellerId={seller.id} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};
