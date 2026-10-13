import React from 'react';
import { ArrowDownLeft, ExternalLink, Wallet } from 'lucide-react';
import { Badge, Button, EmptyState, FactList, FactRow, HelpTip, List, ListRow, Page, Panel, Tabs } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { LightPayConnect, useCurrentUser } from '@/features/session';
import { useLightPayWallet, useWallet } from '@/features/wallet';
import { ListingThumb } from '@/features/catalog';
import { OrderStatusBadge } from '@/features/orders';

type View = 'overview' | 'releases' | 'movements';

/**
 * What Salacope paid the seller: held by LightPay until buyers validate, then paid into the
 * seller's LightPay wallet. The wallet's balance and withdrawals belong to LightPay, not here.
 */
export const PayoutsPage: React.FC = () => {
  const user = useCurrentUser();
  const { balance, ledger, releases } = useWallet(user.id);
  const { wallet, error, reload } = useLightPayWallet();
  const [view, setView] = useRememberedParam<View>('seller.payouts', 'vue', ['overview', 'releases', 'movements'], 'overview');
  const connected = wallet ? wallet.connected : Boolean(user.merchant?.lightpayConnected);

  return (
    <Page
      title="Paiements"
      help="LightPay garde l’argent de chaque vente jusqu’à la validation du client, puis le verse sur votre wallet LightPay. Les retraits se font depuis LightPay."
      actions={
        wallet?.withdrawUrl && (
          <Button variant="primary" href={wallet.withdrawUrl} icon={<ExternalLink className="w-4 h-4" />}>
            Retirer sur LightPay
          </Button>
        )
      }
      toolbar={
        connected && (
          <Tabs
            bare
            value={view}
            onChange={setView}
            items={[
              { value: 'overview', label: 'Aperçu' },
              { value: 'releases', label: 'À venir', count: releases.length || undefined },
              { value: 'movements', label: 'Versées', count: ledger.length || undefined },
            ]}
          />
        )
      }
    >
      {!connected ? (
        <Panel>
          <LightPayConnect revoked={wallet?.revoked} />
        </Panel>
      ) : view === 'overview' ? (
        <Panel
          title="Aperçu des paiements"
          className="max-w-2xl"
          actions={wallet?.environment === 'sandbox' ? <Badge tone="warning">Mode test</Badge> : undefined}
          footer={
            error ? (
              <button type="button" onClick={reload} className="underline underline-offset-2 hover:text-gray-900">
                {error} Réessayer
              </button>
            ) : (
              'Ce que Salacope vous a versé. Votre solde et vos retraits se gèrent sur LightPay.'
            )
          }
        >
          <div className="pb-5 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              Versé sur LightPay
              <HelpTip text="Ventes validées moins la commission : ce que Salacope a versé sur votre wallet LightPay. Ce total ne baisse pas quand vous retirez." />
            </div>
            <div className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums text-primary-700">{formatXaf(balance.released)}</div>
            <p className="mt-1 text-sm text-gray-500">{plural(ledger.length, 'vente versée', 'ventes versées')}</p>
          </div>
          <FactList roomy>
            <FactRow label="Ventes validées" hint={plural(ledger.length, 'vente', 'ventes')} help="Montant des ventes validées, avant commission.">
              {formatXaf(balance.sold)}
            </FactRow>
            <FactRow label="Commission Salacope" help="Retenue automatiquement sur chaque vente validée. Elle apparaît aussi, ligne par ligne, dans votre activité LightPay.">
              {balance.commission ? `−${formatXaf(balance.commission)}` : formatXaf(0)}
            </FactRow>
            <FactRow label="Versé sur votre wallet" strong>
              {formatXaf(balance.released)}
            </FactRow>
            <FactRow
              label="Encore bloqué"
              hint={balance.frozen ? `dont ${formatXaf(balance.frozen)} en litige` : plural(releases.length, 'vente en cours', 'ventes en cours')}
              help="Payé par vos clients et gardé par LightPay jusqu’au déblocage. Un litige gèle la vente jusqu’à la décision de Salacope."
            >
              {releases.length ? (
                <button type="button" onClick={() => setView('releases')} className="hover:underline underline-offset-2">
                  {formatXaf(balance.escrow + balance.frozen)}
                </button>
              ) : (
                formatXaf(balance.escrow + balance.frozen)
              )}
            </FactRow>
          </FactList>
        </Panel>
      ) : view === 'releases' ? (
        <Panel
          title="Déblocages à venir"
          count={releases.length}
          help="Argent encore bloqué, avec la date prévue du versement : ferme après livraison, estimée tant que le service est en cours."
          flush
        >
          {releases.length ? (
            <List columns={{ main: 'Commande', meta: 'Statut', trailing: 'Versement' }}>
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
                      <span className="text-xs text-gray-500">{at ? `${estimated ? 'vers le' : 'le'} ${formatDate(at)}` : 'après livraison'}</span>
                    </span>
                  }
                />
              ))}
            </List>
          ) : (
            <EmptyState icon={Wallet} title="Aucun paiement en attente" />
          )}
        </Panel>
      ) : (
        <Panel title="Ventes versées" count={ledger.length} help="Ventes validées par le client (ou automatiquement), versées sur votre wallet LightPay." flush>
          {ledger.length ? (
            <List columns={{ main: 'Vente', trailing: 'Montant' }}>
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
                  trailing={
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="font-medium text-emerald-700">+{formatXaf(e.amount)}</span>
                      {e.commission > 0 && (
                        <span className="text-xs text-gray-500">
                          {formatXaf(e.sale)} − {formatXaf(e.commission)} commission
                        </span>
                      )}
                    </span>
                  }
                />
              ))}
            </List>
          ) : (
            <EmptyState icon={Wallet} title="Aucune vente versée pour l’instant" />
          )}
        </Panel>
      )}
    </Page>
  );
};
