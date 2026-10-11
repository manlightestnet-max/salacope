import { AsyncLocalStorage } from 'node:async_hooks';
import { DomainError } from '../src/shared/domain/errors.js';

/**
 * Emergency brake. Four levels, each one stricter than the last:
 *   off       normal.
 *   payments  nothing moves on LightPay: no new payment, no payout, no refund. The rest of the app works.
 *   readonly  payments frozen, and the database accepts no write (browsing and reading only).
 *   total     nothing touches the database and nothing calls LightPay: every request is answered "stopped".
 *
 * Two switches, the stricter wins:
 *   - the administration (Admin > Sécurité), kept in `app_settings`, read by each server at most every 5 seconds;
 *   - the environment variable SALACOPE_LOCKDOWN (payments | readonly | total), which does not depend on the database
 *     at all: with `total` set, not a single query is sent to Neon. It is the lever when the database or an administrator
 *     session may be compromised (change it on Vercel and redeploy).
 * Only the administration's own lockdown screen still reaches the database while stopped, to lift the lock.
 */
export type Level = 'off' | 'payments' | 'readonly' | 'total';
export const LEVELS: Level[] = ['off', 'payments', 'readonly', 'total'];
export const rank = (l: Level) => LEVELS.indexOf(l);

export interface LockdownState {
  level: Level;
  reason: string;
  since: string | null;
  by: string | null;
}

const KEY = 'lockdown';
const SESSIONS = 'sessions';
const OFF: LockdownState = { level: 'off', reason: '', since: null, by: null };
const TTL = 5_000;

let stored: LockdownState = OFF;
let signedOutAll: { validAfter: string | null; by: string | null; reason: string } = { validAfter: null, by: null, reason: '' };
let loadedAt = 0;

/** The level imposed by the environment (`1` / `true` mean total). */
export const envLevel = (): Level => {
  const v = (process.env.SALACOPE_LOCKDOWN ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true') return 'total';
  return (LEVELS as string[]).includes(v) ? (v as Level) : 'off';
};

/** The level in force now: the stricter of the environment and the administration's switch. */
export const levelNow = (): Level => (rank(envLevel()) >= rank(stored.level) ? envLevel() : stored.level);

export const stateNow = (): LockdownState & { forced: Level | null } => ({ ...stored, level: levelNow(), forced: envLevel() === 'off' ? null : envLevel() });
export const storedState = () => stored;

// Code that must keep working while stopped (the lockdown screen itself) runs in a bypass scope.
const bypass = new AsyncLocalStorage<true>();
export const withBypass = <T>(fn: () => Promise<T>) => bypass.run(true, fn);
const bypassing = () => bypass.getStore() === true;

export class LockedError extends DomainError {
  constructor(
    message: string,
    readonly level: Level
  ) {
    super(message, 503);
  }
}

const STOPPED = 'Salacope est momentanément arrêté pour une vérification de sécurité. Revenez dans quelques instants.';
const READONLY = 'Salacope est en lecture seule pour une vérification de sécurité : les modifications sont suspendues.';
const NO_PAYMENTS = 'Les paiements sont suspendus pour une vérification de sécurité. Réessayez dans quelques instants.';

/** Reads the administration's switch again if it has not been read for a few seconds (the only query made while stopped). */
export async function refreshLockdown(): Promise<void> {
  if (envLevel() === 'total') return; // already total: the database is not even asked
  if (Date.now() - loadedAt < TTL) return;
  loadedAt = Date.now();
  try {
    const { query } = await import('./db.js');
    const rows = await withBypass(() => query<{ key: string; value: string }>('SELECT key, value FROM app_settings WHERE key IN ($1, $2)', [KEY, SESSIONS]));
    const lock = rows.find((r) => r.key === KEY);
    stored = lock ? { ...OFF, ...JSON.parse(lock.value) } : OFF;
    const sessions = rows.find((r) => r.key === SESSIONS);
    signedOutAll = sessions ? { validAfter: null, by: null, reason: '', ...JSON.parse(sessions.value) } : signedOutAll;
  } catch {
    // table not migrated yet, or the database is unreachable: the last known state stays
  }
}

/** Keeps this instance in step right away (the others catch up within seconds). */
export function setStored(state: LockdownState) {
  stored = state;
  loadedAt = Date.now();
}

export const KEY_NAME = KEY;
export const SESSIONS_KEY = SESSIONS;

/** The moment before which every sign-in is void (everybody was signed out), or null. */
export const signedOutAllAt = () => signedOutAll.validAfter;
export const signedOutAllState = () => signedOutAll;
export function setSignedOutAll(state: { validAfter: string | null; by: string | null; reason: string }) {
  signedOutAll = state;
}

/** The person signed in before they were signed out (individually or with everybody): the sign-in no longer counts. */
export const signInVoid = (authTimeSeconds: number, userValidAfter?: string | null) => {
  const limit = Math.max(userValidAfter ? new Date(userValidAfter).getTime() : 0, signedOutAll.validAfter ? new Date(signedOutAll.validAfter).getTime() : 0);
  return limit > 0 && authTimeSeconds * 1000 < limit;
};

const WRITE = /\b(insert\s+into|delete\s+from|truncate|alter\s+table|drop\s+table|create\s+table|nextval)\b|(?<!for\s)\bupdate\s+[a-z_"(]/i;

/** Every SQL statement passes here: nothing at all when total, nothing that writes when read-only. */
export function guardDatabase(sql: string): void {
  if (bypassing()) return;
  const level = levelNow();
  if (level === 'total') throw new LockedError(STOPPED, level);
  if (level === 'readonly' && WRITE.test(sql)) throw new LockedError(READONLY, level);
}

/** Every call to LightPay passes here: reads are allowed until total, anything that moves money stops at the first level. */
export function guardPayments(method: string): void {
  const level = levelNow();
  if (level === 'total') throw new LockedError(STOPPED, level);
  if (level !== 'off' && method !== 'GET') throw new LockedError(NO_PAYMENTS, level);
}

export const lockedMessage = (level: Level) => (level === 'total' ? STOPPED : level === 'readonly' ? READONLY : NO_PAYMENTS);
