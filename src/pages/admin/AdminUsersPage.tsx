import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, List, ListRow, Page, Panel, SearchField, Segmented, SkeletonRows, useToast } from '@/shared/ui';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { AdminUserRow, ReasonDialog, adminApi, useAdminResource } from '@/features/admin';

type Filter = 'all' | 'blocked';

/** Every account (buyers and sellers): blocking stops all use of the account. */
export const AdminUsersPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data: users, error, loading, reload } = useAdminResource(() => adminApi.users(filter, search), [filter, search]);
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
      <Panel title="Répertoire" count={users?.length} flush>
        {error ? (
          <EmptyState title="Liste indisponible" description={error} />
        ) : !users || loading ? (
          <div className="py-12 flex justify-center">
            <SkeletonRows rows={4} className="w-full" />
          </div>
        ) : users.length ? (
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
