import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button, Container, EmptyState, Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useBackLink } from '@/shared/hooks';
import { useListingView } from '@/features/catalog';
import { CheckoutForm } from '@/features/checkout';
import { useSession } from '@/features/session';

/**
 * `/checkout/:id` (visitors, minimal chrome) and `/compte/checkout/:id` (inside the back-office).
 */
export const CheckoutPage: React.FC<{ inApp?: boolean }> = ({ inApp = false }) => {
  const { id = '' } = useParams<{ id: string }>();
  const view = useListingView(id);
  const { user } = useSession();

  const backTo = inApp ? ROUTES.account.offer(id) : ROUTES.listing(id);
  const back = useBackLink({ to: backTo, label: 'Offre' });

  let content: React.ReactNode;
  if (!view || view.listing.status !== 'published') {
    content = <EmptyState title="Cette offre n'est plus disponible" action={<Button to={inApp ? ROUTES.account.explorer : ROUTES.search}>Retour au catalogue</Button>} />;
  } else if (user?.id === view.listing.sellerId) {
    content = (
      <EmptyState
        title="C'est votre propre offre"
        description="Vous ne pouvez pas acheter une offre de votre boutique."
        action={<Button to={ROUTES.seller.listing(view.listing.id)}>Modifier l'offre</Button>}
      />
    );
  } else {
    content = (
      <CheckoutForm listing={view.listing} />
    );
  }

  if (inApp) {
    return (
      <Page title="Paiement" back={back}>
        {content}
      </Page>
    );
  }

  return (
    <Container size="md">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" />
        Retour à l'offre
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Paiement</h1>
      {content}
    </Container>
  );
};
