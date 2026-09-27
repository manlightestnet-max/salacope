import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
import { Order } from '@/shared/db';
import { BarChart, BarDatum, Button, EmptyState, List, ListRow, ListSection, Page, Panel, Segmented, Stat, StatGrid, UpdatedAt } from '@/shared/ui';
import { formatXaf, plural } from '@/shared/lib';
import { useLastSync } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { OrderList, isLate, needsAction, useSellerOrders } from '@/features/orders';
import { useWallet } from '@/features/wallet';
import { useManagedListings } from '@/features/listings';
import { ListingThumb } from '@/features/catalog';

const DAY = 86_400_000;

type Period = '7' | '30' | '90' | 'all';
const PERIODS = [
  { value: '7' as const, label: '7 j' },
  { value: '30' as const, label: '30 j' },
  { value: '90' as const, label: '90 j' },
  { value: 'all' as const, label: 'Tout' },
];

/** Most urgent first: disputes, late, oldest waiting. */
const urgency = (o: Order) => (o.status === 'disputed' ? 0 : isLate(o) ? 1 : o.status === 'paid' ? 2 : 3);

/** Rows shown in "À traiter"; the full queue is in Ventes. */
const TODO_PREVIEW = 6;

/** Daily bars for 7/30/90 days; monthly bars (up to 12) for "Tout". */
const buildSeries = (orders: Order[], period: Period): { data: BarDatum[]; revenue: number; count: number } => {
  const paid = orders.filter((o) => o.status !== 'cancelled');
  if (period === 'all') {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: d.toISOString(), label: d.toLocaleDateString('fr-FR', { month: 'short' }), value: 0, y: d.getFullYear(), m: d.getMonth() };
    });
    paid.forEach((o) => {
      const d = new Date(o.createdAt);
      const b = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
      if (b) b.value += o.amounts.net;
    });
    return {
      data: months.map(({ key, label, value }) => ({ key, label, value })),
      revenue: paid.reduce((s, o) => s + o.amounts.net, 0),
      count: paid.length,
    };
  }
  const days = Number(period);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const from = start.getTime() - (days - 1) * DAY;
  const data = Array.from({ length: days }, (_, i) => {
    const d = new Date(from + i * DAY);
    return { key: d.toISOString(), label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), value: 0 };
  });
  let revenue = 0;
  let count = 0;
  paid.forEach((o) => {
    const idx = Math.floor((new Date(o.createdAt).getTime() - from) / DAY);
    if (idx >= 0 && idx < days) {
      data[idx].value += o.amounts.net;
      revenue += o.amounts.net;
      count += 1;
    }
  });
  return { data, revenue, count };
};

export const DashboardPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const { balance } = useWallet(user.id);
  const listings = useManagedListings(user.id);
  const lastSync = useLastSync();
  const [period, setPeriod] = useState<Period>('30');

  const series = useMemo(() => buildSeries(orders, period), [orders, period]);
  const periodLabel = period === 'all' ? 'depuis le début' : `sur ${period} jours`;

  const todo = orders.filter((o) => needsAction(o, 'seller')).sort((a, b) => urgency(a) - urgency(b) || a.createdAt.localeCompare(b.createdAt));
  const topListings = [...listings].filter((l) => l.sales > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <Page
      title="Vue d'ensemble"
      help="Vos ventes, l’argent bloqué jusqu’à la validation des clients et ce qui a déjà été versé sur votre wallet LightPay."
      actions={
        <Button to={ROUTES.seller.newListing} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Nouvelle offre
        </Button>
      }
    >
      <div className="space-y-6">
        <Panel
          title="Aperçu des ventes"
          actions={<Segmented label="Période" value={period} options={PERIODS} onChange={setPeriod} />}
          footer={<UpdatedAt at={lastSync} />}
        >
          <StatGrid>
            <Stat label="Commandes" value={series.count} help={`Commandes payées ${periodLabel}, annulations exclues.`} />
            <Stat label="Volume net" value={formatXaf(series.revenue)} help={`Ce que ces commandes vous rapportent ${periodLabel}, commission déduite.`} />
            <Stat
              label="Bloqué"
              value={formatXaf(balance.escrow + balance.frozen)}
              help="Payé par vos clients et gardé par LightPay jusqu’à leur validation (litiges compris)."
            />
            <Stat
              label="Versé sur LightPay"
              value={formatXaf(balance.released)}
              help="Ventes validées, versées sur votre wallet LightPay."
              hint={
                <Link to={ROUTES.seller.payouts} className="hover:text-gray-900">
                  Paiements →
                </Link>
              }
              emphasis
            />
          </StatGrid>
          <div className="mt-6">
            <BarChart
              data={series.data}
              formatValue={formatXaf}
              title={`Revenus ${periodLabel}`}
              labelEvery={period === '7' ? 1 : period === '30' ? 7 : period === '90' ? 15 : 2}
            />
          </div>
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
          <ListSection
            title="À traiter"
            count={todo.length}
            help="Commandes qui attendent une action de votre part : litiges, retards, à accepter, à livrer."
            action={
              todo.length > TODO_PREVIEW && (
                <Link to={ROUTES.seller.sales} className="text-sm text-gray-500 hover:text-gray-900">
                  Tout voir
                </Link>
              )
            }
            className="min-w-0"
          >
            {todo.length ? (
              <OrderList
                orders={todo.slice(0, TODO_PREVIEW)}
                perspective="seller"
                counterpartyName={(o) => o.buyer.name}
                hrefFor={(o) => ROUTES.seller.sale(o.id)}
              />
            ) : (
              <EmptyState icon={CheckCircle2} title="Tout est à jour" />
            )}
          </ListSection>

          <ListSection
            title="Meilleures offres"
            action={
              <Link to={ROUTES.seller.listings} className="text-sm text-gray-500 hover:text-gray-900">
                Tout voir
              </Link>
            }
          >
            {topListings.length ? (
              <List>
                {topListings.map(({ listing, sales, revenue }) => (
                  <ListRow
                    key={listing.id}
                    to={ROUTES.seller.listing(listing.id)}
                    leading={<ListingThumb src={listing.coverImage} category={listing.category} size="md" />}
                    title={listing.title}
                    subtitle={plural(sales, 'vente')}
                    trailing={<span className="font-medium text-gray-900">{formatXaf(revenue)}</span>}
                  />
                ))}
              </List>
            ) : (
              <EmptyState
                title="Pas encore de vente"
                description={listings.length ? 'Partagez le lien de vos offres pour vos premières ventes.' : 'Publiez votre première offre.'}
                action={!listings.length ? <Button to={ROUTES.seller.newListing}>Créer une offre</Button> : undefined}
              />
            )}
          </ListSection>
        </div>
      </div>
    </Page>
  );
};
