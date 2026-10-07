import React from 'react';
import clsx from 'clsx';

/** A block in the shape of what is loading. */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <span aria-hidden className={clsx('block shimmer rounded-md', className)} />;

/** Rows of a list while it loads: thumbnail, two lines, a value on the right. */
export const SkeletonRows: React.FC<{ rows?: number; className?: string }> = ({ rows = 5, className }) => (
  <ul aria-busy="true" aria-label="Chargement" className={clsx('divide-y divide-gray-100', className)}>
    {Array.from({ length: rows }, (_, i) => (
      <li key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <span className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-2.5 w-3/5" />
        </span>
        <Skeleton className="h-3 w-16" />
      </li>
    ))}
  </ul>
);

/** Catalogue cards while more results load. */
export const SkeletonCards: React.FC<{ count?: number; className?: string }> = ({ count = 4, className }) => (
  <div aria-busy="true" aria-label="Chargement" className={clsx('grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6', className)}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="space-y-2.5">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    ))}
  </div>
);
