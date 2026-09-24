import React from 'react';
import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'neutral' | 'verified' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
}) => {
  const variants = {
    neutral: 'bg-gray-100 text-gray-700 border border-gray-200/80',
    primary: 'bg-primary-50 text-primary-800 border border-primary-200/80',
    verified: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-sm font-medium',
    md: 'text-xs px-2.5 py-1 rounded-sm font-semibold',
  };

  return (
    <span className={clsx('inline-flex items-center gap-1 leading-none select-none', variants[variant], sizes[size], className)}>
      {variant === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
      {children}
    </span>
  );
};
