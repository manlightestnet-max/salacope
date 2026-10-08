import React, { useMemo } from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import { Button, EmptyState, ListSection, Page } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { PaymentAttemptList, TicketList, useSupportReferences, useTickets } from '@/features/support';

/** `/ac/support`: the user's tickets and latest payment attempts (with their codes). */
export const SupportPage: React.FC = () => {
  const user = useCurrentUser();
  const tickets = useTickets(user.id);
  const { attempts } = useSupportReferences(user.id);
  const listings = useDb((s) => s.listings, []);
  const titles = useMemo(() => new Map(listings.map((l) => [l.id, l.title])), [listings]);

  return (
    <Page
      title="Support"
      help="Vos demandes au support et vos derniers paiements, avec leur code."
      width="narrow"
      actions={
        <Button to={ROUTES.account.newTicket} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Nouveau ticket
        </Button>
      }
    >
      <div className="space-y-6">
        <ListSection title="Mes tickets" count={tickets.length}>
          {tickets.length ? (
            <TicketList tickets={tickets} />
          ) : (
            <EmptyState
              icon={LifeBuoy}
              title="Aucun ticket"
              description="Un souci de paiement ou de commande ? Ouvrez un ticket avec le code concerné."
            />
          )}
        </ListSection>

        {attempts.length > 0 && (
          <ListSection
            title="Paiements récents"
            count={attempts.length}
            help="Chaque tentative a un code unique. Débité sans commande ? Signalez la tentative : le support la retrouve tout de suite."
          >
            <PaymentAttemptList attempts={attempts} titles={titles} />
          </ListSection>
        )}
      </div>
    </Page>
  );
};
