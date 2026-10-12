import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { Avatar, Badge, EmptyState, List, ListRow, Page, Panel, SearchField, Segmented, SkeletonRows } from '@/shared/ui';
import { formatDate, formatXaf } from '@/shared/lib';
import { useRememberedParam } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { KycBadge, MoreRows, SellerFilter, adminApi, useAdminPaged } from '@/features/admin';

const FILTERS: { value: SellerFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'À examiner' },
  { value: 'approved', label: 'Vérifiés' },
  { value: 'unverified', label: 'Non vérifiés' },
  { value: 'suspended', label: 'Suspendus' },
];

/** Sellers, identity checks first: a tap opens the seller's own screen. */
export const AdminSellersPage: React.FC = () => {
  const [filter, setFilter] = useRememberedParam<SellerFilter>('admin.sellers', 'filtre', FILTERS.map((f) => f.value), 'all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { items: sellers, error, hasMore, loadingMore, sentinelRef, next } = useAdminPaged((offset) => adminApi.sellers(filter, search, offset), [filter, search]);

  return (
    <Page
      title="Vendeurs"
      help="Chaque vendeur doit être vérifié (pièce d’identité et selfie) avant que ses offres soient en ligne."
      actions={
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            if (!v) setSearch('');
          }}
          onSubmit={() => setSearch(q.trim())}
          placeholder="Nom, e-mail, boutique"
          className="w-40 sm:w-64"
        />
      }
      toolbar={
        <Segmented
          label="Filtre"
          value={filter}
          options={FILTERS}
          onChange={setFilter}
        />
      }
    >
        <Panel title="Répertoire" flush className="min-w-0">
          {error ? (
            <EmptyState title="Liste indisponible" description={error} />
          ) : !sellers ? (
            <div className="py-12 flex justify-center">
              <SkeletonRows rows={4} className="w-full" />
            </div>
          ) : sellers.length ? (
            <>
            <List columns={{ main: 'Vendeur', meta: 'Statut', trailing: 'Volume' }}>
              {sellers.map((s) => (
                <ListRow
                  key={s.id}
                  to={ROUTES.admin.seller(s.id)}
                  leading={<Avatar name={s.store_name} />}
                  title={s.store_name}
                  subtitle={`${s.name} · ${s.kyc_submitted_at ? `documents du ${formatDate(s.kyc_submitted_at)}` : `depuis le ${formatDate(s.activated_at)}`}`}
                  meta={
                    <span className="flex flex-wrap gap-1">
                      <KycBadge status={s.kyc_status} />
                      {(s.suspended_at || s.blocked_at) && <Badge tone="danger">{s.blocked_at ? 'Bloqué' : 'Suspendu'}</Badge>}
                    </span>
                  }
                  trailing={<span className="text-sm font-medium text-gray-900">{formatXaf(s.volume)}</span>}
                />
              ))}
            </List>
            <MoreRows hasMore={hasMore} loading={loadingMore} sentinelRef={sentinelRef} onMore={next} />
            </>
          ) : (
            <EmptyState icon={Store} title="Aucun vendeur" />
          )}
        </Panel>
    </Page>
  );
};
