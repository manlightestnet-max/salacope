import React from 'react';
import clsx from 'clsx';
import { useInPanel } from './Panel';

/** Data table; unframed inside a `Panel`, a rounded card otherwise. Scrolls sideways on narrow screens. */
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const inPanel = useInPanel();
  return (
    <div className={clsx('overflow-x-auto', !inPanel && 'rounded-2xl border border-gray-200/70 bg-surface', className)}>
      <table className="w-full text-sm text-left border-collapse">{children}</table>
    </div>
  );
};

export const THead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead>
    <tr className="border-b border-gray-200/70">{children}</tr>
  </thead>
);

/** Column label: small capitals, like every list header of the back-office. */
export const Th: React.FC<{ children?: React.ReactNode; align?: 'left' | 'right'; className?: string }> = ({
  children,
  align = 'left',
  className,
}) => (
  <th
    className={clsx(
      'h-9 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap',
      align === 'right' && 'text-right',
      className
    )}
  >
    {children}
  </th>
);

export const TBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-gray-100">{children}</tbody>
);

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void; selected?: boolean }> = ({ children, onClick, selected }) => (
  <tr
    onClick={onClick}
    aria-selected={selected || undefined}
    className={clsx(
      'transition-colors hover:bg-gray-50',
      onClick && 'cursor-pointer',
      selected && 'bg-gray-100 shadow-[inset_3px_0_0_rgb(var(--accent))]'
    )}
  >
    {children}
  </tr>
);

export const Td: React.FC<{ children?: React.ReactNode; align?: 'left' | 'right'; className?: string }> = ({
  children,
  align = 'left',
  className,
}) => (
  <td className={clsx('h-14 px-4 text-gray-700', align === 'right' && 'text-right tabular-nums', className)}>{children}</td>
);
