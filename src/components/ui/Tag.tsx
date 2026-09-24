import React from 'react';
import clsx from 'clsx';

export interface TagProps {
  label: string;
  count?: number;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({
  label,
  count,
  icon,
  active = false,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors select-none',
        active
          ? 'bg-primary-600 text-white shadow-xs'
          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={clsx(
            'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
            active ? 'bg-primary-700 text-primary-100' : 'bg-gray-100 text-gray-600'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
};
