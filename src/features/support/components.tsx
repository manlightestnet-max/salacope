import React, { useState } from 'react';
import { CreditCard, LifeBuoy, Send } from 'lucide-react';
import { PaymentAttempt, Ticket, TicketTopic, User } from '@/shared/db';
import { Avatar, Badge, Button, Card, CardBody, Field, Input, List, ListRow, OperatorLogo, Select, Textarea } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDateTime, formatRelative, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { attemptOutcome } from '@/features/checkout';
import { openTicket, replyToTicket, resolveTicket } from './api';
import { useSupportReferences } from './hooks';
import { TICKET_STATUS, TICKET_TOPICS, topicLabel } from './model';
import salacopeMark from '@/shared/assets/salacope-mark.png';

export const TicketStatusBadge: React.FC<{ ticket: Pick<Ticket, 'status'> }> = ({ ticket }) => (
  <Badge tone={TICKET_STATUS[ticket.status].tone} dot>
    {TICKET_STATUS[ticket.status].label}
  </Badge>
);

export const TicketList: React.FC<{ tickets: Ticket[] }> = ({ tickets }) => (
  <List>
    {tickets.map((t) => (
      <ListRow
        key={t.id}
        to={ROUTES.account.ticket(t.id)}
        leading={
          <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            <LifeBuoy className="w-4 h-4" />
          </span>
        }
        title={t.subject}
        subtitle={`${t.number} · ${topicLabel(t.topic)}${t.reference ? ` · ${t.reference}` : ''} · ${formatRelative(t.updatedAt)}`}
        meta={<TicketStatusBadge ticket={t} />}
      />
    ))}
  </List>
);

const ATTEMPT_TONE = { succeeded: 'success', pending: 'info', failed: 'danger', expired: 'warning', cancelled: 'neutral' } as const;

/** Latest Mobile Money attempts with their code; any of them can become a ticket. */
export const PaymentAttemptList: React.FC<{ attempts: PaymentAttempt[]; titles: Map<string, string> }> = ({ attempts, titles }) => (
  <List>
    {attempts.map((a) => (
      <ListRow
        key={a.id}
        leading={
          <OperatorLogo channel={a.channel} className="w-9 h-9 rounded-xl" />
        }
        title={<span className="font-mono tracking-wide">{a.code}</span>}
        subtitle={`${titles.get(a.listingId) ?? 'Offre supprimée'} · ${formatRelative(a.createdAt)}`}
        meta={<Badge tone={ATTEMPT_TONE[a.status]}>{attemptOutcome(a)}</Badge>}
        trailing={<span className="font-medium text-gray-900">{formatXaf(a.amount)}</span>}
        actions={
          <Button size="sm" variant="ghost" to={`${ROUTES.account.newTicket}?ref=${a.code}&sujet=payment`}>
            Signaler
          </Button>
        }
      />
    ))}
  </List>
);

/** New ticket, optionally about a payment code or an order number. */
export const TicketForm: React.FC<{
  userId: string;
  initialReference?: string;
  initialTopic?: TicketTopic;
  onOpened: (ticket: Ticket) => void;
}> = ({ userId, initialReference = '', initialTopic, onOpened }) => {
  const references = useSupportReferences(userId);
  const [topic, setTopic] = useState<TicketTopic>(initialTopic ?? (initialReference.startsWith('TX-') ? 'payment' : 'order'));
  const [reference, setReference] = useState(initialReference);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const suggestions = [...references.attempts.map((a) => a.code), ...references.orders.map((o) => o.number)];

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setError(undefined);
        setBusy(true);
        try {
          onOpened(await openTicket({ topic, subject, body, reference }));
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Sujet">
          {(id) => <Select id={id} value={topic} options={TICKET_TOPICS} onChange={setTopic} className="w-full" />}
        </Field>
        <Field label="Référence" optional hint="Code TX-… d’un paiement ou n° SC-… d’une commande.">
          {(id) => (
            <>
              <Input
                id={id}
                list="support-references"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TX-XXXX-XXXX"
                className="font-mono uppercase"
                leading={<CreditCard className="w-4 h-4" />}
              />
              <datalist id="support-references">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>
      <Field label="Objet">
        {(id) => <Input id={id} required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. : débité mais pas de commande" />}
      </Field>
      <Field label="Message">
        {(id) => (
          <Textarea
            id={id}
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ce qui s’est passé, et ce que vous attendez de nous."
          />
        )}
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={busy}>
          Envoyer au support
        </Button>
      </div>
    </form>
  );
};

/** Ticket conversation with Salacope support, and the reply box. */
export const TicketThread: React.FC<{ ticket: Ticket; user: User }> = ({ ticket, user }) => {
  const run = useServiceAction();
  const [reply, setReply] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <ul className="divide-y divide-gray-100">
          {ticket.messages.map((m) => {
            const mine = m.authorId === user.id;
            return (
              <li key={m.id} className="px-5 py-4 flex gap-3">
                {mine ? (
                  <Avatar name={user.name} />
                ) : (
                  <span className="w-8 h-8 shrink-0 rounded-full bg-[#0b0d0c] flex items-center justify-center"><img src={salacopeMark} alt="" width={128} height={110} className="w-4 h-auto" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">{mine ? 'Vous' : 'Support Salacope'}</span>
                    <span className="text-gray-400" title={formatDateTime(m.at)}>
                      {' '}
                      · {formatRelative(m.at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{m.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardBody className="pt-4 space-y-3">
          <Textarea
            rows={3}
            aria-label="Votre réponse"
            placeholder={ticket.status === 'resolved' ? 'Écrire rouvre le ticket.' : 'Ajouter une précision…'}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex flex-wrap justify-between gap-2">
            {ticket.status !== 'resolved' ? (
              <Button variant="ghost" onClick={() => run(() => resolveTicket(ticket.id), 'Ticket marqué comme résolu')}>
                Mon problème est résolu
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              icon={<Send className="w-3.5 h-3.5" />}
              disabled={!reply.trim()}
              onClick={async () => (await run(() => replyToTicket(ticket.id, reply))) && setReply('')}
            >
              Envoyer
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
