import React from 'react';
import { ScrollText } from 'lucide-react';
import { EmptyState, List, ListRow, Page, Panel, Spinner } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { AUDIT_LABEL, adminApi, useAdminResource } from '@/features/admin';

/** Every administrator action, newest first (append-only: kept for the AML/CFT records). */
export const AdminAuditPage: React.FC = () => {
  const { data: log, error, loading } = useAdminResource(() => adminApi.audit(), []);

  return (
    <Page title="Journal" help="Qui a fait quoi, sur quel compte, quand et pourquoi. Rien ne peut y être modifié ni effacé.">
      <Panel title="Actions" count={log?.length} flush>
        {error ? (
          <EmptyState title="Journal indisponible" description={error} />
        ) : !log || loading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : log.length ? (
          <List columns={{ main: 'Action', trailing: 'Date' }}>
            {log.map((a) => (
              <ListRow
                key={a.id}
                to={a.target_user_id ? ROUTES.admin.seller(a.target_user_id) : undefined}
                title={`${AUDIT_LABEL[a.action] ?? a.action} · ${a.target_store ?? a.target_name ?? '—'}`}
                subtitle={[a.admin_email, a.detail?.reason ?? a.detail?.note ?? a.detail?.title].filter(Boolean).join(' · ')}
                trailing={<span className="text-xs text-gray-500">{formatDateTime(a.created_at)}</span>}
              />
            ))}
          </List>
        ) : (
          <EmptyState icon={ScrollText} title="Aucune action pour l’instant" />
        )}
      </Panel>
    </Page>
  );
};
