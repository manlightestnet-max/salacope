import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/shared/ui';
import { Banner, useBanners } from '../banners';
import { LoadingImage } from './ListingCover';

const EVERY = 5500;
// The stored image is 1200×450 (8:3): same shape on every screen, so nothing is cropped on a phone.
const SHAPE = 'aspect-[8/3]';

const Slide: React.FC<{ banner: Banner }> = ({ banner }) => {
  const external = banner.link.startsWith('https://');
  const className = clsx('relative block w-full shrink-0 snap-start overflow-hidden rounded-2xl bg-gray-100', SHAPE);
  const content = (
    <>
      <LoadingImage src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-gray-950/[0.06]" />
      {banner.title && (
        <span className="absolute left-2 bottom-2 sm:left-4 sm:bottom-4 max-w-[min(85%,22rem)] truncate rounded-lg sm:rounded-xl bg-canvas/85 backdrop-blur px-2 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-sm font-semibold text-gray-900">
          {banner.title}
        </span>
      )}
    </>
  );
  return external ? (
    <a href={banner.link} target="_blank" rel="noopener noreferrer sponsored" className={className} aria-label={banner.title || 'Publicité'}>
      {content}
    </a>
  ) : (
    <Link to={banner.link} className={className} aria-label={banner.title || 'Publicité'}>
      {content}
    </Link>
  );
};

/**
 * Mini banner of the storefront: the advertising slots (up to three) an administrator configured, each opening its link.
 * Swipe or tap the dots; it advances by itself, pauses while touched or hovered, and never moves under reduced motion.
 */
export const ShopBanner: React.FC<{ className?: string }> = ({ className }) => {
  const banners = useBanners();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const count = banners?.length ?? 0;

  const go = (i: number) => {
    const el = track.current;
    if (!el || !count) return;
    const next = (i + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (!paused.current && document.visibilityState === 'visible') go(index + 1);
    }, EVERY);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count]);

  if (!banners) return <Skeleton className={clsx('w-full rounded-2xl', SHAPE, className)} />;
  if (!count) return null;

  return (
    <section
      aria-label="Publicité"
      className={clsx('relative', className)}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
      onTouchEnd={() => (paused.current = false)}
    >
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-2xl"
      >
        {banners.map((b) => (
          <Slide key={b.position} banner={b} />
        ))}
      </div>
      {count > 1 && (
        <div className="absolute right-2 top-2 sm:right-4 sm:top-4 flex gap-1.5 rounded-full bg-canvas/75 backdrop-blur px-1.5 py-1 sm:px-2 sm:py-1.5">
          {banners.map((b, i) => (
            <button
              key={b.position}
              type="button"
              onClick={() => go(i)}
              aria-label={`Afficher la publicité ${i + 1}`}
              aria-current={i === index}
              className={clsx('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-gray-900' : 'w-1.5 bg-gray-400')}
            />
          ))}
        </div>
      )}
    </section>
  );
};
