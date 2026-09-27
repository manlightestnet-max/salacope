import React from 'react';
import clsx from 'clsx';
import { Zap } from 'lucide-react';

export type Brand = 'salacope' | 'lightpay';

const BRAND_LABEL: Record<Brand, string> = { salacope: 'Salacope', lightpay: 'LightPay' };

/** App tile of a brand (Salacope, or LightPay which holds the money). */
export const BrandMark: React.FC<{ brand: Brand; className?: string }> = ({ brand, className }) => (
  <span
    className={clsx(
      'w-16 h-16 shrink-0 rounded-2xl border border-gray-200 bg-surface shadow-sm flex items-center justify-center',
      className
    )}
    role="img"
    aria-label={BRAND_LABEL[brand]}
  >
    {brand === 'salacope' ? (
      <span className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center text-lg font-bold">S</span>
    ) : (
      <span className="w-9 h-9 rounded-lg bg-gray-900 text-canvas flex items-center justify-center">
        <Zap className="w-5 h-5" fill="currentColor" />
      </span>
    )}
  </span>
);

export interface HandoffProps {
  from: Brand;
  to: Brand;
  title: string;
  description?: React.ReactNode;
  /** Covers the page (while the browser leaves for the other service). */
  overlay?: boolean;
}

/**
 * The moment Salacope hands over to LightPay (or LightPay hands back): both apps and a
 * travelling dot, so the change of address is expected, not alarming.
 */
export const Handoff: React.FC<HandoffProps> = ({ from, to, title, description, overlay = false }) => {
  const card = (
    <div role="status" aria-live="polite" className="w-full max-w-sm mx-auto rounded-3xl border border-gray-200/70 bg-surface shadow-lg px-6 py-8 text-center animate-fade-up">
      <div className="flex items-center justify-center gap-3" aria-hidden>
        <BrandMark brand={from} />
        <span className="handoff-track relative w-16 sm:w-20 h-4">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-gray-300" />
          <span className="handoff-dot absolute top-1/2 -translate-y-1/2 left-0 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/15" />
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45" />
        </span>
        <BrandMark brand={to} />
      </div>
      <h2 className="mt-6 text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
    </div>
  );

  if (!overlay) return card;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-canvas/90 backdrop-blur-sm">{card}</div>;
};
