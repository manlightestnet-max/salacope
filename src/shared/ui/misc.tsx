import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, Info, Loader2, Search, X } from 'lucide-react';
import { getInitials } from '../lib/format';
import salacopeMark from '@/shared/assets/salacope-mark.png';

const CONTAINER_SIZE = {
  /** Storefront width: fills the screen up to 1875px, then stays centred (same as Kubeta). */
  full: 'max-w-[1875px] px-4 sm:px-6',
  lg: 'max-w-7xl px-4 sm:px-6',
  md: 'max-w-5xl px-4 sm:px-6',
};

export const Container: React.FC<{ children: React.ReactNode; className?: string; size?: keyof typeof CONTAINER_SIZE }> = ({
  children,
  className,
  size = 'full',
}) => <div className={clsx('mx-auto w-full', CONTAINER_SIZE[size], className)}>{children}</div>;

export const Logo: React.FC<{ to?: string; className?: string }> = ({ to = '/', className }) => (
  <Link to={to} className={clsx('flex items-center gap-2 select-none', className)}>
    {/* Salacope's mark (white S, green stroke) on its dark square: logo colours, not theme tokens. */}
    <span className="w-7 h-7 rounded-lg bg-[#0b0d0c] flex items-center justify-center">
      <img src={salacopeMark} alt="" width={128} height={110} draggable={false} className="w-5 h-auto" />
    </span>
    <span className="text-[15px] font-semibold tracking-tight text-gray-900">Salacope</span>
  </Link>
);

export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  name,
  size = 'md',
  className,
}) => (
  <span
    className={clsx(
      'inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-medium shrink-0',
      size === 'sm' && 'w-6 h-6 text-[10px]',
      size === 'md' && 'w-8 h-8 text-xs',
      size === 'lg' && 'w-10 h-10 text-sm',
      className
    )}
    aria-hidden
  >
    {getInitials(name)}
  </span>
);

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <Loader2 className={clsx('w-5 h-5 animate-spin text-gray-400', className)} />
);

export const Callout: React.FC<{ tone?: 'info' | 'warning'; title?: string; children: React.ReactNode; className?: string }> = ({
  tone = 'info',
  title,
  children,
  className,
}) => (
  <div
    className={clsx(
      'flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
      tone === 'info' ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-amber-50 border-amber-200 text-amber-900',
      className
    )}
  >
    {tone === 'info' ? (
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
    ) : (
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
    )}
    <div>
      {title && <p className="font-medium">{title}</p>}
      <div className={clsx(title && 'mt-0.5')}>{children}</div>
    </div>
  </div>
);

/** Key/value rows for detail panels. */
export const DescriptionList: React.FC<{ items: { label: string; value: React.ReactNode }[]; className?: string }> = ({
  items,
  className,
}) => (
  <dl className={clsx('divide-y divide-gray-100 text-sm', className)}>
    {items.map((item) => (
      <div key={item.label} className="flex items-start justify-between gap-4 py-2.5">
        <dt className="text-gray-500">{item.label}</dt>
        <dd className="text-gray-900 text-right min-w-0 break-words">{item.value}</dd>
      </div>
    ))}
  </dl>
);

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
  /** Keyboard hint shown while empty, e.g. "Ctrl K". */
  hint?: string;
  /** Taller, fully rounded field (storefront header). */
  pill?: boolean;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, placeholder = 'Rechercher', className, onSubmit, hint, pill = false }, ref) => (
    <div className={clsx('relative', className)}>
      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={ref}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className={clsx(
          'w-full pl-9 border bg-surface text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15 [&::-webkit-search-cancel-button]:hidden',
          pill ? 'h-10 rounded-full border-gray-200 transition-colors hover:border-gray-300' : 'h-9 rounded-md border-gray-300 shadow-xs',
          hint ? 'pr-16' : 'pr-8'
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
          aria-label="Effacer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        hint && (
          <kbd
            className={clsx(
              'hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 items-center border border-gray-200 bg-gray-50 font-sans text-[11px] text-gray-500 pointer-events-none',
              pill ? 'right-2 h-6 px-2 rounded-full' : 'right-2 h-5 px-1.5 rounded'
            )}
          >
            {hint}
          </kbd>
        )
      )}
    </div>
  )
);
SearchField.displayName = 'SearchField';
