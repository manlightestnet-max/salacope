import React, { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Wallet } from 'lucide-react';
import { Badge, Button, EmptyState, List, ListRow, Page, Tabs } from '@/shared/ui';
import { formatDate, formatRelative, formatXaf, plural } from '@/shared/lib';
import { PAYMENT_CHANNELS } from '@/shared/config/payment';
import { PLATFORM } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { WithdrawDialog, useWallet } from '@/features/wallet';
import { ListingThumb } from '@/features/catalog';
import { OrderStatusBadge } from '@/features/orders';

const WITHDRAWAL_BADGE = {
  pending: { tone: 'warning', label: 'Virement en cours' },
  paid: { tone: 'success', label: 'Versé' },
  rejected: { tone: 'danger', label: 'Refusé' },
} as const;

type View = 'releases' | 'withdrawals' | 'movements';

/** One step of the money flow: held → available → paid out. */
const FlowStep: React.FC<{ label: string; value: number; hint?: React.ReactNode; emphasis?: boolean }> = ({ label, value, hint, emphasis }) => (
  <div className={clsx('flex-1 min-w-0 rounded-2xl border px-4 py-3.5', emphasis ? 'border-primary-600/30 bg-primary-50' : 'border-gray-200/70 bg-surface')}>
    <div className="text-xs text-gray-500">{label}</div>
    <div className={clsx('mt-1 text-xl font-semibold tabular-nums', emphasis ? 'text-primary-700' : 'text-gray-900')}>{formatXaf(value)}</div>
    {hint && <div className="mt-0.5 text-xs text-gray-500 truncate">{hint}</div>}
  </div>
);

const FlowArrow = () => <ArrowRight className="hidden sm:block w-4 h-4 shrink-0 self-center text-gray-300" aria-hidden />;

/**
 * Where the seller's money is: held until buyers confirm, available to withdraw, paid out.
 * Below: when held money unlocks, the withdrawals and every movement.
 */
export const PayoutsPage: React.FC = () => {
  const user = useCurrentUser();
  const merchant = user.merchant!;
  const { balance, ledger, releases, withdrawals } = useWallet(user.id);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('releases');
  const canWithdraw = balance.available >= PLATFORM.minWithdrawalXaf;
  const channel = PAYMENT_CHANNELS[merchant.payoutChannel];

  return (
    <Page
      title="Paiements"
      actions={
        <Button variant="primary" size="sm" onClick={() => setOpen(true)} disabled={!canWithdraw}>
          Retirer
        </Button>
      }
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={setView}
          items={[
            { value: 'releases', label: 'Déblocages à venir', count: releases.length },
            { value: 'withdrawals', label: 'Retraits', count: withdrawals.length },
            { value: 'movements', label: 'Mouvements', count: ledger.length },
          ]}
        />
      }
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
        <FlowStep
          label="Bloqué"
          value={balance.escrow + balance.frozen}
          hint={balance.frozen ? `dont ${formatXaf(balance.frozen)} en litige` : plural(releases.length, 'vente en cours', 'ventes en cours')}
        />
        <FlowArrow />
        <FlowStep
          label="Disponible"
          value={balance.available}
          emphasis
          hint={canWithdraw ? 'Retirable maintenant' : `Retrait dès ${formatXaf(PLATFORM.minWithdrawalXaf)}`}
        />
        <FlowArrow />
        <FlowStep
          label="Versé"
          value={balance.paidOut}
          hint={balance.pendingWithdrawals ? `+ ${formatXaf(balance.pendingWithdrawals)} en cours de virement` : undefined}
        />
      </div>
      <p className="mb-8 px-1 text-xs text-gray-500">
        Versements sur {channel.label} · {merchant.payoutPhone} ·{' '}
        <Link to={ROUTES.account.settings} className="underline underline-offset-2 hover:text-gray-900">
          modifier
        </Link>
      </p>

      {view === 'releases' &&
        (releases.length ? (
          <List>
            {releases.map(({ order, at, estimated }) => (
              <ListRow
                key={order.id}
                to={ROUTES.seller.sale(order.id)}
                leading={<ListingThumb src={order.item.coverImage} category={order.item.category} size="md" />}
                title={order.item.title}
                subtitle={`${order.number} · ${order.buyer.name}`}
                meta={<OrderStatusBadge order={order} perspective="seller" />}
                trailing={
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-medium text-gray-900">{formatXaf(order.amounts.net)}</span>
                    <span className="text-xs text-gray-500">
                      {at ? `${estimated ? 'vers le' : 'le'} ${formatDate(at)}` : 'après livraison'}
                    </span>
                  </span>
                }
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Aucun paiement en attente" className="rounded-2xl border border-gray-200/70" />
        ))}

      {view === 'withdrawals' &&
        (withdrawals.length ? (
          <List>
            {withdrawals.map((w) => (
              <ListRow
                key={w.id}
                leading={
                  <span className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold', PAYMENT_CHANNELS[w.channel].logoClass)}>
                    {PAYMENT_CHANNELS[w.channel].initial}
                  </span>
                }
                title={`Retrait ${w.reference}`}
                subtitle={`${w.phone} · demandé ${formatRelative(w.createdAt)}`}
                meta={<Badge tone={WITHDRAWAL_BADGE[w.status].tone}>{WITHDRAWAL_BADGE[w.status].label}</Badge>}
                trailing={<span className="font-medium text-gray-900">−{formatXaf(w.amountXaf)}</span>}
              />
            ))}
          </List>
        ) : (
          <EmptyState icon={Wallet} title="Aucun retrait" className="rounded-2xl border border-gray-200/70" />
        ))}

      {view === 'movements' &&
        (ledger.length ? (
          <List>
            {ledger.map((e) => {
              const credit = e.amount > 0;
              const Icon = credit ? ArrowDownLeft : ArrowUpRight;
              return (
                <ListRow
                  key={e.id}
                  leading={
                    <span
                      className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center',
                        credit ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                  }
                  title={e.label}
                  subtitle={`${e.detail} · ${formatDate(e.at)}`}
                  trailing={
                    <span className={clsx('font-medium', credit ? 'text-emerald-700' : 'text-gray-900')}>
                      {credit ? '+' : '−'}
                      {formatXaf(Math.abs(e.amount))}
                    </span>
                  }
                />
              );
            })}
          </List>
        ) : (
          <EmptyState icon={Wallet} title="Aucun mouvement" className="rounded-2xl border border-gray-200/70" />
        ))}

      <WithdrawDialog open={open} onClose={() => setOpen(false)} sellerId={user.id} merchant={merchant} available={balance.available} />
    </Page>
  );
};
