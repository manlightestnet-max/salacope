import React from 'react';
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
  <img
    src={src}
    alt=""
    loading="lazy"
    className={clsx(
      'rounded object-cover bg-gray-100 border border-gray-200 shrink-0',
      THUMB_SIZE[COVER_FORMAT[category]][size],
      className
    )}
  />
);

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
    <img src={src} alt="" loading="lazy" className={clsx('w-full h-full object-cover', imageClassName)} />
    {bare && <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-gray-950/[0.06]" />}
    {children}
  </div>
);
