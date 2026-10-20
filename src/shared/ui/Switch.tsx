import React from 'react';
import clsx from 'clsx';

/**
 * An on/off choice as a full-width row (easy to hit with a thumb): the label on the left, the switch on the right.
 * `description` is a short line under the label.
 */
export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}> = ({ checked, onChange, label, icon, description, disabled, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={clsx('w-full min-h-[2.75rem] flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-left disabled:opacity-60', className)}
  >
    <span className="flex items-center gap-2.5 min-w-0">
      {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
    </span>
    <span aria-hidden className={clsx('relative shrink-0 w-9 h-5 rounded-full transition-colors motion-reduce:transition-none', checked ? 'bg-accent' : 'bg-gray-300')}>
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-xs transition-transform motion-reduce:transition-none',
          checked ? 'translate-x-4 bg-on-accent' : 'bg-surface'
        )}
      />
    </span>
  </button>
);
