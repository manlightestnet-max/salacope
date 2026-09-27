import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardBody, Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { MerchantForm, activateMerchant, useCurrentUser } from '@/features/session';

/** Seller onboarding inside the back-office. */
export const OpenStorePage: React.FC = () => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  // Existing sellers are sent to their dashboard; a store opened here continues to the first listing.
  const wasMerchant = useRef(Boolean(user.merchant));

  if (wasMerchant.current) return <Navigate to={ROUTES.seller.root} replace />;

  return (
    <Page title="Ouvrir ma boutique" width="narrow">
      <p className="text-sm text-gray-500 mb-4">
        Sans abonnement.{' '}
        {PLATFORM.feeRate > 0 ? `Commission de ${PLATFORM.feeRate * 100} % par vente.` : 'Aucune commission pendant le lancement.'} Vos
        ventes sont versées sur ce numéro après validation du client.
      </p>
      <Card>
        <CardBody className="pt-5">
          <MerchantForm
            initial={{ storeName: user.name, payoutPhone: user.phone }}
            submitLabel="Ouvrir ma boutique"
            error={error}
            onSubmit={(input) => {
              try {
                activateMerchant(user.id, input);
                navigate(ROUTES.seller.newListing);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
        </CardBody>
      </Card>
    </Page>
  );
};
