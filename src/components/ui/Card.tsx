import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-sm transition-all duration-150',
        interactive && 'hover:opacity-95 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
