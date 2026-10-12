import { useEffect, useState } from 'react';
import { request } from '@/shared/api';
import { useDb } from '@/shared/db';
import { cached, remember } from '@/shared/hooks';

export const usePaymentAttempt = (attemptId: string | undefined) =>
  useDb((s) => (attemptId ? s.paymentAttempts.find((a) => a.id === attemptId) : undefined), [attemptId]);

/** A buyer's latest payment attempts, whatever their outcome. */
export const usePaymentAttempts = (buyerId: string, limit = 10) =>
  useDb((s) => s.paymentAttempts.filter((a) => a.buyerId === buyerId).slice(0, limit), [buyerId, limit]);

/** What a buyer gets back if an order of `total` is cancelled, asked to LightPay through the server; the last answer is kept. */
export interface RefundPreviewData {
  total: number;
  sent: number;
  operatorFee: number;
  lightpayFee: number;
  varies: boolean;
}

export function useRefundPreview(total: number) {
  const key = `refund-preview|${total}`;
  const [data, setData] = useState<RefundPreviewData | undefined>(() => cached<RefundPreviewData>(key));
  const [error, setError] = useState<string>();
  useEffect(() => {
    let live = true;
    setData(cached<RefundPreviewData>(key));
    setError(undefined);
    request<RefundPreviewData>('GET', `/checkout/refund-preview?total=${Math.round(total)}`).then(
      (d) => {
        remember(key, d);
        if (live) setData(d);
      },
      (e) => live && setError((e as Error).message)
    );
    return () => {
      live = false;
    };
  }, [key, total]);
  return { data, error };
}
