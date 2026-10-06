import React from 'react';
import clsx from 'clsx';
import { Listing } from '@/shared/db';
import { formatXaf } from '@/shared/lib';

/** Percentage off when the seller set a "before" price higher than the current one. */
export const discountOf = (listing: Pick<Listing, 'priceXaf' | 'compareAtXaf'>) =>
  listing.compareAtXaf && listing.compareAtXaf > listing.priceXaf ? Math.round((1 - listing.priceXaf / listing.compareAtXaf) * 100) : 0;

/** Price of an offer; on promotion, the former price struck through and the discount. */
export const ListingPrice: React.FC<{ listing: Pick<Listing, 'priceXaf' | 'compareAtXaf'>; className?: string }> = ({ listing, className }) => {
  const off = discountOf(listing);
  return (
    <span className={clsx('inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums', className)}>
      <span className="whitespace-nowrap">{formatXaf(listing.priceXaf)}</span>
      {off > 0 && (
        <>
          <s className="text-[0.8em] font-normal text-gray-400 whitespace-nowrap">{formatXaf(listing.compareAtXaf!)}</s>
          <span className="self-center px-1.5 py-px rounded-full bg-gray-100 text-[11px] font-medium text-gray-700">−{off} %</span>
        </>
      )}
    </span>
  );
};
