import crypto from 'node:crypto';

/**
 * Push notifications through Firebase Cloud Messaging (HTTP v1), without an SDK (same as LightPay).
 *
 *   SALACOPE_FCM_SERVICE_ACCOUNT   the service account key (JSON, raw or base64) of the Firebase project the Salacope app
 *                                  is registered in (lightpay-a5f01, app com.smlab.salacope).
 *                                  Firebase console > Project settings > Service accounts > Generate a key.
 * Without it, pushes are skipped (said once in the logs): the notifications stay in the app.
 */
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let account: ServiceAccount | null | undefined;
let warned = false;

function serviceAccount(): ServiceAccount | null {
  if (account !== undefined) return account;
  const raw = process.env.SALACOPE_FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) return (account = null);
  try {
    const a = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    if (!a.project_id || !a.client_email || !a.private_key) throw new Error('incomplete');
    account = { project_id: a.project_id, client_email: a.client_email, private_key: String(a.private_key).replace(/\n/g, '\n') };
  } catch (err: any) {
    console.error('[push] SALACOPE_FCM_SERVICE_ACCOUNT unreadable', err?.message);
    account = null;
  }
  return account;
}

export const pushReady = () => serviceAccount() !== null;

let access: { token: string; expiresAt: number } | null = null;

/** OAuth access token for FCM, signed with the service account key (kept about 55 min). */
async function accessToken(a: ServiceAccount): Promise<string> {
  if (access && access.expiresAt > Date.now() + 60_000) return access.token;
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: a.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(a.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${signature}`,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  access = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return access.token;
}

export type PushResult = 'sent' | 'invalid_token' | 'failed' | 'skipped';

/**
 * One notification to one phone. Android shows it even when the app is closed; a tap opens the app, which reads
 * `data.route` (an address of the site, e.g. /ac/achats/ord_…) to open the right screen.
 */
export async function sendPush(token: string, n: { title: string; body: string; route: string; tag?: string }): Promise<PushResult> {
  const a = serviceAccount();
  if (!a) {
    if (!warned) console.warn('[push] SALACOPE_FCM_SERVICE_ACCOUNT not set: push notifications skipped');
    warned = true;
    return 'skipped';
  }
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accessToken(a)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: n.title, body: n.body },
          data: { route: n.route },
          android: {
            priority: 'HIGH',
            // The Salacope mark (drawable of the app), tinted with the logo green.
            notification: { channel_id: 'salacope_events', icon: 'ic_stat_salacope', color: '#059669', tag: n.tag, default_sound: true },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return 'sent';
    const body: any = await res.json().catch(() => ({}));
    const code = body?.error?.details?.find?.((d: any) => d?.errorCode)?.errorCode ?? body?.error?.status;
    if (code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT' || res.status === 404) return 'invalid_token';
    console.error('[push] send failed', res.status, code);
    return 'failed';
  } catch (err: any) {
    console.error('[push] send failed', err?.message);
    return 'failed';
  }
}
