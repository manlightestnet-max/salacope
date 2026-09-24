import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  className = '',
}) => {
  return (
    <div
      className={`border border-dashed border-gray-200 rounded-sm bg-gray-50/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-sm bg-white border border-gray-200 text-gray-400 flex items-center justify-center mb-4 shadow-2xs">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>

      <h3 className="text-sm sm:text-base font-bold text-gray-950 font-heading mb-1.5">
        {title}
      </h3>

      <p className="text-xs text-gray-500 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAction}
              className="text-xs rounded-sm font-medium px-4 py-2"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              className="text-xs rounded-sm font-medium px-4 py-2"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
