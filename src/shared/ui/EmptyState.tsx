import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => (
  <div className={clsx('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
    {Icon && (
      <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <p className="text-sm font-medium text-gray-900">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
