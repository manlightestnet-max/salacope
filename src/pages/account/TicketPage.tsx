import React from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { TicketStatusBadge, TicketThread, topicLabel, useTicket } from '@/features/support';

/** `/ac/support/:id` */
export const TicketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const ticket = useTicket(id, user.id);
  const back = { to: ROUTES.account.support, label: 'Support' };

  if (!ticket) {
    return (
      <Page title="Ticket introuvable" back={back} width="narrow">
        <EmptyState title="Ce ticket n'existe pas." />
      </Page>
    );
  }

  return (
    <Page
      title={ticket.subject}
      back={back}
      width="narrow"
      meta={
        <span className="ml-2 hidden sm:flex">
          <TicketStatusBadge ticket={ticket} />
        </span>
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        {ticket.number} · {topicLabel(ticket.topic)}
        {ticket.reference && (
          <>
            {' · '}
            <span className="font-mono">{ticket.reference}</span>
          </>
        )}
      </p>
      <TicketThread ticket={ticket} user={user} />
    </Page>
  );
};
