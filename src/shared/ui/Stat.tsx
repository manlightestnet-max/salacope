import React from 'react';
import clsx from 'clsx';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  emphasis?: boolean;
}

/** One KPI inside a `StatGrid`. */
export const Stat: React.FC<StatProps> = ({ label, value, hint, emphasis }) => (
  <div className="bg-surface px-4 py-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={clsx('mt-1 text-xl font-semibold tabular-nums', emphasis ? 'text-primary-700' : 'text-gray-900')}>{value}</div>
    {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
  </div>
);

/** KPIs on one strip separated by hairlines. */
export const StatGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx('grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200/70 border border-gray-200/70 rounded-2xl overflow-hidden', className)}>
    {children}
  </div>
);
