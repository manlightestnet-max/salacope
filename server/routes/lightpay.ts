import crypto from 'node:crypto';
import { DomainError } from '../../src/shared/domain/errors.js';
import { query } from '../db.js';
import { route } from '../http.js';
import { lightpay, lightpayEnv, pkce, verifyWebhook } from '../lightpay.js';
import { settleAttempt, settleDueOrders } from '../orders.js';
import { USER_COLUMNS, USER_FROM, userView } from '../views.js';

/** Sales land in the seller's own LightPay wallet: the store connects it once (LightPay Connect). */
const SCOPES = ['payee', 'balance:read'];

route('POST', '/lightpay/connect', async (ctx) => {
  const userId = await ctx.userId();
  const [m] = await query('SELECT 1 FROM merchants WHERE user_id = $1', [userId]);
  if (!m) throw new DomainError('Ouvrez d’abord votre boutique.', 403);
  const { verifier, challenge } = pkce();
  const state = crypto.randomBytes(24).toString('base64url');
  const redirectUri = `${ctx.origin}/lightpay/callback`;
  await query("DELETE FROM lightpay_connect_requests WHERE user_id = $1 OR created_at < NOW() - INTERVAL '1 hour'", [userId]);
  await query('INSERT INTO lightpay_connect_requests (state, user_id, code_verifier, redirect_uri) VALUES ($1, $2, $3, $4)', [
    state,
    userId,
    verifier,
    redirectUri,
  ]);
  return { url: lightpay.authorizeUrl({ redirectUri, state, codeChallenge: challenge, scopes: SCOPES }) };
});

/** LightPay sent the seller back with a one-time code: exchanged for the connection. */
route('POST', '/lightpay/callback', async (ctx) => {
  const userId = await ctx.userId();
  const state = String(ctx.body.state ?? '');
  if (ctx.body.error) {
    await query('DELETE FROM lightpay_connect_requests WHERE state = $1 AND user_id = $2', [state, userId]);
    throw new DomainError('Connexion refusée sur LightPay.');
  }
  const [request] = await query(
    "DELETE FROM lightpay_connect_requests WHERE state = $1 AND user_id = $2 AND created_at > NOW() - INTERVAL '1 hour' RETURNING *",
    [state, userId]
  );
  if (!request) throw new DomainError('Demande expirée : recommencez la connexion.', 400);
  const { connection } = await lightpay.exchangeCode(String(ctx.body.code ?? ''), request.redirect_uri, request.code_verifier);
  if (!connection.scopes.includes('payee')) throw new DomainError('Autorisez LightPay à recevoir vos paiements.');
  await query('UPDATE merchants SET lightpay_connection_id = $2 WHERE user_id = $1', [userId, connection.id]);
  const [row] = await query(`SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.id = $1`, [userId]);
  return { patch: { users: [userView(row, true)] } };
});

/** The seller's wallet, read live from LightPay. */
route('GET', '/lightpay/balance', async (ctx) => {
  const userId = await ctx.userId();
  const [m] = await query('SELECT lightpay_connection_id FROM merchants WHERE user_id = $1', [userId]);
  if (!m?.lightpay_connection_id) return { connected: false, environment: lightpayEnv(), accountUrl: lightpay.accountUrl() };
  const { balance } = await lightpay.connectionBalance(m.lightpay_connection_id);
  return {
    connected: true,
    environment: lightpayEnv(),
    available: Number(balance.available_balance ?? 0),
    locked: Number(balance.locked_balance ?? 0),
    accountUrl: lightpay.accountUrl(),
    withdrawUrl: lightpay.accountUrl('withdraw'),
  };
});

/**
 * LightPay events (signed). Only a hint: the session is read back from LightPay before
 * anything changes, so a forged or replayed call can do nothing.
 */
route('POST', '/lightpay/webhook', async (ctx) => {
  if (!verifyWebhook(ctx.rawBody, ctx.headers.get('lightpay-signature'))) throw new DomainError('Signature invalide.', 401);
  const event = ctx.body;
  const sessionId = event?.data?.session_id ?? event?.data?.id ?? event?.session_id;
  if (typeof sessionId === 'string') {
    const [a] = await query('SELECT id FROM payment_attempts WHERE lightpay_session_id = $1', [sessionId]);
    if (a) await settleAttempt(a.id);
  }
  return { received: true };
});

/** Daily job (Vercel cron) and safety net: pays sellers whose confirmation window has passed. */
route('GET', '/cron/settle', async (ctx) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || ctx.headers.get('authorization') !== `Bearer ${secret}`) throw new DomainError('Accès refusé.', 401);
  let total = 0;
  for (let i = 0; i < 10; i += 1) {
    const n = await settleDueOrders(20);
    total += n;
    if (n < 20) break;
  }
  const stale = await query<{ id: string }>(
    "SELECT id FROM payment_attempts WHERE status = 'pending' AND created_at < NOW() - INTERVAL '40 minutes' LIMIT 50"
  );
  for (const s of stale) await settleAttempt(s.id).catch(() => undefined);
  return { settled: total, checked: stale.length };
});

