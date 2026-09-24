import React from 'react';
import clsx from 'clsx';

export interface StatBlockProps {
  value: string;
  label: string;
  subtext?: string;
  className?: string;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  value,
  label,
  subtext,
  className,
}) => {
  return (
    <div className={clsx('text-center sm:text-left', className)}>
      <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-heading">
        {value}
      </div>
      <div className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">
        {label}
      </div>
      {subtext && (
        <div className="text-[11px] text-gray-500 mt-0.5">
          {subtext}
        </div>
      )}
    </div>
  );
};
