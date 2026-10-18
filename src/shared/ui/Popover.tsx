import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  /** The content; a function receives `close` (a choice made inside closes the popover). */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'left' | 'right';
  side?: 'top' | 'bottom';
  /** Size and padding of the floating box. */
  className?: string;
}

/** Click-to-open floating box anchored to its trigger: closed by a click outside or Escape. `Menu` and the dashboard's pickers build on it. */
export const Popover: React.FC<PopoverProps> = ({ trigger, children, align = 'right', side = 'bottom', className }) => {
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

  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={clsx(
            'absolute z-40 bg-surface border border-gray-200 rounded-lg shadow-md',
            align === 'right' ? 'right-0' : 'left-0',
            side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
            className
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
};
