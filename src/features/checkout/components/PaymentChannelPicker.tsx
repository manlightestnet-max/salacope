import React from 'react';
import clsx from 'clsx';
import { PAYMENT_CHANNEL_LIST, PaymentChannel } from '@/shared/config/payment';
import { OperatorLogo } from '@/shared/ui';

export const PaymentChannelPicker: React.FC<{ value: PaymentChannel; onChange: (value: PaymentChannel) => void }> = ({
  value,
  onChange,
}) => (
  <div className="grid grid-cols-2 gap-2" role="radiogroup">
    {PAYMENT_CHANNEL_LIST.map((c) => {
      const selected = c.id === value;
      return (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(c.id)}
          className={clsx(
            'flex items-center gap-2.5 rounded-lg border px-3 h-12 text-left transition-colors',
            selected ? 'border-primary-600 ring-1 ring-primary-600 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <OperatorLogo channel={c.id} className="w-6 h-6" />
          <span className="text-sm font-medium text-gray-900">{c.label}</span>
        </button>
      );
    })}
  </div>
);
