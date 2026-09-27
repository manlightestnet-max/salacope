import React, { useMemo } from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import { Button, EmptyState, ListSection, Page } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { PaymentAttemptList, TicketList, useSupportReferences, useTickets } from '@/features/support';

/** `/compte/support`: the user's tickets and latest payment attempts (with their codes). */
export const SupportPage: React.FC = () => {
  const user = useCurrentUser();
  const tickets = useTickets(user.id);
  const { attempts } = useSupportReferences(user.id);
  const listings = useDb((s) => s.listings, []);
  const titles = useMemo(() => new Map(listings.map((l) => [l.id, l.title])), [listings]);

  return (
    <Page
      title="Support"
      width="narrow"
      actions={
        <Button to={ROUTES.account.newTicket} variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
          Nouveau ticket
        </Button>
      }
    >
      <div className="space-y-8">
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
          <ListSection title="Paiements récents" count={attempts.length}>
            <p className="px-1 -mt-1 mb-3 text-xs text-gray-500">
              Chaque tentative a un code unique. Débité sans commande ? Signalez la tentative : le support la retrouve tout de suite.
            </p>
            <PaymentAttemptList attempts={attempts} titles={titles} />
          </ListSection>
        )}
      </div>
    </Page>
  );
};
