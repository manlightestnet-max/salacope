import React, { useState } from 'react';
import clsx from 'clsx';
import { BadgeCheck, MessageSquareQuote, Package } from 'lucide-react';
import { EmptyState, Tabs } from '@/shared/ui';
import { User, useDb } from '@/shared/db';
import { formatMonthYear, formatNumber, getInitials } from '@/shared/lib';
import { FollowButton } from '@/features/library';
import { RatingBreakdown, ReviewList, formatRating, useSellerReviews, useSellerStat } from '@/features/reviews';
import { displayName } from '@/features/session';
import { useSellerListings } from '../hooks';
import { ListingSections } from './ListingSections';
import { creatorTint } from './CreatorStrip';

/** One figure of the store: big number, small label. */
const Figure: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
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
  const followers = useDb((s) => s.follows.filter((f) => f.sellerId === seller.id).length, [seller.id]);
  const [tab, setTab] = useState<'offers' | 'reviews'>('offers');
  const name = displayName(seller);
  const m = seller.merchant;

  return (
    <div>
      <section className="rounded-3xl border border-gray-200/70 bg-surface p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <span className={clsx('w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-semibold', creatorTint(seller.id))}>
            {getInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">{name}</h2>
              {m?.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                  <BadgeCheck className="w-4 h-4" /> Vérifié
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{[m?.headline, m?.city].filter(Boolean).join(' · ')}</p>
            <p className="mt-0.5 text-xs text-gray-500">Vendeur depuis {formatMonthYear(m?.activatedAt ?? seller.createdAt)}</p>
          </div>
          <div className="shrink-0">
            <FollowButton sellerId={seller.id} size="md" />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 sm:grid-cols-5 gap-4">
          <Figure value={formatNumber(listings.length)} label="offres" />
          <Figure value={formatNumber(stats?.completedSales ?? 0)} label="ventes" />
          <Figure
            value={
              stats && stats.reviews > 0 ? (
                <span className="inline-flex items-center gap-1">
                  {formatRating(stats.rating)}
                  <span className="text-amber-500 text-base" aria-hidden>
                    ★
                  </span>
                </span>
              ) : (
                '—'
              )
            }
            label="note moyenne"
          />
          <Figure value={formatNumber(reviews.length)} label="avis" />
          <Figure value={formatNumber(followers)} label="abonnés" />
        </div>
      </section>

      <Tabs
        className="mt-6 mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'offers', label: 'Offres', count: listings.length },
          { value: 'reviews', label: 'Avis', count: reviews.length },
        ]}
      />

      {tab === 'offers' ? (
        listings.length ? (
          <ListingSections views={listings} mode="grids" />
        ) : (
          <EmptyState icon={Package} title="Aucune offre en ligne" />
        )
      ) : reviews.length ? (
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
  );
};
