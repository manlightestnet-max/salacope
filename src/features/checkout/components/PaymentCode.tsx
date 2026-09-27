import React from 'react';
import clsx from 'clsx';
import { Copy } from 'lucide-react';
import { useToast } from '@/shared/ui';

/** The attempt's unique code, always visible and easy to copy. */
export const PaymentCode: React.FC<{ code: string; className?: string }> = ({ code, className }) => {
  const toast = useToast();
  return (
    <div className={clsx('flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5', className)}>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500">Code de la transaction</div>
        <div className="font-mono text-sm font-semibold tracking-wider text-gray-900">{code}</div>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(code).then(() => toast.success('Code copié'), () => undefined)}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Copier le code"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
};
