import React from 'react';
import clsx from 'clsx';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export const TONES: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  success: { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  danger: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  info: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  brand: { badge: 'bg-primary-50 text-primary-700', dot: 'bg-primary-500' },
};

export const Badge: React.FC<{ tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  dot = false,
  className,
  children,
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-xs font-medium whitespace-nowrap',
      TONES[tone].badge,
      className
    )}
  >
    {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', TONES[tone].dot)} />}
    {children}
  </span>
);
