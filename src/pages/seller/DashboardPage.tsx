import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpDown, BarChart3, ChevronRight, Eye, ListFilter, Plus, ShoppingBag, Users } from 'lucide-react';
import { BarChart, BarDatum, Button, DateRangeBar, DateRangePreset, EmptyState, List, ListRow, ListSection, Page, Panel, Popover, Select, Skeleton, StatSection, StatTile, Tabs } from '@/shared/ui';
import { usePersistedState, useRememberedParam } from '@/shared/hooks';
import { addDays, dashboardFigures, dayOf } from '@/shared/domain';
import { formatNumber, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { needsAction, useSellerOrders } from '@/features/orders';
import { useManagedListings, useSellerAnalytics } from '@/features/listings';
import { ListingThumb } from '@/features/catalog';
import { VerificationNotice } from '@/features/verification';

type View = 'resume' | 'ventes' | 'visites' | 'clients' | 'conversion';
const VIEWS: View[] = ['resume', 'ventes', 'visites', 'clients', 'conversion'];

/** "12,5 %": a share written with at most one decimal. */
const percent = (r: number | null) => (r === null ? '—' : `${(Math.round(r * 1000) / 10).toLocaleString('fr-FR')} %`);

interface Pick {
  id: string;
  from: string;
  to: string;
}

/**
 * `/dashboard`: the store's figures over a period, one view per chip (summary, sales, visits, customers, conversion). The
 * period and the offer filter are remembered for the visit; sales and customers come from the orders, visits from the server.
 */
export const DashboardPage: React.FC = () => {
  const user = useCurrentUser();
  const orders = useSellerOrders(user.id);
  const listings = useManagedListings(user.id);
  const [view, setView] = useRememberedParam<View>('seller.dashboard', 'vue', VIEWS, 'resume');
  const [pick, setPick] = usePersistedState<Pick>('seller.dashboard.period', { id: '30', from: '', to: '' });
  const [offerId, setOfferId] = usePersistedState('seller.dashboard.offer', 'all');

  const today = dayOf(new Date());
  const since = useMemo(() => orders.reduce((min, o) => (o.createdAt.slice(0, 10) < min ? o.createdAt.slice(0, 10) : min), addDays(today, -29)), [orders, today]);
  const presets = useMemo<DateRangePreset[]>(
    () => [
      { id: '7', label: '7 derniers jours', range: { from: addDays(today, -6), to: today } },
      { id: '30', label: '30 derniers jours', range: { from: addDays(today, -29), to: today } },
      { id: '90', label: '90 derniers jours', range: { from: addDays(today, -89), to: today } },
      { id: 'year', label: 'Cette année', range: { from: `${today.slice(0, 4)}-01-01`, to: today } },
      { id: 'all', label: 'Depuis le début', range: { from: since, to: today } },
    ],
    [today, since]
  );
  const range = pick.id === 'custom' && pick.from && pick.to ? { from: pick.from, to: pick.to } : (presets.find((p) => p.id === pick.id) ?? presets[1]).range;

  const offer = offerId !== 'all' && listings.some((m) => m.listing.id === offerId) ? offerId : undefined;
  const { rows, failed } = useSellerAnalytics(range);
  const f = useMemo(() => dashboardFigures(orders, rows ?? [], range, offer), [orders, rows, range.from, range.to, offer]); // eslint-disable-line react-hooks/exhaustive-deps
  const titles = useMemo(() => new Map(listings.map((m) => [m.listing.id, m.listing])), [listings]);

  const todo = orders.filter((o) => needsAction(o, 'seller')).length;
  const visits = rows === undefined && !failed ? <Skeleton className="h-8 w-16" /> : failed ? '—' : formatNumber(f.views);
  const rate = rows === undefined && !failed ? <Skeleton className="h-8 w-16" /> : failed ? '—' : percent(f.conversion);

  const bars = (value: (p: (typeof f.series)[number]) => number): BarDatum[] => f.series.map((p) => ({ key: p.key, label: p.label, value: value(p) }));
  const every = Math.max(1, Math.ceil(f.series.length / 6));
  const where = offer ? ' pour cette offre' : '';

  const filter = (
    <Popover
      className="w-[min(92vw,18rem)] p-3 space-y-3"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={offer ? 'Filtre actif : une offre' : 'Filtrer par offre'}
          className="relative w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ListFilter className="w-4 h-4" />
          {offer && <span className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-surface" />}
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="text-xs font-medium text-gray-500">Offre</p>
          <Select
            aria-label="Offre"
            value={offer ?? 'all'}
            options={[{ value: 'all', label: 'Toutes les offres' }, ...listings.map((m) => ({ value: m.listing.id, label: m.listing.title }))]}
            onChange={(v) => {
              setOfferId(v);
              close();
            }}
          />
          {offer && (
            <button type="button" onClick={() => (setOfferId('all'), close())} className="text-sm text-gray-500 hover:text-gray-900">
              Réinitialiser
            </button>
          )}
        </>
      )}
    </Popover>
  );

  const salesTiles = (
    <>
      <StatTile label="Revenu total" value={formatXaf(f.revenue)} help="Ce que vos ventes vous rapportent sur la période, commission déduite. Les commandes annulées sont exclues." />
      <StatTile label="Panier moyen" value={formatXaf(f.averageBasket)} help="Le revenu total divisé par le nombre de ventes." />
      <StatTile label="Produits vendus" value={formatNumber(f.productsSold)} help="Ventes de produits numériques (fichiers livrés au paiement) sur la période." />
      <StatTile label="Total des ventes" value={formatNumber(f.sales)} help="Toutes vos ventes de la période, produits et services, annulations exclues." />
    </>
  );
  const visitTiles = (
    <>
      <StatTile label="Nombre total de visites" value={visits} help="Fiche d’une offre ouverte, une fois par visite. Vos propres visites ne comptent pas." />
      <StatTile label="Taux de conversion" value={rate} help="Les ventes divisées par les visites sur la période." />
    </>
  );
  const customerTiles = (
    <>
      <StatTile label="Nombre total de clients" value={formatNumber(f.customers)} help="Personnes qui vous ont acheté quelque chose sur la période." />
      <StatTile label="Nouveaux clients" value={formatNumber(f.newCustomers)} help="Clients dont le premier achat dans votre boutique tombe dans la période." />
    </>
  );

  return (
    <Page
      title="Vue d'ensemble"
      help="Vos ventes, vos visites et vos clients sur la période choisie. Les ventes viennent de vos commandes, les visites sont comptées une fois par visiteur et par offre."
      actions={
        <Button to={ROUTES.seller.newListing} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Nouvelle offre
        </Button>
      }
      toolbar={
        <div className="space-y-2.5 py-2">
          <DateRangeBar
            range={range}
            activeId={pick.id}
            presets={presets}
            max={today}
            onPick={(id, r) => setPick({ id, from: r.from, to: r.to })}
            filter={filter}
          />
          <Tabs<View>
            pills
            value={view}
            onChange={setView}
            items={[
              { value: 'resume', label: 'Résumé', icon: BarChart3, tone: 'neutral' },
              { value: 'ventes', label: 'Ventes', icon: ShoppingBag, tone: 'success' },
              { value: 'visites', label: 'Visites', icon: Eye, tone: 'info' },
              { value: 'clients', label: 'Clients', icon: Users, tone: 'brand' },
              { value: 'conversion', label: 'Taux de conversion', icon: ArrowUpDown, tone: 'warning' },
            ]}
          />
        </div>
      }
    >
      {user.merchant && <VerificationNotice merchant={user.merchant} className="mb-4" />}

      {view === 'resume' && (
        <div className="space-y-4">
          {todo > 0 && (
            <Link
              to={ROUTES.seller.sales}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 bg-surface px-4 py-3 text-sm text-gray-900 transition hover:border-gray-300"
            >
              <span>
                <b className="font-semibold">{plural(todo, 'commande')}</b> à traiter
              </span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                Voir
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          )}
          <StatSection title="Ventes">{salesTiles}</StatSection>
          <StatSection title="Visites">{visitTiles}</StatSection>
          <StatSection title="Clients">{customerTiles}</StatSection>
        </div>
      )}

      {view === 'ventes' && (
        <div className="space-y-4">
          <StatSection title="Ventes">{salesTiles}</StatSection>
          <Panel title="Revenus" help="Ce que vos ventes vous rapportent, commission déduite, par jour (par mois sur une longue période).">
            <BarChart data={bars((p) => p.revenue)} formatValue={formatXaf} title={`Revenus${where}`} labelEvery={every} />
          </Panel>
        </div>
      )}

      {view === 'visites' && (
        <div className="space-y-4">
          <StatSection title="Visites">
            {visitTiles}
            <StatTile
              label="Clics sur « Acheter »"
              value={rows === undefined && !failed ? <Skeleton className="h-8 w-16" /> : failed ? '—' : formatNumber(f.clicks)}
              help="Visiteurs qui ont touché « Acheter » ou « Commander » sur la période."
            />
            <StatTile
              label="Taux de clic"
              value={rows === undefined && !failed ? <Skeleton className="h-8 w-16" /> : failed ? '—' : percent(f.clickRate)}
              help="Les clics sur « Acheter » divisés par les visites."
            />
          </StatSection>
          <Panel title="Visites" help="Fiches d’offres ouvertes, par jour (par mois sur une longue période).">
            <BarChart data={bars((p) => p.views)} formatValue={(v) => plural(v, 'visite')} title={`Visites${where}`} labelEvery={every} />
          </Panel>
        </div>
      )}

      {view === 'clients' && (
        <div className="space-y-4">
          <StatSection title="Clients">
            {customerTiles}
            <StatTile label="Clients fidèles" value={formatNumber(f.repeatCustomers)} help="Clients de la période qui ont acheté au moins deux fois chez vous." />
          </StatSection>
          <ListSection
            title="Meilleurs clients"
            action={
              <Link to={ROUTES.seller.customers} className="text-sm text-gray-500 hover:text-gray-900">
                Tous les clients
              </Link>
            }
          >
            {f.topCustomers.length ? (
              <List>
                {f.topCustomers.slice(0, 5).map((c) => (
                  <ListRow
                    key={c.id}
                    to={ROUTES.seller.customer(c.id)}
                    title={c.name}
                    subtitle={plural(c.orders, 'commande')}
                    trailing={<span className="font-medium text-gray-900">{formatXaf(c.spent)}</span>}
                  />
                ))}
              </List>
            ) : (
              <EmptyState title="Aucun client sur cette période" />
            )}
          </ListSection>
        </div>
      )}

      {view === 'conversion' && (
        <div className="space-y-4">
          <StatSection title="Taux de conversion">
            <StatTile label="Taux de conversion" value={rate} help="Les ventes divisées par les visites sur la période." />
            <StatTile label="Total des ventes" value={formatNumber(f.sales)} help="Toutes vos ventes de la période, produits et services, annulations exclues." />
          </StatSection>
          <ListSection
            title="Par offre"
            action={
              <Link to={ROUTES.seller.listings} className="text-sm text-gray-500 hover:text-gray-900">
                Mes offres
              </Link>
            }
          >
            {f.byOffer.length ? (
              <List>
                {f.byOffer.map((o) => {
                  const listing = titles.get(o.listingId);
                  return (
                    <ListRow
                      key={o.listingId}
                      to={listing ? ROUTES.seller.listing(listing.id) : undefined}
                      leading={listing && <ListingThumb src={listing.coverImage} category={listing.category} size="md" />}
                      title={listing?.title ?? 'Offre supprimée'}
                      subtitle={`${plural(o.views, 'visite')} · ${plural(o.sales, 'vente')} · ${formatXaf(o.revenue)}`}
                      trailing={<span className={clsx('font-medium', o.conversion === null ? 'text-gray-400' : 'text-gray-900')}>{percent(o.conversion)}</span>}
                    />
                  );
                })}
              </List>
            ) : (
              <EmptyState title="Pas encore de visite ni de vente sur cette période" description={listings.length ? 'Partagez le lien de vos offres.' : 'Publiez votre première offre.'} />
            )}
          </ListSection>
        </div>
      )}
    </Page>
  );
};
