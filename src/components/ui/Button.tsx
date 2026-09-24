import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  to?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  to,
  icon,
  iconPosition = 'left',
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2';

  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-xs focus-visible:outline-primary-600 active:bg-primary-800 disabled:bg-primary-300 disabled:cursor-not-allowed',
    secondary: 'bg-primary-50 hover:bg-primary-100 text-primary-900 border border-primary-200/80 focus-visible:outline-primary-600 active:bg-primary-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed',
    outline: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 focus-visible:outline-primary-600 active:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 focus-visible:outline-primary-600 active:bg-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-sm gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-md gap-2',
    lg: 'text-base px-6 py-3 rounded-lg gap-2.5',
  };

  const classes = clsx(
    baseStyles,
    variants[variant],
    sizes[size],
    (disabled || isLoading) && 'opacity-70 pointer-events-none',
    className
  );

  const content = (
    <>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};
