import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';

// 16px on phones (iOS zooms into any smaller field), 14px from `sm`.
const control =
  'rounded-md border border-gray-300 bg-surface text-base sm:text-sm text-gray-900 shadow-xs transition-colors focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15 disabled:bg-gray-50 disabled:text-gray-500';

export interface SelectProps<V extends string> {
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (value: V) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

interface Anchor {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/**
 * Our own dropdown list (the browser's native one looks different on every device and cannot be styled).
 * Computers: a list under the field (above it when there is no room), closed by a click outside, scrolling or Escape.
 * Phones: a bottom sheet with large rows. Keyboard: arrows, Home / End, Enter or Space to choose, Escape to close.
 */
export function Select<V extends string>({ value, options, onChange, className, id, disabled, title, ...aria }: SelectProps<V>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const label = options[selected]?.label ?? '';

  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const flip = below < 200 && above > below;
      setAnchor({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(320, flip ? above : below),
        ...(flip ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    }
    setActive(selected);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!(e.target instanceof Node)) return;
      if (list.current?.contains(e.target) || button.current?.contains(e.target)) return;
      close(false);
    };
    const shut = () => close(false);
    document.addEventListener('pointerdown', away);
    window.addEventListener('resize', shut);
    window.addEventListener('scroll', shut, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('resize', shut);
      window.removeEventListener('scroll', shut, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Phones: the sheet covers the page, which does not scroll behind it.
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 639px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // The active row stays in view while moving with the arrows.
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation(); // closes the list, not the dialog around it
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        title={title}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className={clsx(control, 'h-9 pl-3 pr-8 relative inline-flex items-center text-left', className)}
        {...aria}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={clsx('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
      </button>

      {open &&
        anchor &&
        createPortal(
          <>
            <div aria-hidden className="sm:hidden fixed inset-0 z-[70] bg-black/40" />
            <ul
              ref={list}
              id={listId}
              role="listbox"
              aria-label={aria['aria-label']}
              onKeyDown={onKeyDown}
              className={clsx(
                'z-[71] overflow-y-auto bg-surface border border-gray-200 shadow-lg p-1',
                // Phones: a bottom sheet that rises from the edge. Computers: a list anchored to the field.
                'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60dvh] max-sm:rounded-t-2xl max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-sm:animate-sheet',
                'sm:fixed sm:rounded-lg'
              )}
              style={window.matchMedia('(max-width: 639px)').matches ? undefined : { left: anchor.left, minWidth: anchor.width, top: anchor.top, bottom: anchor.bottom, maxHeight: anchor.maxHeight }}
            >
              {options.map((o, i) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={clsx(
                    'flex items-center gap-2 px-3 max-sm:h-12 sm:h-8 rounded-md text-base sm:text-sm cursor-pointer',
                    i === active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    o.value === value && 'font-medium text-gray-900'
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check className="w-4 h-4 shrink-0 text-primary-600" />}
                </li>
              ))}
            </ul>
          </>,
          document.body
        )}
    </>
  );
}
