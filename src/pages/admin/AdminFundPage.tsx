import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { EVENT_LABEL } from '@/features/orders';
import { ReasonDialog, adminApi, useAdminResource } from '@/features/admin';
import { FUND_STATE } from './AdminFundsPage';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <dt className="text-gray-500 shrink-0">{label}</dt>
    <dd className="text-gray-900 text-right min-w-0 break-words">{children}</dd>
  </div>
);

const TICKET_TONE = { open: 'warning', answered: 'brand', resolved: 'neutral' } as const;

/** `/admin/fonds/:id` — what is blocked on one order, the evidence, and the two ways to end it. */
export const AdminFundPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, error, set } = useAdminResource(() => adminApi.fund(id), [id]);
  const [deciding, setDeciding] = useState<'release' | 'refund' | null>(null);
  const back = { to: ROUTES.admin.funds, label: 'Fonds bloqués' };

  if (error) {
    return (
      <Page title="Commande introuvable" back={back}>
        <EmptyState title="Cette commande n’existe pas." description={error} />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page title="Fonds bloqués" back={back}>
        <SkeletonRows rows={4} className="w-full" />
      </Page>
    );
  }

  const { order, events, messages, tickets } = data;
  const state = FUND_STATE[order.status];
  const disputed = order.status === 'disputed';

  return (
    <Page
      title={order.item.title}
      back={back}
      meta={
        <span className="ml-2 hidden sm:flex">
          <Badge tone={state.tone} dot>
            {state.label}
          </Badge>
        </span>
      }
      actions={
        order.held ? (
          <>
            <Button variant="secondary" onClick={() => setDeciding('refund')}>
              Rembourser l’acheteur
            </Button>
            <Button variant="primary" onClick={() => setDeciding('release')}>
              Payer le vendeur
            </Button>
          </>
        ) : undefined
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        {order.number} · commande passée {formatRelative(order.created_at)}
      </p>

      {!order.held && (
        <p className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {order.status === 'completed' ? 'Les fonds ont été versés au vendeur.' : order.status === 'cancelled' ? 'L’acheteur a été remboursé.' : 'Ces fonds ne sont plus bloqués.'}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <Panel title="Historique">
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-gray-900">{EVENT_LABEL[e.type as keyof typeof EVENT_LABEL] ?? e.type}</span>
                    <span className="text-xs text-gray-500 shrink-0">{formatDateTime(e.at)}</span>
                  </div>
                  {e.note && <p className="mt-0.5 text-gray-600 whitespace-pre-line break-words">{e.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Conversation" description="Les derniers messages entre l’acheteur et le vendeur, pour trancher.">
            {messages.length ? (
              <Card>
                <ul className="divide-y divide-gray-100">
                  {messages.map((m) => (
                    <li key={m.id} className="px-4 py-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-gray-900">
                          {m.name} <span className="font-normal text-gray-500">· {m.author_id === order.seller_id ? 'vendeur' : 'acheteur'}</span>
                        </span>
                        <span className="text-xs text-gray-500 shrink-0" title={formatDateTime(m.at)}>
                          {formatRelative(m.at)}
                        </span>
                      </div>
                      {m.body && <p className="mt-0.5 text-gray-700 whitespace-pre-line break-words">{m.body}</p>}
                      {m.files > 0 && <p className="mt-0.5 text-xs text-gray-500">{m.files} fichier{m.files > 1 ? 's' : ''} joint{m.files > 1 ? 's' : ''}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <p className="text-sm text-gray-500">Aucun message.</p>
            )}
            {order.delivery_note && (
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-medium text-gray-900">Note de livraison : </span>
                {order.delivery_note}
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-4 min-w-0">
          <Panel title="Montants">
            <dl className="divide-y divide-gray-100">
              <Row label="Payé par l’acheteur">{formatXaf(order.amounts.total)}</Row>
              <Row label="Commission Salacope">{formatXaf(order.amounts.fee)}</Row>
              <Row label="Pour le vendeur">{formatXaf(order.amounts.net)}</Row>
              {order.release_at && !disputed && <Row label="Libération auto">{formatDateTime(order.release_at)}</Row>}
            </dl>
          </Panel>
          <Panel title="Parties">
            <dl className="divide-y divide-gray-100">
              <Row label="Vendeur">
                <Link to={ROUTES.admin.seller(order.seller_id)} className="hover:underline">
                  {order.store_name ?? order.seller_name}
                </Link>
              </Row>
              <Row label="Acheteur">{order.buyer_name}</Row>
              <Row label="E-mail acheteur">{order.buyer_email}</Row>
              {order.via && <Row label="Payé par">{order.via === 'wallet' ? 'Wallet LightPay' : 'Mobile Money'}</Row>}
            </dl>
          </Panel>
          {tickets.length > 0 && (
            <Panel title="Tickets liés" flush>
              <ul className="divide-y divide-gray-100">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link to={ROUTES.admin.ticket(t.id)} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-gray-50">
                      <span className="min-w-0 truncate text-gray-900">
                        {t.number} · {t.subject}
                      </span>
                      <Badge tone={TICKET_TONE[t.status]} dot>
                        {t.status === 'open' ? 'À traiter' : t.status === 'answered' ? 'Répondu' : 'Résolu'}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <ReasonDialog
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        title={deciding === 'release' ? 'Payer le vendeur' : 'Rembourser l’acheteur'}
        description={
          deciding === 'release'
            ? `${order.store_name ?? order.seller_name} reçoit ${formatXaf(order.amounts.net)} (commission de ${formatXaf(order.amounts.fee)} retenue). La commande est terminée${disputed ? ' et le litige est clos' : ''}.`
            : `${order.buyer_name} est remboursé de ${formatXaf(order.amounts.total)}. La commande est annulée${disputed ? ' et le litige est clos' : ''}.`
        }
        label="Raison (visible par les deux parties)"
        danger={deciding === 'refund'}
        confirmLabel={deciding === 'release' ? 'Payer le vendeur' : 'Rembourser'}
        onConfirm={async (reason) => {
          set(deciding === 'release' ? await adminApi.releaseFunds(order.id, reason) : await adminApi.refundFunds(order.id, reason));
          toast.success(deciding === 'release' ? 'Fonds versés au vendeur.' : 'Acheteur remboursé.');
        }}
      />
    </Page>
  );
};
