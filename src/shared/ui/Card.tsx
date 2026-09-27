import React from 'react';
import clsx from 'clsx';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={clsx('bg-surface border border-gray-200/70 rounded-2xl', className)} {...props} />
);

export interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, action, className }) => (
  <div className={clsx('flex items-start justify-between gap-4 px-5 pt-4 pb-3', className)}>
    <div className="min-w-0">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={clsx('px-5 pb-5', className)} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={clsx('px-5 py-3 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl flex items-center justify-end gap-2', className)}
    {...props}
  />
);
