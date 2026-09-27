import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { PaymentReturn } from '@/features/checkout';

/** `/paiement/retour?tentative=…` — where LightPay sends the buyer back. */
export const PaymentReturnPage: React.FC = () => {
  const [params] = useSearchParams();
  const attemptId = params.get('tentative');
  return (
    <Page title="Paiement" width="narrow">
      {attemptId ? (
        <PaymentReturn attemptId={attemptId} interrupted={params.get('annule') === '1'} />
      ) : (
        <EmptyState title="Paiement introuvable" action={<Button to={ROUTES.account.orders}>Mes achats</Button>} />
      )}
    </Page>
  );
};
