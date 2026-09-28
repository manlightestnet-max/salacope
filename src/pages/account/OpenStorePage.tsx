import React, { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { GuestPrompt, LightPayConnect, MerchantForm, activateMerchant, useCurrentUser } from '@/features/session';

/** Seller onboarding inside the back-office: the store, then the LightPay wallet that receives the sales. */
export const OpenStorePage: React.FC = () => {
  const user = useCurrentUser();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  // Existing sellers are sent to their dashboard; a store opened here continues to the wallet step.
  const wasMerchant = useRef(Boolean(user.merchant));

  if (wasMerchant.current) return <Navigate to={ROUTES.seller.root} replace />;
  if (user.guest) {
    return (
      <Page title="Ouvrir ma boutique" width="narrow">
        <GuestPrompt title="Un compte pour vendre" />
      </Page>
    );
  }

  return (
    <Page title="Ouvrir ma boutique" width="narrow">
      <p className="text-sm text-gray-500 mb-4">
        Sans abonnement.{' '}
        {PLATFORM.feeRate > 0 ? `Commission de ${PLATFORM.feeRate * 100} % par vente.` : 'Aucune commission pendant le lancement.'} Vos
        ventes sont versées sur votre wallet LightPay après validation du client.
      </p>
      {!user.merchant ? (
        <Card>
          <CardBody className="pt-5">
            <MerchantForm
              initial={{ storeName: user.name }}
              submitLabel="Ouvrir ma boutique"
              error={error}
              busy={busy}
              onSubmit={async (input) => {
                setBusy(true);
                try {
                  await activateMerchant(input);
                  setError(undefined);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Boutique ouverte" description="Dernière étape : où recevoir vos ventes." />
          <CardBody className="space-y-4">
            <LightPayConnect />
            <Button variant="ghost" to={ROUTES.seller.newListing}>
              Préparer une offre d’abord
            </Button>
          </CardBody>
        </Card>
      )}
    </Page>
  );
};
