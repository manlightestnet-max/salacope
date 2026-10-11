import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, EmptyState, List, ListRow, Page, Panel, SkeletonRows, Stat, StatGrid, Tabs, useToast } from '@/shared/ui';
import { formatDate, formatDateTime, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { AUDIT_LABEL, ReasonDialog, adminApi, useAdminResource } from '@/features/admin';

type View = 'profil' | 'mesures' | 'journal';
const VIEWS: View[] = ['profil', 'mesures', 'journal'];
type Action = 'block' | 'unblock' | 'signout';

/** `/admin/acs/:id` — one account: its profile, the measures that can be taken, and what was done. */
export const AdminUserPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v === params.get('vue')) ?? 'profil';
  const { data, error, reload } = useAdminResource(() => adminApi.user(id), [id]);
  const [action, setAction] = useState<Action | null>(null);
  const back = { to: ROUTES.admin.users, label: 'Comptes' };

  if (error) {
    return (
      <Page title="Compte" back={back}>
        <EmptyState title="Compte introuvable" description={error} />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page title="Compte" back={back}>
        <SkeletonRows rows={4} className="w-full" />
      </Page>
    );
  }
  const { user, log } = data;
  const done = (message: string) => {
    toast.success(message);
    reload();
  };

  return (
    <Page
      title={user.name}
      back={back}
      meta={
        user.blocked_at ? (
          <span className="ml-2 hidden sm:flex">
            <Badge tone="danger" dot>
              Bloqué
            </Badge>
          </span>
        ) : undefined
      }
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set('vue', v);
            setParams(next, { replace: true });
          }}
          items={[
            { value: 'profil', label: 'Profil' },
            { value: 'mesures', label: 'Mesures' },
            { value: 'journal', label: 'Journal', count: log.length },
          ]}
        />
      }
    >
      {view === 'profil' && (
        <Panel title={user.name} description={`${user.email}${user.phone ? ` · ${user.phone}` : ''}`}>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {user.store_name && <Badge>Vendeur · {user.store_name}</Badge>}
            {user.blocked_at && <Badge tone="danger">Bloqué</Badge>}
          </div>
          <StatGrid columns={3}>
            <Stat label="Achats" value={plural(Number(user.purchases), 'achat')} />
            <Stat label="Dépensé" value={formatXaf(Number(user.spent))} />
            <Stat label="Inscrit le" value={formatDate(user.created_at)} />
          </StatGrid>
          {user.blocked_reason && <p className="mt-4 text-sm text-gray-700">Blocage : {user.blocked_reason}.</p>}
          {user.store_name && (
            <p className="mt-4 text-sm">
              <Link to={ROUTES.admin.seller(user.id)} className="text-gray-700 hover:underline">
                Ouvrir la fiche vendeur →
              </Link>
            </p>
          )}
        </Panel>
      )}

      {view === 'mesures' && (
        <Panel title="Mesures">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAction('signout')}>
              Déconnecter
            </Button>
            {user.blocked_at ? (
              <Button onClick={() => setAction('unblock')}>Débloquer le compte</Button>
            ) : (
              <Button variant="danger" onClick={() => setAction('block')}>
                Bloquer le compte
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Déconnecter ferme toutes les sessions de la personne : elle doit se reconnecter avec son mot de passe. Bloquer l’empêche en plus de rien faire, ni acheter ni vendre.
            {user.sessions_valid_after ? ` Dernière déconnexion forcée : ${formatDateTime(user.sessions_valid_after)}.` : ''}
          </p>
        </Panel>
      )}

      {view === 'journal' && (
        <Panel title="Journal" count={log.length} flush>
          {log.length ? (
            <List>
              {log.map((a) => (
                <ListRow
                  key={a.id}
                  title={AUDIT_LABEL[a.action] ?? a.action}
                  subtitle={`${formatDateTime(a.created_at)} · ${a.admin_email}`}
                  trailing={<span className="text-xs text-gray-500 max-w-[14rem] truncate">{a.detail?.reason ?? a.detail?.note ?? ''}</span>}
                />
              ))}
            </List>
          ) : (
            <EmptyState title="Aucune action" />
          )}
        </Panel>
      )}

      <ReasonDialog
        open={action === 'signout'}
        onClose={() => setAction(null)}
        title={`Déconnecter ${user.name}`}
        description="Toutes ses sessions sont fermées tout de suite ; la personne peut se reconnecter, sauf si le compte est bloqué."
        label="Raison"
        optional
        confirmLabel="Déconnecter"
        onConfirm={async (reason) => {
          await adminApi.signOutUser(user.id, reason);
          done('Sessions fermées.');
        }}
      />
      <ReasonDialog
        open={action === 'block'}
        onClose={() => setAction(null)}
        title={`Bloquer ${user.name}`}
        description="La personne ne pourra plus ni acheter ni vendre."
        danger
        confirmLabel="Bloquer"
        onConfirm={async (reason) => {
          await adminApi.block(user.id, reason);
          done('Compte bloqué.');
        }}
      />
      <ReasonDialog
        open={action === 'unblock'}
        onClose={() => setAction(null)}
        title={`Débloquer ${user.name}`}
        description={user.blocked_reason ? `Bloqué pour : ${user.blocked_reason}` : undefined}
        label="Note"
        optional
        confirmLabel="Débloquer"
        onConfirm={async (note) => {
          await adminApi.unblock(user.id, note);
          done('Compte débloqué.');
        }}
      />
    </Page>
  );
};
