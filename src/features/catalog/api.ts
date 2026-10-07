import { useEffect, useState } from 'react';
import { request } from '@/shared/api';
import { Listing } from '@/shared/db';

/** Extra images of each offer, fetched once per version of the offer. */
const galleries = new Map<string, Promise<string[]>>();

const loadGallery = (listing: Pick<Listing, 'id' | 'updatedAt'>) => {
  const key = `${listing.id}:${listing.updatedAt}`;
  if (!galleries.has(key)) {
    galleries.set(
      key,
      request<{ images: string[] }>('GET', `/listings/${encodeURIComponent(listing.id)}/gallery`)
        .then((r) => r.images)
        .catch(() => {
          galleries.delete(key);
          return [];
        })
    );
  }
  return galleries.get(key)!;
};

/**
 * Every image of an offer, cover first. The extra ones come from the server when the offer
 * is opened (the catalogue only knows how many there are); `loading` until they arrive.
 */
export function useListingImages(listing: Pick<Listing, 'id' | 'updatedAt' | 'coverImage' | 'galleryCount'>) {
  const [extra, setExtra] = useState<string[] | null>(listing.galleryCount ? null : []);
  useEffect(() => {
    if (!listing.galleryCount) return setExtra([]);
    let live = true;
    setExtra(null);
    void loadGallery(listing).then((images) => live && setExtra(images));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id, listing.updatedAt, listing.galleryCount]);
  return { images: [listing.coverImage, ...(extra ?? [])], loading: extra === null, expected: 1 + (listing.galleryCount ?? 0) };
}

/** The editor needs the current gallery to show and change it. */
export const fetchGallery = (listing: Pick<Listing, 'id' | 'updatedAt'>) => loadGallery(listing);

/**
 * Insights for the seller: a visit of the offer (once per browser session) or a click on
 * Buy / Order. Fire and forget: a failure never bothers the visitor.
 */
export function trackListing(listingId: string, type: 'view' | 'click') {
  if (type === 'view') {
    const key = `salacope:viewed:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // private mode: count it anyway
    }
  }
  void request('POST', `/listings/${encodeURIComponent(listingId)}/track`, { type }).catch(() => undefined);
}

export interface ListingInsight {
  id: string;
  views: number;
  clicks: number;
  views30: number;
  clicks30: number;
  revenue: number;
}

export const fetchInsights = () => request<{ insights: ListingInsight[] }>('GET', '/seller/insights').then((r) => r.insights);
