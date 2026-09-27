import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Handoff, Page, useToast } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { LightPayConnect, completeLightPayConnection } from '@/features/session';

/** `/lightpay/callback` — LightPay sends the seller back here after approving (or refusing) the connection. */
export const LightPayCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeLightPayConnection(params)
      .then(() => {
        toast.success('Wallet LightPay connecté');
        navigate(ROUTES.seller.root, { replace: true });
      })
      .catch((err) => setError((err as Error).message));
  }, [params, navigate, toast]);

  return (
    <Page title="Connexion LightPay" width="narrow">
      {error ? (
        <div className="space-y-6">
          <EmptyState title="Wallet non connecté" description={error} action={<Button to={ROUTES.account.settings}>Paramètres</Button>} />
          <LightPayConnect />
        </div>
      ) : (
        <div className="py-12">
          <Handoff from="lightpay" to="salacope" title="Connexion de votre wallet…" description="Encore un instant, vous revenez sur votre boutique." />
        </div>
      )}
    </Page>
  );
};
