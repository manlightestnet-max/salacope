import React, { useId } from 'react';
import clsx from 'clsx';

// 16px on phones (iOS zooms into any smaller field), 14px from `sm`.
const control =
  'rounded-md border border-gray-300 bg-surface text-base sm:text-sm text-gray-900 placeholder:text-gray-400 shadow-xs transition-colors focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15 disabled:bg-gray-50 disabled:text-gray-500';

export interface FieldProps {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  /** Small control at the right of the label (e.g. "Mot de passe oublié ?"). */
  action?: React.ReactNode;
  className?: string;
  children: (id: string) => React.ReactNode;
}

/** Label + control + hint/error. The control receives the generated id. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, optional, action, className, children }) => {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <label htmlFor={id} className="text-sm font-medium text-gray-800">
            {label}
          </label>
          {optional && <span className="text-xs text-gray-400">Facultatif</span>}
          {action}
        </div>
      )}
      {children(id)}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, leading, trailing, ...props }, ref) => {
  if (!leading && !trailing) return <input ref={ref} className={clsx(control, 'w-full h-9 px-3', className)} {...props} />;
  return (
    <div className="relative flex items-center">
      {leading && <span className="absolute left-3 text-sm text-gray-500 pointer-events-none">{leading}</span>}
      <input
        ref={ref}
        className={clsx(control, 'w-full h-9', leading ? 'pl-10' : 'pl-3', trailing ? 'pr-16' : 'pr-3', className)}
        {...props}
      />
      {trailing && <span className="absolute right-3 text-sm text-gray-500 pointer-events-none">{trailing}</span>}
    </div>
  );
});
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={clsx(control, 'w-full px-3 py-2 resize-y', className)} {...props} />
  )
);
Textarea.displayName = 'Textarea';
