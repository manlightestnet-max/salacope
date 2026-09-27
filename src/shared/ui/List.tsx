import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Back-office list: rounded rows in the storefront's card language. Works the same on
 * phones (no hidden columns): title and subtitle truncate, badges move under the title.
 */
export const List: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  // No overflow-hidden: row menus must be able to open past the list's edge.
  <ul
    className={clsx(
      'rounded-2xl border border-gray-200/70 bg-surface divide-y divide-gray-100 [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl',
      className
    )}
  >
    {children}
  </ul>
);

export interface ListRowProps {
  to?: string;
  onClick?: () => void;
  /** Thumbnail, avatar or icon. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Badges: inline on wide screens, under the title on phones. */
  meta?: React.ReactNode;
  /** Right column: amount, date. */
  trailing?: React.ReactNode;
  /** Controls outside the row link (menu). */
  actions?: React.ReactNode;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({ to, onClick, leading, title, subtitle, meta, trailing, actions, className }) => {
  const interactive = Boolean(to || onClick);
  const body = (
    <>
      {leading && <span className="shrink-0 flex">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 truncate">{title}</span>
        {subtitle && <span className="block text-xs text-gray-500 truncate mt-0.5">{subtitle}</span>}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">{meta}</span>}
      </span>
      {meta && <span className="hidden sm:flex items-center gap-1.5 shrink-0">{meta}</span>}
      {trailing && <span className="shrink-0 text-right text-sm tabular-nums">{trailing}</span>}
      {interactive && !actions && <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 shrink-0 transition-transform group-hover:translate-x-0.5" />}
    </>
  );
  const rowClass = 'flex-1 min-w-0 flex items-center gap-3 sm:gap-4 px-4 py-3 min-h-[60px] text-left';

  return (
    <li className={clsx('group flex items-center transition-colors', interactive && 'hover:bg-gray-50', className)}>
      {to ? (
        <Link to={to} className={rowClass}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={rowClass}>
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
      {actions && <span className="pr-2 shrink-0">{actions}</span>}
    </li>
  );
};

/** A titled group of rows (a lane of the sales queue, a history…). */
export const ListSection: React.FC<{
  title: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, count, action, children, className }) => (
  <section className={className}>
    <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
      <h2 className="text-sm font-semibold text-gray-900">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-gray-400 tabular-nums">{count}</span>}
      </h2>
      {action}
    </div>
    {children}
  </section>
);
