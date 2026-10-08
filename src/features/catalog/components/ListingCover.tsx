import React, { useState } from 'react';
import clsx from 'clsx';
import { Category } from '@/shared/db';
import { COVER_ASPECT, COVER_FORMAT, CoverFormat } from '../model';

/** Fixed height, width from the format: a book thumb stays a book. */
const THUMB_SIZE: Record<CoverFormat, Record<'sm' | 'md', string>> = {
  portrait: { sm: 'h-10 w-[30px]', md: 'h-14 w-[42px]' },
  landscape: { sm: 'h-10 w-[53px]', md: 'h-14 w-[75px]' },
  video: { sm: 'h-10 w-[71px]', md: 'h-14 w-[100px]' },
  square: { sm: 'h-10 w-10', md: 'h-14 w-14' },
};

/** Small cover in tables and lists, in the shape of its category. */
export const ListingThumb: React.FC<{ src: string; category: Category; size?: 'sm' | 'md'; className?: string }> = ({
  src,
  category,
  size = 'sm',
  className,
}) => (
  <span className={clsx('relative block overflow-hidden rounded border border-gray-200 shrink-0', THUMB_SIZE[COVER_FORMAT[category]][size], className)}>
    <LoadingImage src={src} className="absolute inset-0 w-full h-full object-cover" />
  </span>
);

// Images already shown during this visit: coming back to a page (the browser has them) shows them as they are,
// with no shimmer and no fade, so the page does not look like it reloads.
const seen = new Set<string>();

/** Image that fades in over a shimmer of its own shape the first time it loads; afterwards it is simply there. */
export const LoadingImage: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt = '', className }) => {
  const [loaded, setLoaded] = useState(() => seen.has(src));
  const done = () => {
    seen.add(src);
    setLoaded(true);
  };
  return (
    <>
      {!loaded && <span aria-hidden className="absolute inset-0 shimmer" />}
      <img
        // Already in the browser's cache (complete before React attached its handler): no waiting state at all.
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && !loaded) done();
        }}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={done}
        onError={done}
        className={clsx(className, 'transition-opacity duration-300 motion-reduce:transition-none', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </>
  );
};

/** Cover at full width of its container, in the shape of its category. `bare`: no frame (storefront cards). */
export const ListingCover: React.FC<{
  src: string;
  category: Category;
  bare?: boolean;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
}> = ({ src, category, bare = false, className, imageClassName, children }) => (
  <div
    className={clsx(
      'relative overflow-hidden bg-gray-100',
      bare ? 'rounded-xl' : 'rounded-lg border border-gray-200',
      COVER_ASPECT[COVER_FORMAT[category]],
      className
    )}
  >
    <LoadingImage key={src} src={src} className={clsx('w-full h-full object-cover', imageClassName)} />
    {bare && <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-gray-950/[0.06]" />}
    {children}
  </div>
);
