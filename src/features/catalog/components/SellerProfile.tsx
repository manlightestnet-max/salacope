import React, { useState } from 'react';
import clsx from 'clsx';
import { BadgeCheck, MessageSquareQuote, Package } from 'lucide-react';
import { EmptyState, ImageViewer, ProtectedImage, SearchField, Tabs } from '@/shared/ui';
import { User, useDb } from '@/shared/db';
import { formatMonthYear, formatNumber, getInitials } from '@/shared/lib';
import { FollowButton } from '@/features/library';
import { RatingBreakdown, ReviewList, formatRating, useSellerReviews, useSellerStat } from '@/features/reviews';
import { displayName } from '@/features/session';
import { useSellerListings } from '../hooks';
import { queryListings } from '../model';
import { ListingSections } from './ListingSections';
import { creatorTint } from './CreatorStrip';

/** One figure of the store, Instagram style: number over a small label. */
const Figure: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <div className="min-w-0 text-center sm:text-left">
    <div className="text-base sm:text-lg font-semibold leading-tight tracking-tight text-gray-900 tabular-nums">{value}</div>
    <div className="text-[11px] sm:text-xs text-gray-500 truncate">{label}</div>
  </div>
);

/**
 * A store's page: identity and key figures (offers, sales, rating, reviews, followers),
 * then its offers or its reviews.
 */
export const SellerProfile: React.FC<{ seller: User }> = ({ seller }) => {
  const listings = useSellerListings(seller.id);
  const stats = useSellerStat(seller.id);
  const reviews = useSellerReviews(seller.id);
  const followers = useDb((s) => s.stats.sellers[seller.id]?.followers ?? 0, [seller.id]);
  const [tab, setTab] = useState<'offers' | 'reviews'>('offers');
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<number | null>(null);
  const found = q.trim() ? queryListings(listings, { text: q.trim() }) : listings;
  const name = displayName(seller);
  const m = seller.merchant;

  return (
    <div>
      <section className="rounded-3xl border border-gray-200/70 bg-surface p-5 sm:p-7">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 sm:gap-x-5">
          <span
            className={clsx('w-20 h-20 sm:w-24 sm:h-24 shrink-0 sm:row-span-2 rounded-full overflow-hidden select-none flex items-center justify-center text-2xl sm:text-3xl font-semibold', creatorTint(seller.id))}
            onContextMenu={(e) => e.preventDefault()}
          >
            {m?.logo ? (
              <button type="button" onClick={() => setViewing(0)} aria-label="Voir la photo en grand" className="w-full h-full cursor-zoom-in">
                <ProtectedImage src={m.logo} />
              </button>
            ) : (
              getInitials(name)
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 break-words">{name}</h2>
              {m?.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                  <BadgeCheck className="w-4 h-4" /> Vérifié
                </span>
              )}
              <span className="w-full sm:w-auto sm:ml-auto">
                <FollowButton sellerId={seller.id} size="md" />
              </span>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 min-w-0">
            <div className="grid grid-cols-5 gap-2 sm:gap-6 max-w-lg">
              <Figure value={formatNumber(listings.length)} label="offres" />
              <Figure value={formatNumber(stats?.completedSales ?? 0)} label="ventes" />
              <Figure
                value={
                  stats && stats.reviews > 0 ? (
                    <span className="inline-flex items-center gap-0.5">
                      {formatRating(stats.rating)}
                      <span className="text-amber-500 text-sm" aria-hidden>
                        ★
                      </span>
                    </span>
                  ) : (
                    '—'
                  )
                }
                label="note"
              />
              <Figure value={formatNumber(reviews.length)} label="avis" />
              <Figure value={formatNumber(followers)} label="abonnés" />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-1">
          {m?.headline && <p className="text-sm text-gray-900">{m.headline}</p>}
          <p className="text-xs text-gray-500">
            {[m?.city, `Vendeur depuis ${formatMonthYear(m?.activatedAt ?? seller.createdAt)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </section>

      {/* Pinned under the header while the page scrolls; the profile card above scrolls away and comes back at the top. */}
      <div className="sticky top-[var(--sticky-offset,0px)] z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5 mt-6 bg-canvas sm:bg-canvas/80 sm:backdrop-blur-xl border-b border-gray-200/60">
        <div className="flex items-center gap-3">
        <Tabs
          className="shrink-0"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'offers', label: 'Offres', count: listings.length },
            { value: 'reviews', label: 'Avis', count: reviews.length },
          ]}
        />
        {tab === 'offers' && listings.length > 0 && (
          <SearchField value={q} onChange={setQ} placeholder="Rechercher" className="flex-1 min-w-0 sm:ml-auto sm:max-w-xs" />
        )}
        </div>
      </div>

      {/* Both panels stay mounted: going back to a tab shows it as it was (no reload, no replayed entrance); the server's patches update it in place. */}
      <div hidden={tab !== 'offers'} className="pt-4 animate-fade-up motion-reduce:animate-none">
        {found.length ? (
          <ListingSections views={found} mode="grids" />
        ) : listings.length ? (
          <EmptyState icon={Package} title="Aucun résultat" description={`Rien ne correspond à « ${q.trim()} » dans cette boutique.`} />
        ) : (
          <EmptyState icon={Package} title="Aucune offre en ligne" />
        )}
      </div>
      <div hidden={tab !== 'reviews'} className="pt-4 animate-fade-up motion-reduce:animate-none">
        {reviews.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          <div className="rounded-2xl border border-gray-200/70 bg-surface p-5">
            <RatingBreakdown reviews={reviews} stacked />
          </div>
          <div className="rounded-2xl border border-gray-200/70 bg-surface p-5">
            <ReviewList reviews={reviews} />
          </div>
        </div>
      ) : (
        <EmptyState icon={MessageSquareQuote} title="Pas encore d'avis" description="Les avis apparaissent après les premières commandes terminées." />
        )}
      </div>
      {m?.logo && <ImageViewer images={[{ src: m.logo, alt: name }]} index={viewing} onIndex={setViewing} />}
    </div>
  );
};
