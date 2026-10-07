import React, { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Avatar, Badge, EmptyState, List, ListRow, Page, Panel, SearchField, Segmented, SkeletonRows } from '@/shared/ui';
import { formatDate, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { KycBadge, SellerDetail, SellerFilter, adminApi, useAdminResource } from '@/features/admin';

const FILTERS: { value: SellerFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'À examiner' },
  { value: 'approved', label: 'Vérifiés' },
  { value: 'unverified', label: 'Non vérifiés' },
  { value: 'suspended', label: 'Suspendus' },
];

/** Sellers (identity checks first) and, beside them, the selected seller with every action. */
export const AdminSellersPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f.value === params.get('filtre'))?.value ?? 'all';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data: sellers, error, loading, reload } = useAdminResource(() => adminApi.sellers(filter, search), [filter, search]);
  const detailRef = useRef<HTMLDivElement>(null);

  const select = (sellerId: string) => {
    navigate({ pathname: ROUTES.admin.seller(sellerId), search: params.toString() });
    // Phones: the detail sits under the list.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

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
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set('filtre', v);
            setParams(next, { replace: true });
          }}
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] gap-6 items-start">
        <Panel title="Répertoire" count={sellers?.length} flush className="min-w-0">
          {error ? (
            <EmptyState title="Liste indisponible" description={error} />
          ) : !sellers || loading ? (
            <div className="py-12 flex justify-center">
              <SkeletonRows rows={4} className="w-full" />
            </div>
          ) : sellers.length ? (
            <List columns={{ main: 'Vendeur', meta: 'Statut', trailing: 'Volume' }}>
              {sellers.map((s) => (
                <ListRow
                  key={s.id}
                  onClick={() => select(s.id)}
                  selected={s.id === id}
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
          ) : (
            <EmptyState icon={Store} title="Aucun vendeur" />
          )}
        </Panel>
        <div ref={detailRef} className="scroll-mt-4 min-w-0">
          {id ? (
            <SellerDetail key={id} id={id} onChanged={reload} />
          ) : (
            <Panel>
              <EmptyState title="Choisissez un vendeur" description="Son identité, sa boutique, ses offres et les mesures possibles s’affichent ici." />
            </Panel>
          )}
        </div>
      </div>
    </Page>
  );
};
