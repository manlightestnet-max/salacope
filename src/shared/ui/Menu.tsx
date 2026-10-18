import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Popover } from './Popover';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  to?: string;
  onSelect?: () => void;
  danger?: boolean;
}

const itemClass = (danger?: boolean) =>
  clsx('w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-left', danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100');

/** Click-to-open dropdown menu anchored to its trigger. */
export const Menu: React.FC<{
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  header?: React.ReactNode;
  items: (MenuItem | 'divider')[];
  align?: 'left' | 'right';
  side?: 'top' | 'bottom';
}> = ({ trigger, header, items, align = 'right', side = 'bottom' }) => (
  <Popover trigger={trigger} align={align} side={side} className="min-w-[220px] p-1">
    {(close) => (
      <>
        {header && <div className="px-2.5 py-2 border-b border-gray-100 mb-1">{header}</div>}
        {items.map((item, i) =>
          item === 'divider' ? (
            <div key={`d${i}`} className="my-1 border-t border-gray-100" />
          ) : item.to ? (
            <Link key={item.label} to={item.to} onClick={close} className={itemClass(item.danger)}>
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                close();
                item.onSelect?.();
              }}
              className={itemClass(item.danger)}
            >
              {item.icon}
              {item.label}
            </button>
          )
        )}
      </>
    )}
  </Popover>
);
