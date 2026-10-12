import React, { useState } from 'react';
import clsx from 'clsx';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, Scale } from 'lucide-react';
import { Button, EmptyState, MoreRows, Page, SearchField, SkeletonRows, Tabs } from '@/shared/ui';
import { usePagedList } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { AdminDisputeFilter, DisputeList, DisputeRoom, disputesApi, useDisputeRoom } from '@/features/disputes';
import { DisputeActions } from '@/features/admin';

const FILTERS: AdminDisputeFilter[] = ['waiting', 'open', 'resolved', 'all'];

/**
 * `/admin/litiges[/:id]`: the dispute rooms, in the style of Messages. The room has the shortcuts of the administration
 * (money, accounts, sign out, block, hide the offer) and writes as Salacope.
 */
export const AdminDisputesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f === params.get('filtre')) ?? 'waiting';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = usePagedList((offset) => disputesApi.adminList(filter, search, offset), [filter, search]);
  const room = useDisputeRoom(id, disputesApi.adminDetail);
  const counts = list.extra;
  const keep = params.toString() ? `?${params.toString()}` : '';

  return (
    <Page
      fill
      title="Litiges"
      back={id ? { to: `${ROUTES.admin.disputes}${keep}`, label: 'Litiges' } : undefined}
      help="Chaque litige a sa salle : l’acheteur, le vendeur et vous. Écrivez au nom de Salacope, demandez des preuves, puis décidez dans « Fonds : payer ou rembourser »."
      actions={
        <>
          <Button size="sm" variant="secondary" to={ROUTES.admin.newDispute} icon={<Plus className="w-3.5 h-3.5" />}>
            <span className="hidden sm:inline">Ouvrir un litige</span>
            <span className="sm:hidden">Ouvrir</span>
          </Button>
          <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            if (!v) setSearch('');
          }}
          onSubmit={() => setSearch(q.trim())}
          placeholder="Litige, commande, nom"
          className="w-40 sm:w-64"
          />
        </>
      }
      toolbar={
        <Tabs
          bare
          segmented
          value={filter}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set('filtre', v);
            setParams(next, { replace: true });
          }}
          items={[
            { value: 'waiting', label: 'Réponse attendue', count: counts?.waiting },
            { value: 'open', label: 'Ouverts', count: counts?.open },
            { value: 'resolved', label: 'Clos' },
            { value: 'all', label: 'Tous' },
          ]}
        />
      }
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4">
        <section className={clsx('min-h-0 overflow-y-auto rounded-2xl border border-gray-200/70 bg-surface', id && 'hidden lg:block')}>
          {list.error && !list.items ? (
            <EmptyState title="Litiges indisponibles" description={list.error} />
          ) : !list.items ? (
            <div className="p-4">
              <SkeletonRows rows={4} />
            </div>
          ) : list.items.length === 0 ? (
            <EmptyState icon={Scale} title={filter === 'waiting' && !search ? 'Rien en attente' : 'Aucun litige'} description={filter === 'waiting' && !search ? 'Toutes les salles ont reçu une réponse de Salacope.' : undefined} />
          ) : (
            <>
              <DisputeList
                selectedId={id}
                hrefFor={(d) => `${ROUTES.admin.dispute(d)}${keep}`}
                items={list.items.map((d) => ({
                  id: d.id,
                  label: d.label,
                  name: d.kind === 'conduct' ? `Conduite : ${d.subject_name}` : `${d.seller_name} ↔ ${d.buyer_name}`,
                  subtitle: d.last_body ?? d.title,
                  at: d.updated_at,
                  open: d.status === 'open',
                  flag: d.status === 'open' && !d.last_from_salacope ? 'À répondre' : undefined,
                }))}
              />
              <MoreRows hasMore={list.hasMore} loading={list.loadingMore} sentinelRef={list.sentinelRef} onMore={list.next} />
            </>
          )}
        </section>
        <div className={clsx('min-h-0', !id && 'hidden lg:block')}>
          {id ? (
            <DisputeRoom
              detail={room.detail}
              error={room.error}
              viewerId={null}
              onSend={async (body, files) => {
                room.set(await disputesApi.adminSend(id, body, files));
              }}
              actions={room.detail && <DisputeActions detail={room.detail} onChange={room.set} />}
            />
          ) : (
            <div className="h-full rounded-2xl border border-dashed border-gray-200 flex items-center justify-center">
              <p className="text-sm text-gray-500">Choisissez un litige.</p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};
