import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefixIcon, suffixIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              'w-full bg-white text-gray-900 text-sm border rounded-md transition-colors placeholder:text-gray-400 focus:outline-none',
              prefixIcon ? 'pl-9' : 'pl-3.5',
              suffixIcon ? 'pr-9' : 'pr-3.5',
              'py-2.5',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                : 'border-gray-300 focus:border-primary-600 focus:ring-1 focus:ring-primary-600/20',
              className
            )}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3 flex items-center text-gray-400">
              {suffixIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
