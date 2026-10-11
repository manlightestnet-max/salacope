import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, List, ListRow, Page, Panel, SearchField, Segmented, SkeletonRows, useToast } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { AdminUserRow, MoreRows, ReasonDialog, adminApi, useAdminPaged } from '@/features/admin';

type Filter = 'all' | 'blocked';

/** Every account (buyers and sellers): blocking stops all use of the account. */
export const AdminUsersPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [search, setSearch] = useState(params.get('q') ?? '');
  // The top bar search lands here with the words in the address, also when already on this page.
  const fromBar = params.get('q') ?? '';
  useEffect(() => {
    setQ(fromBar);
    setSearch(fromBar);
  }, [fromBar]);
  const { items: users, error, reload, hasMore, loadingMore, sentinelRef, next } = useAdminPaged((offset) => adminApi.users(filter, search, offset), [filter, search]);
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const toast = useToast();

  return (
    <Page
      title="Comptes"
      help="Acheteurs et vendeurs ayant un compte. Un compte bloqué ne peut plus rien faire sur Salacope ; la raison est gardée dans le journal."
      actions={
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            if (!v) setSearch('');
          }}
          onSubmit={() => setSearch(q.trim())}
          placeholder="Nom, e-mail, téléphone"
          className="w-40 sm:w-64"
        />
      }
      toolbar={
        <Segmented
          label="Filtre"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'blocked', label: 'Bloqués' },
          ]}
        />
      }
    >
      <Panel title="Répertoire" flush>
        {error ? (
          <EmptyState title="Liste indisponible" description={error} />
        ) : !users ? (
          <div className="py-12 flex justify-center">
            <SkeletonRows rows={4} className="w-full" />
          </div>
        ) : users.length ? (
          <>
          <List columns={{ main: 'Compte', meta: 'Statut', trailing: 'Achats' }}>
            {users.map((u) => (
              <ListRow
                key={u.id}
                to={u.store_name ? ROUTES.admin.seller(u.id) : undefined}
                leading={<Avatar name={u.name} />}
                title={u.name}
                subtitle={`${u.email}${u.phone ? ` · ${u.phone}` : ''} · inscrit le ${formatDate(u.created_at)}`}
                meta={
                  <span className="flex flex-wrap gap-1">
                    {u.store_name && <Badge>Vendeur</Badge>}
                    {u.blocked_at && <Badge tone="danger">Bloqué</Badge>}
                  </span>
                }
                trailing={
                  <span className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">{formatXaf(u.spent)}</span>
                    <span className="text-xs text-gray-500">{plural(u.purchases, 'achat')}</span>
                  </span>
                }
                actions={
                  <Button size="sm" variant={u.blocked_at ? 'secondary' : 'ghost'} onClick={() => setTarget(u)}>
                    {u.blocked_at ? 'Débloquer' : 'Bloquer'}
                  </Button>
                }
              />
            ))}
          </List>
          <MoreRows hasMore={hasMore} loading={loadingMore} sentinelRef={sentinelRef} onMore={next} />
          </>
        ) : (
          <EmptyState icon={Users} title="Aucun compte" />
        )}
      </Panel>

      <ReasonDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.blocked_at ? `Débloquer ${target?.name}` : `Bloquer ${target?.name}`}
        description={target?.blocked_at ? `Bloqué pour : ${target.blocked_reason}` : 'La personne ne pourra plus ni acheter ni vendre.'}
        label={target?.blocked_at ? 'Note' : 'Raison'}
        optional={Boolean(target?.blocked_at)}
        danger={!target?.blocked_at}
        confirmLabel={target?.blocked_at ? 'Débloquer' : 'Bloquer'}
        onConfirm={async (reason) => {
          if (target!.blocked_at) await adminApi.unblock(target!.id, reason);
          else await adminApi.block(target!.id, reason);
          toast.success(target!.blocked_at ? 'Compte débloqué.' : 'Compte bloqué.');
          reload();
        }}
      />
    </Page>
  );
};
