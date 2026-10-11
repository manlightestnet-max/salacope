import { useSyncExternalStore } from 'react';

/**
 * Emergency brake as the app sees it (see server/lockdown.ts): `off`, `payments` (no payment moves), `readonly` (nothing can
 * be changed) or `total` (the server answers nothing but "stopped"). It arrives with the data, and with any refused request.
 */
export type LockdownLevel = 'off' | 'payments' | 'readonly' | 'total';

let level: LockdownLevel = 'off';
const listeners = new Set<() => void>();

export function reportLockdown(next: unknown) {
  const value: LockdownLevel = next === 'payments' || next === 'readonly' || next === 'total' ? next : 'off';
  if (value === level) return;
  level = value;
  listeners.forEach((l) => l());
}

export const useLockdown = (): LockdownLevel =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => level
  );

export const LOCKDOWN_TEXT: Record<Exclude<LockdownLevel, 'off'>, string> = {
  payments: 'Les paiements sont suspendus pour une vérification de sécurité.',
  readonly: 'Salacope est en lecture seule : les modifications sont suspendues pour une vérification de sécurité.',
  total: 'Salacope est momentanément arrêté pour une vérification de sécurité.',
};
