import { request } from '@/shared/api';

export interface LightPayWallet {
  connected: boolean;
  /** `sandbox`: test money (Salacope not in production). */
  environment: 'sandbox' | 'production';
  available?: number;
  locked?: number;
  /** LightPay account page (history). */
  accountUrl: string;
  /** LightPay withdrawal screen (to MTN MoMo / Airtel Money). */
  withdrawUrl?: string;
}

/** The seller's LightPay wallet, read live (the money never sits on Salacope). */
export const fetchLightPayWallet = () => request<LightPayWallet>('GET', '/lightpay/balance');
