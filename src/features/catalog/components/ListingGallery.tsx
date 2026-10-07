import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Listing } from '@/shared/db';
import { ImageViewer, Skeleton } from '@/shared/ui';
import { useListingImages } from '../api';
import { COVER_ASPECT, COVER_FORMAT } from '../model';
import { LoadingImage } from './ListingCover';

/**
 * Images of an offer in the shape of its category: swipe on a phone, arrows on a computer,
 * dots to follow, a tap opens them full screen (zoom). One image: just the cover.
 */
export const ListingGallery: React.FC<{ listing: Listing; className?: string }> = ({ listing, className }) => {
  const { images, loading, expected } = useListingImages(listing);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const aspect = COVER_ASPECT[COVER_FORMAT[listing.category]];
  const count = Math.max(images.length, loading ? expected : 0);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <div className={clsx('relative group', className)}>
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className={clsx('flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-xl bg-gray-100', aspect)}
      >
        {images.map((src, i) => (
          <button
            key={`${i}:${src.slice(-24)}`}
            type="button"
            onClick={() => setViewing(i)}
            className="relative shrink-0 w-full h-full snap-center cursor-zoom-in"
            aria-label={`Agrandir l’image ${i + 1} sur ${count}`}
          >
            <LoadingImage src={src} className="w-full h-full object-cover" />
          </button>
        ))}
        {loading && <Skeleton className="shrink-0 w-full h-full rounded-none" />}
      </div>
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-950/[0.06]" />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Image précédente"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-canvas/80 backdrop-blur items-center justify-center text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Image suivante"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-canvas/80 backdrop-blur items-center justify-center text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className={clsx('h-1.5 rounded-full bg-canvas transition-all duration-300', i === index ? 'w-4 opacity-100' : 'w-1.5 opacity-60')} />
            ))}
          </div>
        </>
      )}
      <span className="pointer-events-none absolute top-3 right-3 w-8 h-8 rounded-full bg-canvas/80 backdrop-blur hidden sm:flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="w-3.5 h-3.5" />
      </span>

      <ImageViewer images={images.map((src) => ({ src, alt: listing.title }))} index={viewing} onIndex={setViewing} />
    </div>
  );
};
