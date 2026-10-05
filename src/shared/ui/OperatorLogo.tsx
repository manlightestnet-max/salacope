import React from 'react';
import clsx from 'clsx';
import { PAYMENT_CHANNELS, PaymentChannel } from '@/shared/config/payment';
import mtnLogo from '@/shared/assets/mtn-momo.png';
import airtelLogo from '@/shared/assets/airtel-money.png';

const LOGO: Record<PaymentChannel, string> = { MTN_MOMO_COG: mtnLogo, AIRTEL_COG: airtelLogo };

/** The operator's own logo (MTN Mobile Money, Airtel Money), square with rounded corners. */
export const OperatorLogo: React.FC<{ channel: PaymentChannel; className?: string }> = ({ channel, className }) => (
  <img
    src={LOGO[channel]}
    alt={PAYMENT_CHANNELS[channel].label}
    width={64}
    height={64}
    draggable={false}
    className={clsx('shrink-0 rounded-md object-cover', className)}
  />
);
