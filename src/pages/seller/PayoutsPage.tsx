import React, { useState } from 'react';
import { ArrowDownLeft, ExternalLink, Wallet } from 'lucide-react';
import { Badge, Button, EmptyState, List, ListRow, Page, Panel, Segmented, Stat, StatGrid } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { LightPayConnect, useCurrentUser } from '@/features/session';
import { useLightPayWallet, useWallet } from '@/features/wallet';
import { ListingThumb } from '@/features/catalog';
import { OrderStatusBadge } from '@/features/orders';

type View = 'releases' | 'movements';

/**
 * What Salacope paid the seller: held by LightPay until buyers validate, then paid into the
 * seller's LightPay wallet. The wallet's balance and withdrawals belong to LightPay, not here.
 */
export const PayoutsPage: React.FC = () => {
  const user = useCurrentUser();
  const { balance, ledger, releases } = useWallet(user.id);
  const { wallet, error, reload } = useLightPayWallet();
  const [view, setView] = useState<View>('releases');
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
    >
      <div className="space-y-6">
        {!connected && (
          <Panel>
            <LightPayConnect revoked={wallet?.revoked} />
          </Panel>
        )}

        <Panel
          title="Aperçu des paiements"
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
          <StatGrid>
            <Stat
              label="Bloqué"
              value={formatXaf(balance.escrow + balance.frozen)}
              help="Payé par vos clients, gardé par LightPay jusqu’à leur validation. Les litiges restent gelés jusqu’à la décision."
              hint={balance.frozen ? `dont ${formatXaf(balance.frozen)} en litige` : plural(releases.length, 'vente en cours', 'ventes en cours')}
            />
            <Stat
              label="Ventes validées"
              value={formatXaf(balance.sold)}
              help="Montant des ventes validées par vos clients, avant commission."
              hint={plural(ledger.length, 'vente', 'ventes')}
            />
            <Stat
              label="Commission Salacope"
              value={balance.commission ? `−${formatXaf(balance.commission)}` : formatXaf(0)}
              help="Retenue automatiquement sur chaque vente validée. Elle apparaît aussi, ligne par ligne, dans votre activité LightPay."
            />
            <Stat
              label="Versé sur LightPay"
              value={formatXaf(balance.released)}
              emphasis
              help="Ventes validées moins la commission : ce que Salacope a versé sur votre wallet LightPay. Ce total ne baisse pas quand vous retirez."
            />
          </StatGrid>
        </Panel>

        <Panel
          title={view === 'releases' ? 'Déblocages à venir' : 'Ventes versées'}
          count={view === 'releases' ? releases.length : ledger.length}
          help={
            view === 'releases'
              ? 'Argent encore bloqué, avec la date prévue du versement : ferme après livraison, estimée tant que le service est en cours.'
              : 'Ventes validées par le client (ou automatiquement), versées sur votre wallet LightPay.'
          }
          actions={
            <Segmented
              label="Vue"
              value={view}
              onChange={setView}
              options={[
                { value: 'releases', label: 'À venir' },
                { value: 'movements', label: 'Versées' },
              ]}
            />
          }
          flush
        >
          {view === 'releases' &&
            (releases.length ? (
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
            ))}

          {view === 'movements' &&
            (ledger.length ? (
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
            ))}
        </Panel>
      </div>
    </Page>
  );
};
