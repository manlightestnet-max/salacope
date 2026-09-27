import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
import { Order } from '@/shared/db';
import { BarChart, Button, Card, CardBody, EmptyState, List, ListRow, ListSection, Page, Stat, StatGrid } from '@/shared/ui';
import { formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { OrderList, isLate, needsAction, useSellerOrders } from '@/features/orders';
import { useWallet } from '@/features/wallet';
import { useManagedListings } from '@/features/listings';
import { ListingThumb } from '@/features/catalog';

const DAY = 86_400_000;
const PERIOD_DAYS = 30;

/** Most urgent first: disputes, late, oldest waiting. */
const urgency = (o: Order) => (o.status === 'disputed' ? 0 : isLate(o) ? 1 : o.status === 'paid' ? 2 : 3);

/** Rows shown in "À traiter"; the full queue is in Ventes. */
const TODO_PREVIEW = 6;

export const DashboardPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const { balance } = useWallet(user.id);
  const listings = useManagedListings(user.id);

  const { daily, periodRevenue, periodCount } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const from = start.getTime() - (PERIOD_DAYS - 1) * DAY;
    const buckets = Array.from({ length: PERIOD_DAYS }, (_, i) => {
      const d = new Date(from + i * DAY);
      return {
        key: d.toISOString(),
        label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        value: 0,
      };
    });
    let revenue = 0;
    let count = 0;
    orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((o) => {
        const idx = Math.floor((new Date(o.createdAt).getTime() - from) / DAY);
        if (idx >= 0 && idx < PERIOD_DAYS) {
          buckets[idx].value += o.amounts.net;
          revenue += o.amounts.net;
          count += 1;
        }
      });
    return { daily: buckets, periodRevenue: revenue, periodCount: count };
  }, [orders]);

  const todo = orders.filter((o) => needsAction(o, 'seller')).sort((a, b) => urgency(a) - urgency(b) || a.createdAt.localeCompare(b.createdAt));
  const topListings = [...listings].filter((l) => l.sales > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <Page
      title="Vue d'ensemble"
      actions={
        <Button to={ROUTES.seller.newListing} variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
          Nouvelle offre
        </Button>
      }
    >
      <StatGrid className="mb-6">
        <Stat label={`Ventes · ${PERIOD_DAYS} jours`} value={formatXaf(periodRevenue)} hint={`${periodCount} commande${periodCount > 1 ? 's' : ''}`} />
        <Stat label="À traiter" value={todo.length} />
        <Stat label="En attente" value={formatXaf(balance.escrow + balance.frozen)} hint="Versé à la validation client" />
        <Stat label="Disponible" value={formatXaf(balance.available)} hint={<Link to={ROUTES.seller.payouts} className="hover:text-gray-900">Retirer →</Link>} emphasis />
      </StatGrid>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          <ListSection
            title="À traiter"
            count={todo.length}
            action={
              todo.length > TODO_PREVIEW && (
                <Link to={ROUTES.seller.sales} className="text-sm text-gray-500 hover:text-gray-900">
                  Tout voir
                </Link>
              )
            }
          >
            {todo.length ? (
              <OrderList
                orders={todo.slice(0, TODO_PREVIEW)}
                perspective="seller"
                counterpartyName={(o) => o.buyer.name}
                hrefFor={(o) => ROUTES.seller.sale(o.id)}
              />
            ) : (
              <EmptyState icon={CheckCircle2} title="Tout est à jour" className="rounded-2xl border border-gray-200/70" />
            )}
          </ListSection>

          <ListSection title={`Revenus · ${PERIOD_DAYS} jours`}>
            <Card>
              <CardBody className="pt-5">
                <BarChart data={daily} formatValue={formatXaf} title={`Revenus quotidiens, ${PERIOD_DAYS} derniers jours`} labelEvery={7} />
              </CardBody>
            </Card>
          </ListSection>
        </div>

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
              className="rounded-2xl border border-gray-200/70"
              title="Pas encore de vente"
              description={listings.length ? 'Partagez le lien de vos offres pour vos premières ventes.' : 'Publiez votre première offre.'}
              action={!listings.length ? <Button to={ROUTES.seller.newListing}>Créer une offre</Button> : undefined}
            />
          )}
        </ListSection>
      </div>
    </Page>
  );
};
