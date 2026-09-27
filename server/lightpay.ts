import crypto from 'node:crypto';
import { DomainError } from '../src/shared/domain/errors.js';

/**
 * LightPay (api.smlab.xyz): every franc goes through it. Salacope's secret key never leaves the server.
 * LIGHTWALLET_ENV picks the key: sandbox (test money) or production.
 */
export const lightpayEnv = () => (process.env.LIGHTWALLET_ENV === 'production' ? 'production' : 'sandbox');

const apiBase = () => (process.env.LIGHTWALLET_API_URL || 'https://api.smlab.xyz').replace(/\/$/, '');
const pagesBase = () => (process.env.LIGHTPAY_CHECKOUT_URL || 'https://checkout.smlab.xyz').replace(/\/$/, '');
const appId = () => process.env.LIGHTWALLET_APP_ID || 'salacope';

const secretKey = () => {
  const key = lightpayEnv() === 'production' ? process.env.LIGHTWALLET_SECRET_KEY_PRODUCTION : process.env.LIGHTWALLET_SECRET_KEY_SANDBOX;
  if (!key) throw new Error('LightPay secret key is not configured');
  return key;
};

export class LightPayError extends DomainError {
  constructor(
    message: string,
    status: number,
    readonly code: string
  ) {
    super(message, status);
  }
}

const FRIENDLY: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Fonds insuffisants sur LightPay.',
  CONNECTION_NOT_FOUND: 'Le wallet LightPay du vendeur n’est plus connecté.',
  CONNECTION_REVOKED: 'Le vendeur a déconnecté son wallet LightPay.',
  SCOPE_NOT_GRANTED: 'Le wallet LightPay du vendeur ne peut pas recevoir de paiement.',
  QUOTA_EXCEEDED: 'Plafond de paiements atteint pour aujourd’hui. Réessayez demain.',
};

async function call<T = any>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'X-Environment': lightpayEnv(),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new LightPayError('LightPay ne répond pas. Réessayez dans un instant.', 503, 'UNAVAILABLE');
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(data.error ?? 'LIGHTPAY_ERROR');
    console.error('[lightpay]', method, path, res.status, code, data.message);
    throw new LightPayError(FRIENDLY[code] ?? 'Paiement impossible pour le moment. Réessayez.', res.status >= 500 ? 502 : 400, code);
  }
  return data as T;
}

export interface LightPaySession {
  id: string;
  status: 'OPEN' | 'PROCESSING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  amount: string;
  hold_id: string | null;
  payer: { type: 'lightpay' | 'guest' } | null;
  checkout_url: string;
  expires_at: string;
}

export const lightpay = {
  /** Where the seller approves the connection of their wallet. */
  authorizeUrl(p: { redirectUri: string; state: string; codeChallenge: string; scopes: string[] }) {
    const u = new URL(`${pagesBase()}/connect`);
    u.search = new URLSearchParams({
      app_id: appId(),
      scope: p.scopes.join(' '),
      redirect_uri: p.redirectUri,
      state: p.state,
      code_challenge: p.codeChallenge,
      environment: lightpayEnv(),
    }).toString();
    return u.toString();
  },

  /** The seller's LightPay account page (balance, withdrawals). */
  accountUrl: (screen = '') => `${pagesBase()}/account?env=${lightpayEnv()}${screen ? `#/${screen}` : ''}`,

  exchangeCode: (code: string, redirectUri: string, codeVerifier: string) =>
    call<{ connection: { id: string; scopes: string[] } }>('POST', '/connect/token', { code, redirect_uri: redirectUri, code_verifier: codeVerifier }),

  connectionBalance: (connectionId: string) =>
    call<{ balance: { available_balance: string; locked_balance: string; currency: string } }>('GET', `/connections/${encodeURIComponent(connectionId)}/balance`),

  /** Payment to a connected seller, held in escrow until the order is validated. */
  createSession: (p: {
    idempotencyKey: string;
    amount: number;
    feeAmount: number;
    payee: string;
    reference: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }) =>
    call<{ session: LightPaySession }>(
      'POST',
      '/checkout/sessions',
      {
        amount: String(p.amount),
        fee_amount: String(p.feeAmount),
        currency: 'XAF',
        payee: p.payee,
        escrow: true,
        reference: p.reference,
        description: p.description.slice(0, 140),
        return_url: p.returnUrl,
        cancel_url: p.cancelUrl,
        expires_in_minutes: 30,
        metadata: p.metadata,
      },
      p.idempotencyKey
    ),

  getSession: (id: string) => call<{ session: LightPaySession }>('GET', `/checkout/sessions/${encodeURIComponent(id)}`),

  cancelSession: (id: string) => call('POST', `/checkout/sessions/${encodeURIComponent(id)}/cancel`, {}),

  /** Order validated: the seller receives the money. */
  capture: (holdId: string, idempotencyKey: string, resolveDispute = false) =>
    call('POST', `/holds/${encodeURIComponent(holdId)}/capture`, { resolve_dispute: resolveDispute }, idempotencyKey),

  /** Order cancelled: the buyer gets the money back. */
  release: (holdId: string, idempotencyKey: string, resolveDispute = false) =>
    call('POST', `/holds/${encodeURIComponent(holdId)}/release`, { resolve_dispute: resolveDispute }, idempotencyKey),

  /** Litigation: the money is frozen until a decision. */
  dispute: (holdId: string, reason: string) => call('POST', `/holds/${encodeURIComponent(holdId)}/dispute`, { reason: reason.slice(0, 300) }),
};

/** PKCE S256 pair. */
export const pkce = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') };
};

/** `LightPay-Signature: t=<unix>,v1=<hex HMAC-SHA256("<t>.<raw body>")>`, 5 minutes max. */
export function verifyWebhook(rawBody: string, header: string | null): boolean {
  const secret = process.env.LIGHTWALLET_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]));
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
