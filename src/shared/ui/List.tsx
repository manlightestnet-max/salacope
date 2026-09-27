import React, { createContext, useContext } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Panel, useInPanel } from './Panel';

/** Column labels of a list: rows then align their meta and trailing parts under them. */
export interface ListColumns {
  main: string;
  meta?: string;
  trailing?: string;
  /** Rows carry an actions menu (keeps the header aligned with it). */
  actions?: boolean;
}

const Columns = createContext<ListColumns | null>(null);

const META_W = 'sm:w-40';
const TRAILING_W = 'sm:w-36';

/**
 * Back-office list. Inside a `Panel` it is unframed (the panel frames it); alone it is a
 * rounded card. With `columns`, a header row names the columns like a table (hidden on phones).
 */
export const List: React.FC<{ children: React.ReactNode; columns?: ListColumns; className?: string }> = ({ children, columns, className }) => {
  const inPanel = useInPanel();
  return (
    <Columns.Provider value={columns ?? null}>
      {/* No overflow-hidden: row menus must be able to open past the list's edge. */}
      <ul
        className={clsx(
          'divide-y divide-gray-100',
          inPanel
            ? '[&>li:last-child]:rounded-b-2xl'
            : 'rounded-2xl border border-gray-200/70 bg-surface [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl',
          className
        )}
      >
        {columns && (
          <li aria-hidden className="hidden sm:flex items-center gap-4 h-9 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <span className="flex-1 truncate">{columns.main}</span>
            {columns.meta !== undefined && <span className={clsx('shrink-0', META_W)}>{columns.meta}</span>}
            {columns.trailing !== undefined && <span className={clsx('shrink-0 text-right', TRAILING_W)}>{columns.trailing}</span>}
            <span className={clsx('shrink-0', columns.actions ? 'w-6' : 'w-4')} />
          </li>
        )}
        {children}
      </ul>
    </Columns.Provider>
  );
};

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
  /** Current row of a list + detail layout. */
  selected?: boolean;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({ to, onClick, leading, title, subtitle, meta, trailing, actions, selected, className }) => {
  const columns = useContext(Columns);
  const interactive = Boolean(to || onClick);
  const body = (
    <>
      {leading && <span className="shrink-0 flex">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 truncate">{title}</span>
        {subtitle && <span className="block text-xs text-gray-500 truncate mt-0.5">{subtitle}</span>}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">{meta}</span>}
      </span>
      {(meta || columns?.meta !== undefined) && (
        <span className={clsx('hidden sm:flex items-center gap-1.5 shrink-0', columns && META_W)}>{meta}</span>
      )}
      {(trailing || columns?.trailing !== undefined) && (
        <span className={clsx('shrink-0 text-right text-sm tabular-nums', columns && TRAILING_W)}>{trailing}</span>
      )}
      {interactive && !actions && <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 shrink-0 transition-transform group-hover:translate-x-0.5" />}
      {columns && !interactive && !actions && <span className="hidden sm:block w-4 shrink-0" />}
    </>
  );
  const rowClass = 'flex-1 min-w-0 flex items-center gap-3 sm:gap-4 px-4 py-3 min-h-[60px] text-left';

  return (
    <li
      aria-current={selected || undefined}
      className={clsx(
        'group flex items-center transition-colors',
        interactive && 'hover:bg-gray-50',
        selected && 'bg-gray-100 shadow-[inset_3px_0_0_rgb(var(--accent))]',
        className
      )}
    >
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

/**
 * A titled group of rows (a lane of the sales queue, a history…), framed as a panel:
 * title and count in the header, the rows edge to edge.
 */
export const ListSection: React.FC<{
  title: React.ReactNode;
  count?: number;
  help?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, count, help, action, footer, children, className }) => (
  <Panel flush title={title} count={count} help={help} actions={action} footer={footer} className={className}>
    {children}
  </Panel>
);
