import React, { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, ExternalLink, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, List, ListRow, Page, Tabs } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { LightPayConnect, useCurrentUser } from '@/features/session';
import { useLightPayWallet, useWallet } from '@/features/wallet';
import { ListingThumb } from '@/features/catalog';
import { OrderStatusBadge } from '@/features/orders';

type View = 'releases' | 'movements';

/** One step of the money flow: held → paid into the LightPay wallet. */
const FlowStep: React.FC<{ label: string; value: number; hint?: React.ReactNode; emphasis?: boolean }> = ({ label, value, hint, emphasis }) => (
  <div className={clsx('flex-1 min-w-0 rounded-2xl border px-4 py-3.5', emphasis ? 'border-primary-600/30 bg-primary-50' : 'border-gray-200/70 bg-surface')}>
    <div className="text-xs text-gray-500">{label}</div>
    <div className={clsx('mt-1 text-xl font-semibold tabular-nums', emphasis ? 'text-primary-700' : 'text-gray-900')}>{formatXaf(value)}</div>
    {hint && <div className="mt-0.5 text-xs text-gray-500 truncate">{hint}</div>}
  </div>
);

const FlowArrow = () => <ArrowRight className="hidden sm:block w-4 h-4 shrink-0 self-center text-gray-300" aria-hidden />;

/** The seller's LightPay wallet, read live: where sales land and where withdrawals happen. */
const LightPayWalletCard: React.FC = () => {
  const { wallet, error, reload } = useLightPayWallet();
  if (wallet && !wallet.connected) {
    return (
      <Card className="mb-8">
        <CardBody className="pt-5">
          <LightPayConnect />
        </CardBody>
      </Card>
    );
  }
  return (
    <Card className="mb-8">
      <CardBody className="pt-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            Solde LightPay disponible
            {wallet?.environment === 'sandbox' && <Badge tone="warning">Mode test</Badge>}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
            {wallet ? formatXaf(wallet.available ?? 0) : error ? '—' : '…'}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            {error ? (
              <button type="button" onClick={reload} className="underline underline-offset-2 hover:text-gray-900">
                {error} Réessayer
              </button>
            ) : wallet?.locked ? (
              `+ ${formatXaf(wallet.locked)} bloqués jusqu’à validation`
            ) : (
              'Retrait vers MTN MoMo ou Airtel Money depuis LightPay'
            )}
          </div>
        </div>
        {wallet?.withdrawUrl && (
          <Button variant="primary" href={wallet.withdrawUrl} icon={<ExternalLink className="w-4 h-4" />}>
            Retirer sur LightPay
          </Button>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * Where the seller's money is: held by LightPay until buyers validate, then paid into
 * the seller's LightPay wallet. Below: when held money unlocks, and every sale paid.
 */
export const PayoutsPage: React.FC = () => {
  const user = useCurrentUser();
  const { balance, ledger, releases } = useWallet(user.id);
  const [view, setView] = useState<View>('releases');

  return (
    <Page
      title="Paiements"
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={setView}
          items={[
            { value: 'releases', label: 'Déblocages à venir', count: releases.length },
            { value: 'movements', label: 'Ventes versées', count: ledger.length },
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
        <FlowStep label="Versé sur LightPay" value={balance.released} emphasis hint="Après validation du client" />
      </div>
      <p className="mb-4 px-1 text-xs text-gray-500">
        LightPay garde l’argent de chaque vente jusqu’à la validation du client, puis le verse sur votre wallet.{' '}
        <Link to={ROUTES.account.settings} className="underline underline-offset-2 hover:text-gray-900">
          Paramètres
        </Link>
      </p>

      <LightPayWalletCard />

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

      {view === 'movements' &&
        (ledger.length ? (
          <List>
            {ledger.map((e) => (
              <ListRow
                key={e.id}
                to={ROUTES.seller.sale(e.id)}
                leading={
                  <span className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-700">
                    <ArrowDownLeft className="w-4 h-4" />
                  </span>
                }
                title={e.label}
                subtitle={`${e.detail} · ${formatDate(e.at)}`}
                trailing={<span className="font-medium text-emerald-700">+{formatXaf(e.amount)}</span>}
              />
            ))}
          </List>
        ) : (
          <EmptyState icon={Wallet} title="Aucune vente versée pour l’instant" className="rounded-2xl border border-gray-200/70" />
        ))}
    </Page>
  );
};
