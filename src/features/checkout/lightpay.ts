/** LightPay's own script (lightpay.js): opens the payment in a dialog owned by LightPay. */
interface LightPayGlobal {
  /**
   * `idToken`: the buyer's current sign-in (same LightPay identity), so the wallet needs no second sign-in.
   * `theme`: the dialog opens in Salacope's current theme.
   */
  pay: (checkoutUrl: string, options?: { idToken?: string; theme?: 'dark' | 'light' }) => Promise<{ status: 'completed' | 'closed'; session: string }>;
}

let loading: Promise<LightPayGlobal> | null = null;

/** LightPay's pages (same default as the server's LIGHTPAY_CHECKOUT_URL). */
const CHECKOUT_ORIGIN = new URL(import.meta.env.VITE_LIGHTPAY_CHECKOUT_URL || 'https://checkout.smlab.xyz').origin;

/**
 * Before the buyer clicks Pay: opens the connection to LightPay and fetches its script, so the
 * payment dialog opens without those round trips.
 */
export function warmLightPay(): void {
  if (document.querySelector('link[data-lightpay-warm]')) return;
  const add = (rel: string, href: string) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.dataset.lightpayWarm = '';
    document.head.appendChild(link);
  };
  add('preconnect', CHECKOUT_ORIGIN);
  add('prefetch', `${CHECKOUT_ORIGIN}/lightpay.js`);
}

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
