import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Listing } from '@/shared/db';
import { ImageViewer, Skeleton } from '@/shared/ui';
import { FavoriteButton } from '@/features/library';
import { useListingImages } from '../api';
import { COVER_ASPECT, COVER_FORMAT } from '../model';
import { LoadingImage } from './ListingCover';

/**
 * Images of an offer in the shape of its category: swipe on a phone, arrows on a computer, a tap opens them full screen
 * (zoom). One image: just the cover. With `thumbs="side"` (wide covers) it reads like a shop app: a column of thumbnails
 * on the left of the big image on computers, a row of thumbnails under it on phones; the heart and the zoom sit on the image.
 */
export const ListingGallery: React.FC<{ listing: Listing; className?: string; thumbs?: 'side' }> = ({ listing, className, thumbs }) => {
  const { images, loading, expected } = useListingImages(listing);
  const track = useRef<HTMLDivElement>(null);
  const stripSide = useRef<HTMLDivElement>(null);
  const stripRow = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const aspect = COVER_ASPECT[COVER_FORMAT[listing.category]];
  const count = Math.max(images.length, loading ? expected : 0);
  const side = thumbs === 'side' && count > 1;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  // The current thumbnail stays in view inside its own strip (never scrolls the page).
  useEffect(() => {
    for (const [ref, vertical] of [[stripSide, true], [stripRow, false]] as const) {
      const box = ref.current;
      const thumb = box?.children[index] as HTMLElement | undefined;
      if (!box || !thumb || box.offsetParent === null) continue; // the one that is not displayed is left alone
      box.scrollTo(
        vertical
          ? { top: thumb.offsetTop - box.clientHeight / 2 + thumb.offsetHeight / 2, behavior: 'smooth' }
          : { left: thumb.offsetLeft - box.clientWidth / 2 + thumb.offsetWidth / 2, behavior: 'smooth' }
      );
    }
  }, [index]);

  const thumbButton = (src: string | null, i: number) => (
    <button
      key={src ? `${i}:${src.slice(-24)}` : `loading-${i}`}
      type="button"
      onClick={() => src && go(i)}
      aria-label={`Image ${i + 1} sur ${count}`}
      aria-current={i === index}
      className={clsx(
        'relative shrink-0 w-16 h-16 overflow-hidden rounded-lg border-2 bg-gray-100 transition-colors',
        i === index ? 'border-gray-900' : 'border-transparent opacity-80 hover:opacity-100'
      )}
    >
      {src ? <LoadingImage src={src} className="w-full h-full object-cover" /> : <Skeleton className="absolute inset-0 rounded-none" />}
    </button>
  );
  const thumbList = [...images, ...Array.from({ length: Math.max(0, count - images.length) }, () => null)];

  return (
    <div className={clsx(side && 'sm:grid sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-3', className)}>
      {side && (
        <div className="hidden sm:block relative">
          {/* The column is as tall as the big image, and scrolls when there are more thumbnails than room. */}
          <div ref={stripSide} className="absolute inset-0 overflow-y-auto scrollbar-none flex flex-col gap-2">
            {thumbList.map((src, i) => thumbButton(src, i))}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="relative group">
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
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-canvas/80 backdrop-blur items-center justify-center text-gray-900 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Image suivante"
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-canvas/80 backdrop-blur items-center justify-center text-gray-900 shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {!side && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5" aria-hidden>
                  {Array.from({ length: count }, (_, i) => (
                    <span key={i} className={clsx('h-1.5 rounded-full bg-canvas transition-all duration-300', i === index ? 'w-4 opacity-100' : 'w-1.5 opacity-60')} />
                  ))}
                </div>
              )}
            </>
          )}

          {side && (
            <>
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                <FavoriteButton listingId={listing.id} className="!w-9 !h-9 shadow-sm" />
                <button
                  type="button"
                  onClick={() => setViewing(index)}
                  aria-label="Agrandir l’image"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-surface/90 backdrop-blur text-gray-700 hover:text-gray-900 shadow-sm"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <span className="absolute bottom-3 right-3 px-2 h-6 rounded-full bg-canvas/80 backdrop-blur text-[11px] tabular-nums text-gray-800 flex items-center sm:hidden" aria-hidden>
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>

        {side && (
          <div ref={stripRow} className="sm:hidden mt-2 flex gap-2 overflow-x-auto scrollbar-none">
            {thumbList.map((src, i) => thumbButton(src, i))}
          </div>
        )}
      </div>

      <ImageViewer images={images.map((src) => ({ src, alt: listing.title }))} index={viewing} onIndex={setViewing} />
    </div>
  );
};
