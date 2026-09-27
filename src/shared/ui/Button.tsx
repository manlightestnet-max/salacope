import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** May return a promise: the button shows a spinner and ignores clicks until it settles. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Renders a router link styled as a button. */
  to?: string;
  /** Renders a link to another site (LightPay…) styled as a button. */
  href?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  block?: boolean;
  /** Fully rounded (storefront). */
  pill?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95 shadow-xs disabled:bg-accent/60 disabled:brightness-100',
  secondary: 'bg-surface text-gray-800 border border-gray-300 hover:bg-gray-50 shadow-xs disabled:text-gray-400',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-300',
  danger: 'bg-surface text-red-600 border border-gray-300 hover:bg-red-50 hover:border-red-200 shadow-xs',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
  xl: 'h-12 px-5 text-[15px] gap-2.5',
};

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md', extra?: string, pill = false) =>
  clsx(
    'inline-flex items-center justify-center font-medium whitespace-nowrap transition select-none disabled:cursor-not-allowed',
    pill ? 'rounded-full' : 'rounded-md',
    VARIANTS[variant],
    SIZES[size],
    extra
  );

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, to, href, icon, iconRight, block, pill, className, children, disabled, type = 'button', onClick, ...props }, ref) => {
    const [pending, setPending] = useState(false);
    loading = loading || pending;
    const classes = buttonClass(variant, size, clsx(block && 'w-full', className), pill);
    const content = (
      <>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
        {!loading && iconRight}
      </>
    );

    if (to) {
      return (
        <Link to={to} className={classes} aria-label={props['aria-label']} title={props.title}>
          {content}
        </Link>
      );
    }

    if (href) {
      return (
        <a href={href} className={classes} aria-label={props['aria-label']} title={props.title}>
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        onClick={
          onClick &&
          ((e) => {
            const result = onClick(e);
            if (result instanceof Promise) {
              setPending(true);
              result.finally(() => setPending(false)).catch(() => undefined);
            }
          })
        }
        {...props}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = 'Button';
