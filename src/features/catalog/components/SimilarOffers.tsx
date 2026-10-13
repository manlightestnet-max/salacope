import React, { useMemo } from 'react';
import { usePublishedListings } from '../hooks';
import { ListingView } from '../model';
import { similarListings } from '../ranking';
import { ListingMasonry } from './ListingMasonry';

/**
 * "Dans le même esprit": offers of other stores about the same subject (words of the title, the summary and what is
 * included, then the category). Never under a private store's offer: its buyers stay in that shop.
 */
export const SimilarOffers: React.FC<{ view: ListingView; className?: string; titleClassName?: string }> = ({ view, className, titleClassName = 'text-xl font-bold tracking-tight text-gray-900 mb-6' }) => {
  const all = usePublishedListings();
  const similar = useMemo(
    () => (view.seller?.merchant?.private ? [] : similarListings(view, all.filter((v) => v.listing.sellerId !== view.listing.sellerId), 8)),
    [view, all]
  );
  if (!similar.length) return null;
  return (
    <section className={className}>
      <h2 className={titleClassName}>Dans le même esprit</h2>
      <ListingMasonry views={similar} />
    </section>
  );
};
