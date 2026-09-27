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
 * Where the seller's money is: held by LightPay until buyers validate, then paid into the
 * seller's LightPay wallet (read live), from which they withdraw to Mobile Money.
 */
export const PayoutsPage: React.FC = () => {
  const user = useCurrentUser();
  const { balance, ledger, releases } = useWallet(user.id);
  const { wallet, error, reload } = useLightPayWallet();
  const [view, setView] = useState<View>('releases');
  const connected = wallet ? wallet.connected : Boolean(user.merchant?.lightpayConnected);

  const walletValue = wallet?.connected ? formatXaf(wallet.available ?? 0) : error ? '—' : wallet ? 'Non connecté' : '…';

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
            <LightPayConnect />
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
              'Solde LightPay lu en direct'
            )
          }
        >
          <StatGrid columns={3}>
            <Stat
              label="Bloqué"
              value={formatXaf(balance.escrow + balance.frozen)}
              help="Payé par vos clients, gardé par LightPay jusqu’à leur validation. Les litiges restent gelés jusqu’à la décision."
              hint={balance.frozen ? `dont ${formatXaf(balance.frozen)} en litige` : plural(releases.length, 'vente en cours', 'ventes en cours')}
            />
            <Stat
              label="Versé sur LightPay"
              value={formatXaf(balance.released)}
              help="Total des ventes validées et versées sur votre wallet LightPay."
              hint={plural(ledger.length, 'vente versée', 'ventes versées')}
            />
            <Stat
              label="Solde LightPay"
              value={walletValue}
              emphasis={Boolean(wallet?.connected)}
              help="Ce que vous pouvez retirer maintenant vers MTN MoMo ou Airtel Money, depuis LightPay."
              hint={wallet?.locked ? `+ ${formatXaf(wallet.locked)} bloqués` : 'Disponible au retrait'}
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
                    trailing={<span className="font-medium text-emerald-700">+{formatXaf(e.amount)}</span>}
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
