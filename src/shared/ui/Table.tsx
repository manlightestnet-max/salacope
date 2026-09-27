import React from 'react';
import clsx from 'clsx';

/** Data table in a rounded card; scrolls sideways on narrow screens. */
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx('rounded-2xl border border-gray-200/70 bg-surface overflow-x-auto', className)}>
    <table className="w-full text-sm text-left border-collapse">{children}</table>
  </div>
);

export const THead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead>
    <tr className="border-b border-gray-200/70">{children}</tr>
  </thead>
);

export const Th: React.FC<{ children?: React.ReactNode; align?: 'left' | 'right'; className?: string }> = ({
  children,
  align = 'left',
  className,
}) => (
  <th className={clsx('h-10 px-4 text-xs font-medium text-gray-500 whitespace-nowrap', align === 'right' && 'text-right', className)}>
    {children}
  </th>
);

export const TBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-gray-100">{children}</tbody>
);

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <tr onClick={onClick} className={clsx('transition-colors hover:bg-gray-50', onClick && 'cursor-pointer')}>
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
