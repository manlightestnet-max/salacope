import { createId, formatXaf, nowIso } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { DomainError, Withdrawal, db } from '@/shared/db';
import { computeBalance } from './model';

/** Sends available funds to the payout account set on the store. Processed by the platform (pending until paid). */
export function requestWithdrawal(sellerId: string, amountXaf: number): Withdrawal {
  const state = db.get();
  const seller = state.users.find((u) => u.id === sellerId);
  if (!seller?.merchant) throw new DomainError('Boutique introuvable.');

  const balance = computeBalance(
    state.orders.filter((o) => o.sellerId === sellerId),
    state.withdrawals.filter((w) => w.sellerId === sellerId)
  );
  const amount = Math.round(amountXaf);
  if (!amount || amount < PLATFORM.minWithdrawalXaf) {
    throw new DomainError(`Le montant minimum est de ${formatXaf(PLATFORM.minWithdrawalXaf)}.`);
  }
  if (amount > balance.available) throw new DomainError(`Solde disponible insuffisant (${formatXaf(balance.available)}).`);

  const withdrawal: Withdrawal = {
    id: createId('wth'),
    sellerId,
    amountXaf: amount,
    channel: seller.merchant.payoutChannel,
    phone: seller.merchant.payoutPhone,
    status: 'pending',
    reference: `RT-${Date.now().toString().slice(-5)}`,
    createdAt: nowIso(),
  };
  db.update((s) => ({ ...s, withdrawals: [withdrawal, ...s.withdrawals] }));
  return withdrawal;
}
