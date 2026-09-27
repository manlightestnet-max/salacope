/** LightPay's own script (lightpay.js): opens the payment in a dialog owned by LightPay. */
interface LightPayGlobal {
  pay: (checkoutUrl: string) => Promise<{ status: 'completed' | 'closed'; session: string }>;
}

let loading: Promise<LightPayGlobal> | null = null;

export function loadLightPay(checkoutUrl: string): Promise<LightPayGlobal> {
  const existing = (window as unknown as { LightPay?: LightPayGlobal }).LightPay;
  if (existing) return Promise.resolve(existing);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${new URL(checkoutUrl).origin}/lightpay.js`;
      s.async = true;
      s.onload = () => {
        const lp = (window as unknown as { LightPay?: LightPayGlobal }).LightPay;
        if (lp) resolve(lp);
        else reject(new Error('LightPay indisponible'));
      };
      s.onerror = () => {
        loading = null;
        reject(new Error('LightPay indisponible'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}
