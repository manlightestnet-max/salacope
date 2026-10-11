import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardBody, EmptyState, Page, Panel, SkeletonRows, Tabs, Textarea, useToast } from '@/shared/ui';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { topicLabel } from '@/features/support';
import { AdminTicketDetail, adminApi, useAdminResource } from '@/features/admin';
import { ADMIN_TICKET_STATUS } from './AdminSupportPage';
import salacopeMark from '@/shared/assets/salacope-mark.png';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <dt className="text-gray-500 shrink-0">{label}</dt>
    <dd className="text-gray-900 text-right min-w-0 break-words">{children}</dd>
  </div>
);

/** The person, and what Salacope already knows about the payment or the order the ticket quotes. */
const Facts: React.FC<{ detail: AdminTicketDetail }> = ({ detail: { ticket, context } }) => (
  <div className="space-y-4 min-w-0">
    <Panel title="Demandeur">
      <dl className="divide-y divide-gray-100">
        <Row label="Nom">
          <Link to={ticket.store_name ? ROUTES.admin.seller(ticket.user_id) : ROUTES.admin.users} className="hover:underline">
            {ticket.name}
          </Link>
        </Row>
        <Row label="E-mail">{ticket.email}</Row>
        {ticket.phone && <Row label="Téléphone">{ticket.phone}</Row>}
        {ticket.store_name && <Row label="Boutique">{ticket.store_name}</Row>}
        {ticket.blocked_at && (
          <Row label="Compte">
            <Badge tone="danger">Bloqué</Badge>
          </Row>
        )}
      </dl>
    </Panel>
    {ticket.reference && (
      <Panel title="Référence" description={ticket.reference}>
        {context?.attempt || context?.order ? (
          <dl className="divide-y divide-gray-100">
            {context.attempt && (
              <>
                <Row label="Paiement">
                  <span className="font-mono">{context.attempt.code}</span>
                </Row>
                <Row label="Résultat">{{ succeeded: 'Abouti', pending: 'En attente', failed: 'Refusé', expired: 'Délai dépassé', cancelled: 'Annulé' }[context.attempt.status] ?? context.attempt.status}</Row>
                <Row label="Montant">{formatXaf(context.attempt.amount)}</Row>
                <Row label="Opérateur">{context.attempt.channel}</Row>
              </>
            )}
            {context.order && (
              <>
                {context.order.held && (
                  <div className="py-3">
                    <p className="text-sm text-gray-700">L’argent de cette commande est encore bloqué : fermer le ticket ne le libère pas.</p>
                    <Button className="mt-2" size="sm" variant="secondary" to={ROUTES.admin.fund(context.order.id)}>
                      Gérer les fonds
                    </Button>
                  </div>
                )}
                <Row label="Commande">{context.order.number}</Row>
                <Row label="Offre">{context.order.title}</Row>
                <Row label="Total">{formatXaf(Number(context.order.total))}</Row>
                <Row label="État">{context.order.status}</Row>
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Aucun paiement ni commande ne correspond à cette référence.</p>
        )}
      </Panel>
    )}
  </div>
);

/** `/admin/support/:id` — the conversation, the answer box and the facts beside it. */
export const AdminTicketPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, error, set } = useAdminResource(() => adminApi.ticket(id), [id]);
  const [params, setParams] = useSearchParams();
  const view = (['conversation', 'repondre', 'demandeur'] as const).find((v) => v === params.get('vue')) ?? 'conversation';
  const goTo = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('vue', v);
    setParams(next, { replace: true });
  };
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const back = { to: ROUTES.admin.support, label: 'Support' };

  const act = async (work: () => Promise<AdminTicketDetail>, done: string) => {
    setBusy(true);
    try {
      set(await work());
      setReply('');
      toast.success(done);
      goTo('conversation');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Page title="Ticket introuvable" back={back}>
        <EmptyState title="Ce ticket n’existe pas." description={error} />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page title="Ticket" back={back}>
        <SkeletonRows rows={4} className="w-full" />
      </Page>
    );
  }

  const { ticket, messages } = data;
  const status = ADMIN_TICKET_STATUS[ticket.status];

  return (
    <Page
      title={ticket.subject}
      back={back}
      meta={
        <span className="ml-2 hidden sm:flex">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </span>
      }
      toolbar={
        <Tabs
          bare
          segmented
          value={view}
          onChange={goTo}
          items={[
            { value: 'conversation', label: 'Conversation', count: messages.length },
            { value: 'repondre', label: 'Répondre' },
            { value: 'demandeur', label: 'Demandeur' },
          ]}
        />
      }
      actions={
        ticket.status !== 'resolved' ? (
          <Button variant="secondary" disabled={busy} onClick={() => act(() => adminApi.resolveTicket(ticket.id), 'Ticket marqué comme résolu')}>
            Marquer résolu
          </Button>
        ) : undefined
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        {ticket.number} · {topicLabel(ticket.topic)} · ouvert {formatRelative(ticket.created_at)}
      </p>
      {view === 'conversation' && (
          <Card>
            <ul className="divide-y divide-gray-100">
              {messages.map((m) => (
                <li key={m.id} className="px-5 py-4 flex gap-3">
                  {m.author_id ? (
                    <Avatar name={ticket.name} />
                  ) : (
                    <span className="w-8 h-8 shrink-0 rounded-full bg-[#0b0d0c] flex items-center justify-center">
                      <img src={salacopeMark} alt="" width={128} height={110} className="w-4 h-auto" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{m.author_id ? ticket.name : 'Support Salacope'}</span>
                      <span className="text-gray-400" title={formatDateTime(m.at)}>
                        {' '}
                        · {formatRelative(m.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

      )}
      {view === 'repondre' && (
          <Card>
            <CardBody className="pt-4 space-y-3">
              <Textarea
                rows={4}
                aria-label="Votre réponse"
                placeholder={ticket.status === 'resolved' ? 'Écrire rouvre la conversation pour la personne.' : 'Votre réponse (elle la reçoit dans son ticket et par notification)…'}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" disabled={busy || !reply.trim()} onClick={() => act(() => adminApi.replyTicket(ticket.id, reply, true), 'Réponse envoyée, ticket résolu')}>
                  Répondre et résoudre
                </Button>
                <Button variant="primary" icon={<Send className="w-3.5 h-3.5" />} loading={busy} disabled={!reply.trim()} onClick={() => act(() => adminApi.replyTicket(ticket.id, reply, false), 'Réponse envoyée')}>
                  Répondre
                </Button>
              </div>
            </CardBody>
          </Card>
      )}
      {view === 'demandeur' && <Facts detail={data} />}
    </Page>
  );
};
