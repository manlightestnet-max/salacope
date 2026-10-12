import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Button, EmptyState, List, ListRow, Page, Panel, Segmented, SkeletonRows, Stat, StatGrid, Tabs } from '@/shared/ui';
import { formatDateTime, formatNumber, formatXaf } from '@/shared/lib';
import { useRememberedParam } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { AUDIT_LABEL, MoreRows, adminApi, useAdminPaged, useAdminResource } from '@/features/admin';


const MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};
const KIND_LABEL: Record<string, string> = { digital: 'Produits numériques', service: 'Services' };

type Period = 'month' | 'pick' | 'all';

/** What Salacope earns: the commission on closed sales, for this month, a chosen month or since the start. */
const ProfitPanel: React.FC = () => {
  const [mode, setMode] = useState<Period>('month');
  const [picked, setPicked] = useState(() => new Date().toISOString().slice(0, 7));
  const period = mode === 'all' ? 'all' : mode === 'pick' ? picked : 'month';
  const { data: p, error } = useAdminResource(() => adminApi.profit(period), [period]);

  return (
    <Panel
      title="Bénéfice par période"
      description="La commission gardée sur chaque vente réglée au vendeur, comptée le jour où la vente est clôturée. Un remboursement ne rapporte rien."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'pick' && (
            <input
              type="month"
              aria-label="Mois"
              value={picked}
              max={new Date().toISOString().slice(0, 7)}
              onChange={(e) => e.target.value && setPicked(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-surface px-2 text-sm text-gray-900"
            />
          )}
          <Segmented
            label="Période"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'month', label: 'Ce mois-ci' },
              { value: 'pick', label: 'Mois précis' },
              { value: 'all', label: 'Depuis le début' },
            ]}
          />
        </div>
      }
    >
      {error ? (
        <EmptyState title="Bénéfices indisponibles" description={error} />
      ) : !p ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="space-y-5">
          <StatGrid columns={3}>
            <Stat label="Bénéfice plateforme" value={formatXaf(p.profit)} emphasis hint={`${formatNumber(p.sales)} vente${p.sales > 1 ? 's' : ''} clôturée${p.sales > 1 ? 's' : ''}`} />
            <Stat label="Volume de transactions" value={formatXaf(p.volume)} hint={`${formatNumber(p.payments)} paiement${p.payments > 1 ? 's' : ''} reçu${p.payments > 1 ? 's' : ''}`} />
            <Stat
              label="Bénéfice en attente"
              value={formatXaf(p.pending_profit)}
              help="Commission sur l’argent encore bloqué : elle devient votre bénéfice quand la vente est validée."
              hint={`${formatNumber(p.pending_orders)} commande${p.pending_orders > 1 ? 's' : ''} bloquée${p.pending_orders > 1 ? 's' : ''}`}
            />
          </StatGrid>

          {p.kinds.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {p.kinds.map((k) => (
                <div key={k.kind} className="rounded-xl border border-gray-200/70 px-4 py-3">
                  <dt className="text-xs text-gray-500">{KIND_LABEL[k.kind] ?? k.kind}</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{formatXaf(k.profit)}</dd>
                  <dd className="text-xs text-gray-500">
                    {formatNumber(k.sales)} vente{k.sales > 1 ? 's' : ''} · {formatXaf(k.sales_total)} encaissés
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div>
            <p className="mb-2 text-xs text-gray-500">Bénéfice des 12 derniers mois</p>
            <BarChart
              title="Bénéfice par mois"
              data={p.months.map((m) => ({ key: m.month, label: monthLabel(m.month), value: m.profit }))}
              formatValue={formatXaf}
              labelEvery={2}
            />
          </div>
        </div>
      )}
    </Panel>
  );
};

/** Salacope at a glance: accounts, identity checks waiting, sales, and the latest actions. */
/** Latest administrator actions, page by page. */
const Activity: React.FC = () => {
  const { items: log, error, hasMore, loadingMore, sentinelRef, next } = useAdminPaged((offset) => adminApi.audit(offset), []);
  return (
    <Panel
      title="Dernières actions"
      flush
      actions={
        <Button size="sm" variant="ghost" to={ROUTES.admin.audit}>
          Tout le journal
        </Button>
      }
    >
      {error ? (
        <EmptyState title="Journal indisponible" description={error} />
      ) : !log ? (
        <SkeletonRows rows={4} />
      ) : log.length ? (
        <>
          <List>
            {log.map((a) => (
              <ListRow
                key={a.id}
                to={a.target_user_id ? ROUTES.admin.seller(a.target_user_id) : undefined}
                title={AUDIT_LABEL[a.action] ?? a.action}
                subtitle={`${a.target_store ?? a.target_name ?? '—'} · ${a.admin_email}`}
                trailing={<span className="text-xs text-gray-500">{formatDateTime(a.created_at)}</span>}
              />
            ))}
          </List>
          <MoreRows hasMore={hasMore} loading={loadingMore} sentinelRef={sentinelRef} onMore={next} />
        </>
      ) : (
        <EmptyState title="Aucune action pour l’instant" />
      )}
    </Panel>
  );
};

type View = 'benefices' | 'traiter' | 'plateforme' | 'activite';
const VIEWS: View[] = ['benefices', 'traiter', 'plateforme', 'activite'];

export const AdminOverviewPage: React.FC = () => {
  const [view, setView] = useRememberedParam('admin.overview', 'vue', VIEWS, 'benefices');
  const { data, error, loading, reload } = useAdminResource(() => adminApi.overview(), []);
  const o = data;

  return (
    <Page
      title="Aperçu"
      help="Tableau de bord de Salacope : ce que la plateforme gagne, ce qui attend une décision, et l’état des comptes."
      toolbar={
        <Tabs
          bare
          segmented
          value={view}
          onChange={setView}
          items={[
            { value: 'benefices', label: 'Bénéfices' },
            { value: 'traiter', label: 'À traiter', count: o ? o.kyc_pending + o.tickets_open + o.disputed : undefined },
            { value: 'plateforme', label: 'Plateforme' },
            { value: 'activite', label: 'Activité récente' },
          ]}
        />
      }
    >
      {error ? (
        <Panel>
          <EmptyState title="Données indisponibles" description={error} action={<Button onClick={reload}>Réessayer</Button>} />
        </Panel>
      ) : !o || loading ? (
        <div className="py-16 flex justify-center">
          <SkeletonRows rows={4} className="w-full" />
        </div>
      ) : view === 'benefices' ? (
        <ProfitPanel />
      ) : view === 'traiter' ? (
        <Panel title="À traiter">
          <StatGrid columns={2}>
            <Stat
              label="Identités à examiner"
              value={o.kyc_pending}
              emphasis={o.kyc_pending > 0}
              help="Vendeurs qui attendent la vérification de leur identité."
              hint={
                <Link to={`${ROUTES.admin.sellers}?filtre=pending`} className="hover:text-gray-900">
                  Examiner →
                </Link>
              }
            />
            <Stat
              label="Support"
              value={o.tickets_open}
              emphasis={o.tickets_open > 0}
              help="Demandes qui attendent une réponse de Salacope."
              hint={
                <Link to={`${ROUTES.admin.support}?filtre=open`} className="hover:text-gray-900">
                  Répondre →
                </Link>
              }
            />
            <Stat
              label="Litiges"
              value={formatNumber(o.disputed)}
              emphasis={o.disputed > 0}
              help="Commandes dont l’argent est gelé en attendant votre décision."
              hint={
                <Link to={ROUTES.admin.funds} className="hover:text-gray-900">
                  Trancher →
                </Link>
              }
            />
            <Stat
              label="Fonds bloqués"
              value={formatXaf(o.held_total)}
              help="Paiements gardés en séquestre sur LightPay jusqu’à la validation de la commande."
              hint={`${formatNumber(o.held)} commande${o.held > 1 ? 's' : ''}`}
            />
          </StatGrid>
        </Panel>
      ) : view === 'plateforme' ? (
        <Panel title="Plateforme">
          <StatGrid>
            <Stat label="Vendeurs" value={formatNumber(o.sellers)} hint={`${formatNumber(o.kyc_approved)} vérifiés`} />
            <Stat label="Comptes" value={formatNumber(o.accounts)} hint={`+ ${formatNumber(o.guests)} achats sans compte`} />
            <Stat label="Offres en ligne" value={formatNumber(o.listings)} />
            <Stat label="Commandes" value={formatNumber(o.orders)} hint={o.disputed ? `${o.disputed} en litige` : 'Aucun litige'} />
            <Stat label="Volume de transactions" value={formatXaf(o.volume)} help="Total payé par les acheteurs depuis le début, annulations exclues." />
            <Stat label="Bénéfice plateforme" value={formatXaf(o.commission)} emphasis help="Commission retenue sur toutes les ventes réglées au vendeur, depuis le début." />
            <Stat label="Mesures" value={formatNumber(o.suspended + o.blocked)} hint={`${o.suspended} boutiques suspendues · ${o.blocked} comptes bloqués`} />
          </StatGrid>
        </Panel>
      ) : (
        <Activity />
      )}
    </Page>
  );
};
