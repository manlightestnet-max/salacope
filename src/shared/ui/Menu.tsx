import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  to?: string;
  onSelect?: () => void;
  danger?: boolean;
}

/** Click-to-open dropdown menu anchored to its trigger. */
export const Menu: React.FC<{
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  header?: React.ReactNode;
  items: (MenuItem | 'divider')[];
  align?: 'left' | 'right';
  side?: 'top' | 'bottom';
}> = ({ trigger, header, items, align = 'right', side = 'bottom' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass = (danger?: boolean) =>
    clsx(
      'w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-left',
      danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'
    );

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={clsx(
            'absolute z-40 min-w-[220px] bg-surface border border-gray-200 rounded-lg shadow-md p-1',
            align === 'right' ? 'right-0' : 'left-0',
            side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
          )}
        >
          {header && <div className="px-2.5 py-2 border-b border-gray-100 mb-1">{header}</div>}
          {items.map((item, i) =>
            item === 'divider' ? (
              <div key={`d${i}`} className="my-1 border-t border-gray-100" />
            ) : item.to ? (
              <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className={itemClass(item.danger)}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={itemClass(item.danger)}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
