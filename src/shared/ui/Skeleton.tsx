import React from 'react';
import clsx from 'clsx';

/** True until the first data arrives: the real screen is drawn, only what waits for data shimmers. */
export const BootingContext = React.createContext(false);
export const useBooting = () => React.useContext(BootingContext);

/**
 * A value that is not known yet, drawn with the real layout: the placeholder text takes its real typography and
 * size, but is painted as shimmer (per line, like text) so the page keeps its exact shape.
 */
export const Pending: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span aria-hidden className={clsx('shimmer rounded text-transparent select-none pointer-events-none [box-decoration-break:clone] [&_*]:text-transparent', className)}>
    {children}
  </span>
);

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

/** A store page while it loads: identity block, then its offers. */
export const SkeletonStore: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-busy="true" aria-label="Chargement de la boutique" className={clsx('space-y-6', className)}>
    <div className="flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
      <span className="flex-1 space-y-2.5">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </span>
    </div>
    <SkeletonCards count={4} />
  </div>
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
