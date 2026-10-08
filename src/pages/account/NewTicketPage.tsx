import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody, Page, useToast } from '@/shared/ui';
import { TicketTopic } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { TICKET_TOPICS, TicketForm } from '@/features/support';

/** `/ac/support/nouveau?ref=TX-…&sujet=payment` */
export const NewTicketPage: React.FC = () => {
  const user = useCurrentUser();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const topic = params.get('sujet');

  return (
    <Page title="Nouveau ticket" back={{ to: ROUTES.account.support, label: 'Support' }} width="narrow">
      <Card>
        <CardBody className="pt-5">
          <TicketForm
            userId={user.id}
            initialReference={params.get('ref') ?? ''}
            initialTopic={TICKET_TOPICS.some((t) => t.value === topic) ? (topic as TicketTopic) : undefined}
            onOpened={(ticket) => {
              toast.success(`Ticket ${ticket.number} envoyé`);
              navigate(ROUTES.account.ticket(ticket.id), { replace: true });
            }}
          />
        </CardBody>
      </Card>
    </Page>
  );
};
