import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Badge, EmptyState, List, ListRow, Page, Panel, SearchField, Segmented, SkeletonRows, Stat, StatGrid } from '@/shared/ui';
import { formatDate, formatNumber, formatRelative, formatXaf } from '@/shared/lib';
import { useRememberedParam } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { AdminFundRow, FundFilter, MoreRows, adminApi, useAdminPaged } from '@/features/admin';

export const FUND_STATE: Record<AdminFundRow['status'] | 'completed' | 'cancelled', { label: string; tone: 'danger' | 'warning' | 'brand' | 'info' | 'success' | 'neutral' }> = {
  disputed: { label: 'Litige', tone: 'danger' },
  paid: { label: 'Payée, à accepter', tone: 'info' },
  in_progress: { label: 'En cours', tone: 'info' },
  delivered: { label: 'Livrée, à valider', tone: 'brand' },
  completed: { label: 'Terminée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

/** How a held order reads for the administration: a digital product is never waiting for anyone, it pays out by itself. */
export const fundState = (status: keyof typeof FUND_STATE, kind?: string) =>
  status === 'delivered' && kind === 'digital' ? { label: 'Livrée, versement automatique', tone: 'info' as const } : FUND_STATE[status];

const FILTERS: FundFilter[] = ['disputed', 'waiting', 'all'];

/** Every franc held in escrow: disputes first, then what waits for the buyer's validation. */
export const AdminFundsPage: React.FC = () => {
  const [filter, setFilter] = useRememberedParam('admin.funds', 'filtre', FILTERS, 'disputed');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { items: funds, extra: totals, error, hasMore, loadingMore, sentinelRef, next } = useAdminPaged((offset) => adminApi.funds(filter, search, offset), [filter, search]);

  return (
    <Page
      title="Fonds bloqués"
      help="Paiements gardés en séquestre sur LightPay. L’argent sort quand l’acheteur valide, ou par votre décision : payer le vendeur ou rembourser l’acheteur. Fermer un ticket ne déplace jamais l’argent."
      actions={
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            if (!v) setSearch('');
          }}
          onSubmit={() => setSearch(q.trim())}
          placeholder="N° commande, offre, nom"
          className="w-40 sm:w-64"
        />
      }
      toolbar={
        <Segmented
          label="Filtre"
          value={filter}
          options={[
            { value: 'disputed', label: totals ? `Litiges (${totals.disputed})` : 'Litiges' },
            { value: 'waiting', label: 'Avant versement' },
            { value: 'all', label: 'Tous' },
          ]}
          onChange={setFilter}
        />
      }
    >
      <div className="space-y-6">
        <StatGrid columns={3}>
          <Stat label="Total bloqué" value={totals ? formatXaf(totals.held_total) : ''} hint={totals ? `${formatNumber(totals.held)} commande${totals.held > 1 ? 's' : ''}` : undefined} />
          <Stat label="En litige" value={totals ? formatXaf(totals.disputed_total) : ''} emphasis={Boolean(totals?.disputed)} hint={totals ? `${formatNumber(totals.disputed)} commande${totals.disputed > 1 ? 's' : ''}` : undefined} />
          <Stat label="Avant versement" value={totals ? formatXaf(totals.held_total - totals.disputed_total) : ''} hint="Services : validation de l’acheteur. Produits numériques : versement automatique, rien à autoriser." />
        </StatGrid>
        <Panel title="Commandes" flush>
          {error ? (
            <EmptyState title="Liste indisponible" description={error} />
          ) : !funds ? (
            <div className="py-12 flex justify-center">
              <SkeletonRows rows={4} className="w-full" />
            </div>
          ) : funds.length ? (
            <>
            <List columns={{ main: 'Commande', meta: 'État', trailing: 'Montant' }}>
              {funds.map((f) => (
                <ListRow
                  key={f.id}
                  to={ROUTES.admin.fund(f.id)}
                  title={f.title}
                  subtitle={`${f.number} · ${f.seller_name} ← ${f.buyer_name} · ${f.status === 'disputed' ? `litige ${formatRelative(f.updated_at)}` : f.release_at ? `libération auto le ${formatDate(f.release_at)}` : formatRelative(f.created_at)}`}
                  meta={
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={fundState(f.status, f.kind).tone} dot>
                        {fundState(f.status, f.kind).label}
                      </Badge>
                      {f.open_tickets > 0 && <Badge tone="warning">Ticket ouvert</Badge>}
                    </span>
                  }
                  trailing={
                    <span className="flex flex-col items-end">
                      <span className="text-sm font-medium text-gray-900">{formatXaf(f.total)}</span>
                      <span className="text-xs text-gray-500">vendeur {formatXaf(f.net)}</span>
                    </span>
                  }
                />
              ))}
            </List>
            <MoreRows hasMore={hasMore} loading={loadingMore} sentinelRef={sentinelRef} onMore={next} />
            </>
          ) : (
            <EmptyState icon={Lock} title={filter === 'disputed' && !search ? 'Aucun litige' : 'Aucun fonds bloqué'} description={filter === 'disputed' && !search ? 'Aucune somme n’est gelée par un litige.' : undefined} />
          )}
        </Panel>
      </div>
    </Page>
  );
};
