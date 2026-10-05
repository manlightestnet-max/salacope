export type PaymentChannel = 'MTN_MOMO_COG' | 'AIRTEL_COG';

export interface PaymentChannelConfig {
  id: PaymentChannel;
  label: string;
  shortLabel: string;
  hint: string;
}

export const PAYMENT_CHANNELS: Record<PaymentChannel, PaymentChannelConfig> = {
  MTN_MOMO_COG: {
    id: 'MTN_MOMO_COG',
    label: 'MTN MoMo',
    shortLabel: 'MTN MoMo',
    hint: 'Notification USSD instantanée',
  },
  AIRTEL_COG: {
    id: 'AIRTEL_COG',
    label: 'Airtel Money',
    shortLabel: 'Airtel',
    hint: 'Code secret sur votre mobile',
  },
};

export const PAYMENT_CHANNEL_LIST = Object.values(PAYMENT_CHANNELS);

export const DEFAULT_PAYMENT_CHANNEL: PaymentChannel = 'MTN_MOMO_COG';

export const paymentChannelLabel = (channel: PaymentChannel): string => PAYMENT_CHANNELS[channel].label;
