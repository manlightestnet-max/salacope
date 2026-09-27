import React from 'react';
import clsx from 'clsx';
import { HelpTip } from './HelpTip';
import { useInPanel } from './Panel';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** ⓘ explanation next to the label. */
  help?: string;
  emphasis?: boolean;
}

/** One figure of a `StatGrid`: small label, large value. */
export const Stat: React.FC<StatProps> = ({ label, value, hint, help, emphasis }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="truncate">{label}</span>
      {help && <HelpTip text={help} />}
    </div>
    <div className={clsx('mt-1.5 text-2xl font-semibold tracking-tight tabular-nums truncate', emphasis ? 'text-primary-700' : 'text-gray-900')}>
      {value}
    </div>
    {hint && <div className="mt-1 text-xs text-gray-500 truncate">{hint}</div>}
  </div>
);

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
