import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { Avatar, Badge, EmptyState, List, ListRow, Page, Panel, SearchField, Segmented, SkeletonRows } from '@/shared/ui';
import { formatRelative } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { topicLabel } from '@/features/support';
import { AdminTicketRow, MoreRows, TicketFilter, adminApi, useAdminPaged } from '@/features/admin';

export const ADMIN_TICKET_STATUS: Record<AdminTicketRow['status'], { label: string; tone: 'warning' | 'brand' | 'neutral' }> = {
  open: { label: 'À traiter', tone: 'warning' },
  answered: { label: 'Répondu', tone: 'brand' },
  resolved: { label: 'Résolu', tone: 'neutral' },
};

const FILTERS: TicketFilter[] = ['open', 'answered', 'resolved', 'all'];

/** Support inbox: what is waiting for Salacope first, oldest request at the top. */
export const AdminSupportPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f === params.get('filtre')) ?? 'open';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { items: tickets, extra: counts, error, hasMore, loadingMore, sentinelRef, next } = useAdminPaged((offset) => adminApi.tickets(filter, search, offset), [filter, search]);
  const loading = !tickets;

  return (
    <Page
      title="Support"
      help="Demandes envoyées par les acheteurs et les vendeurs. Votre réponse leur arrive dans le ticket et en notification ; la plus ancienne demande à traiter est en haut."
      actions={
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            if (!v) setSearch('');
          }}
          onSubmit={() => setSearch(q.trim())}
          placeholder="Nom, e-mail, n° ou référence"
          className="w-40 sm:w-64"
        />
      }
      toolbar={
        <Segmented
          label="Filtre"
          value={filter}
          options={[
            { value: 'open', label: counts ? `À traiter (${counts.open})` : 'À traiter' },
            { value: 'answered', label: counts ? `Répondus (${counts.answered})` : 'Répondus' },
            { value: 'resolved', label: 'Résolus' },
            { value: 'all', label: 'Tous' },
          ]}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set('filtre', v);
            setParams(next, { replace: true });
          }}
        />
      }
    >
      <Panel title="Demandes" flush>
        {error ? (
          <EmptyState title="Liste indisponible" description={error} />
        ) : !tickets ? (
          <div className="py-12 flex justify-center">
            <SkeletonRows rows={4} className="w-full" />
          </div>
        ) : tickets.length ? (
          <>
          <List columns={{ main: 'Demande', meta: 'Statut', trailing: 'Dernière activité' }}>
            {tickets.map((t) => (
              <ListRow
                key={t.id}
                to={ROUTES.admin.ticket(t.id)}
                leading={<Avatar name={t.name} />}
                title={t.subject}
                subtitle={`${t.number} · ${t.name} · ${topicLabel(t.topic)}${t.reference ? ` · ${t.reference}` : ''}`}
                meta={<Badge tone={ADMIN_TICKET_STATUS[t.status].tone} dot>{ADMIN_TICKET_STATUS[t.status].label}</Badge>}
                trailing={<span className="text-xs text-gray-500">{formatRelative(t.updated_at)}</span>}
              />
            ))}
          </List>
          <MoreRows hasMore={hasMore} loading={loadingMore} sentinelRef={sentinelRef} onMore={next} />
          </>
        ) : (
          <EmptyState icon={LifeBuoy} title={filter === 'open' && !search ? 'Rien à traiter' : 'Aucune demande'} description={loading ? undefined : filter === 'open' && !search ? 'Toutes les demandes ont reçu une réponse.' : undefined} />
        )}
      </Panel>
    </Page>
  );
};
