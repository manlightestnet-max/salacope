import React, { useMemo } from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import { Button, EmptyState, ListSection, Page, Tabs } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
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

  const [view, setView] = useRememberedParam<'tickets' | 'paiements'>('account.support', 'vue', ['tickets', 'paiements'], 'tickets');

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
      toolbar={
        attempts.length > 0 && (
          <Tabs
            bare
            value={view}
            onChange={setView}
            items={[
              { value: 'tickets', label: 'Mes tickets', count: tickets.length || undefined },
              { value: 'paiements', label: 'Paiements récents', count: attempts.length },
            ]}
          />
        )
      }
    >
      {view === 'paiements' && attempts.length > 0 ? (
        <ListSection
          title="Paiements récents"
          count={attempts.length}
          help="Chaque tentative a un code unique. Débité sans commande ? Signalez la tentative : le support la retrouve tout de suite."
        >
          <PaymentAttemptList attempts={attempts} titles={titles} />
        </ListSection>
      ) : (
        <ListSection title="Mes tickets" count={tickets.length}>
          {tickets.length ? (
            <TicketList tickets={tickets} />
          ) : (
            <EmptyState icon={LifeBuoy} title="Aucun ticket" description="Un souci de paiement ou de commande ? Ouvrez un ticket avec le code concerné." />
          )}
        </ListSection>
      )}
    </Page>
  );
};
