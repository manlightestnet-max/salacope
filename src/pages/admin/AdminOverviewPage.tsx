import React from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, List, ListRow, Page, Panel, Spinner, Stat, StatGrid } from '@/shared/ui';
import { formatDateTime, formatNumber, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { AUDIT_LABEL, adminApi, useAdminResource } from '@/features/admin';

/** Salacope at a glance: accounts, identity checks waiting, sales, and the latest actions. */
export const AdminOverviewPage: React.FC = () => {
  const { data, error, loading, reload } = useAdminResource(() => Promise.all([adminApi.overview(), adminApi.audit()]), []);
  const [o, log] = data ?? [];

  return (
    <Page title="Administration" help="Tableau de bord de conformité de Salacope : vendeurs, vérifications d’identité, mesures prises.">
      {error ? (
        <Panel>
          <EmptyState title="Données indisponibles" description={error} action={<Button onClick={reload}>Réessayer</Button>} />
        </Panel>
      ) : !o || loading ? (
        <div className="py-16 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <Panel title="Vendeurs et comptes">
            <StatGrid>
              <Stat
                label="À examiner"
                value={o.kyc_pending}
                emphasis={o.kyc_pending > 0}
                help="Vendeurs qui attendent la vérification de leur identité."
                hint={
                  <Link to={`${ROUTES.admin.sellers}?filtre=pending`} className="hover:text-gray-900">
                    Examiner →
                  </Link>
                }
              />
              <Stat label="Vendeurs" value={formatNumber(o.sellers)} hint={`${formatNumber(o.kyc_approved)} vérifiés`} />
              <Stat label="Comptes" value={formatNumber(o.accounts)} hint={`+ ${formatNumber(o.guests)} achats sans compte`} />
              <Stat
                label="Mesures"
                value={formatNumber(o.suspended + o.blocked)}
                hint={`${o.suspended} boutiques suspendues · ${o.blocked} comptes bloqués`}
              />
            </StatGrid>
          </Panel>
          <Panel title="Activité">
            <StatGrid>
              <Stat label="Offres en ligne" value={formatNumber(o.listings)} />
              <Stat label="Commandes" value={formatNumber(o.orders)} hint={o.disputed ? `${o.disputed} en litige` : 'Aucun litige'} />
              <Stat label="Volume" value={formatXaf(o.volume)} help="Total payé par les acheteurs, annulations exclues." />
              <Stat label="Commission Salacope" value={formatXaf(o.commission)} emphasis help="Commission retenue sur les ventes validées." />
            </StatGrid>
          </Panel>
          <Panel
            title="Dernières actions"
            flush
            actions={
              <Button size="sm" variant="ghost" to={ROUTES.admin.audit}>
                Tout le journal
              </Button>
            }
          >
            {log && log.length ? (
              <List>
                {log.slice(0, 8).map((a) => (
                  <ListRow
                    key={a.id}
                    to={a.target_user_id ? ROUTES.admin.seller(a.target_user_id) : undefined}
                    title={AUDIT_LABEL[a.action] ?? a.action}
                    subtitle={`${a.target_store ?? a.target_name ?? '—'} · ${a.admin_email}`}
                    trailing={<span className="text-xs text-gray-500">{formatDateTime(a.created_at)}</span>}
                  />
                ))}
              </List>
            ) : (
              <EmptyState title="Aucune action pour l’instant" />
            )}
          </Panel>
        </div>
      )}
    </Page>
  );
};
