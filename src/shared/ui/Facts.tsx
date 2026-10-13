import React from 'react';
import clsx from 'clsx';
import { HelpTip } from './HelpTip';

/**
 * Label on the left, value on the right, one line under the other: the reading of a statement or a record card.
 * `roomy` spaces the lines for a summary people read slowly (amounts); the default is compact (record cards).
 */
export const FactList: React.FC<{ children: React.ReactNode; roomy?: boolean; className?: string }> = ({ children, roomy, className }) => (
  <dl className={clsx('divide-y divide-gray-100', roomy && '[&>div]:py-3.5 [&>div]:text-[15px]', className)}>{children}</dl>
);

export const FactRow: React.FC<{
  label: React.ReactNode;
  /** ⓘ explanation next to the label. */
  help?: string;
  /** Small line under the label (a count, a date). */
  hint?: React.ReactNode;
  /** A total: the value in bold. */
  strong?: boolean;
  children: React.ReactNode;
}> = ({ label, help, hint, strong, children }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <dt className="min-w-0 text-gray-500">
      <span className="inline-flex items-center gap-1.5">
        {label}
        {help && <HelpTip text={help} />}
      </span>
      {hint && <span className="block mt-0.5 text-xs text-gray-400">{hint}</span>}
    </dt>
    <dd className={clsx('min-w-0 text-right break-words tabular-nums', strong ? 'font-semibold text-gray-900' : 'text-gray-900')}>{children}</dd>
  </div>
);
