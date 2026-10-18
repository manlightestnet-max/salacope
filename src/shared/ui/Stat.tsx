import React from 'react';
import clsx from 'clsx';
import { HelpTip } from './HelpTip';
import { useInPanel } from './Panel';
import { Skeleton, useBooting } from './Skeleton';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** ⓘ explanation next to the label. */
  help?: string;
  emphasis?: boolean;
}

/** One figure of a `StatGrid`: small label, large value. */
export const Stat: React.FC<StatProps> = ({ label, value, hint, help, emphasis }) => {
  const booting = useBooting();
  return (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="truncate">{label}</span>
      {help && <HelpTip text={help} />}
    </div>
    <div className={clsx('mt-1.5 text-2xl font-semibold tracking-tight tabular-nums truncate', emphasis ? 'text-primary-700' : 'text-gray-900')}>
      {booting ? <Skeleton className="h-7 w-24" /> : value}
    </div>
    {hint && !booting && <div className="mt-1 text-xs text-gray-500 truncate">{hint}</div>}
  </div>
  );
};

/**
 * Key figures side by side on a slightly raised well. Inside a `Panel` it sits in the
 * panel; alone it carries its own frame.
 */
export const StatGrid: React.FC<{ children: React.ReactNode; columns?: 2 | 3 | 4; className?: string }> = ({ children, columns = 4, className }) => {
  const inPanel = useInPanel();
  return (
    <div
      className={clsx(
        'grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl bg-gray-50 px-5 py-4',
        columns === 3 && 'lg:grid-cols-3',
        columns === 4 && 'lg:grid-cols-4',
        !inPanel && 'border border-gray-200/70',
        className
      )}
    >
      {children}
    </div>
  );
};

/** A titled grey block of `StatTile`s (a dashboard summary: Ventes, Visites, Clients). */
export const StatSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <section className={clsx('rounded-2xl bg-gray-100 p-3 sm:p-4', className)}>
    <h3 className="px-1 pb-3 text-base font-semibold text-gray-900">{title}</h3>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  </section>
);

/** One figure on its own card: the number large, its name and a ⓘ explanation under it. */
export const StatTile: React.FC<{ label: string; value: React.ReactNode; help?: string }> = ({ label, value, help }) => {
  const booting = useBooting();
  return (
    <div className="flex min-h-[7rem] min-w-0 flex-col justify-between rounded-xl bg-surface px-4 py-4 sm:px-5">
      <div className="truncate text-2xl font-bold tracking-tight tabular-nums text-gray-900 sm:text-3xl">{booting ? <Skeleton className="h-8 w-28" /> : value}</div>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-gray-800">
        <span className="truncate">{label}</span>
        {help && <HelpTip text={help} align="right" />}
      </div>
    </div>
  );
};
