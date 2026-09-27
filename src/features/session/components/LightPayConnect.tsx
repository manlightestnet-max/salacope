import React, { useState } from 'react';
import { CheckCircle2, Wallet } from 'lucide-react';
import { Button, Handoff } from '@/shared/ui';
import { atLeast } from '@/shared/lib';
import { lightPayConnectUrl } from '../api';
import { useCurrentUser } from '../hooks';

/**
 * Where the store's sales land: the seller's own LightPay wallet (withdrawals to
 * Mobile Money from LightPay). Connected once; needed to publish.
 */
export const LightPayConnect: React.FC<{ compact?: boolean; revoked?: boolean }> = ({ compact = false, revoked = false }) => {
  const user = useCurrentUser();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const connected = Boolean(user.merchant?.lightpayConnected);

  const connect = async () => {
    setBusy(true);
    setError(undefined);
    try {
      window.location.assign(await atLeast(lightPayConnectUrl(), 900));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (connected) {
    return (
      <div className="flex items-start gap-3 text-sm">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
        <div>
          <p className="font-medium text-gray-900">Wallet LightPay connecté</p>
          {!compact && <p className="text-gray-500">Vos ventes y sont versées après la validation du client.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 text-sm">
        <Wallet className="w-5 h-5 shrink-0 text-gray-400" />
        <div>
          <p className="font-medium text-gray-900">{revoked ? 'Votre wallet LightPay a été déconnecté' : 'Connectez votre wallet LightPay'}</p>
          <p className="text-gray-500">
            {revoked
              ? 'L’accès de Salacope a été retiré depuis LightPay : reconnectez-le pour recevoir vos prochaines ventes.'
              : 'C’est là que vous recevez vos ventes, puis que vous retirez vers MTN MoMo ou Airtel Money. Obligatoire pour publier.'}
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button variant="primary" onClick={connect} disabled={busy}>
        {revoked ? 'Reconnecter LightPay' : 'Connecter LightPay'}
      </Button>
      {busy && (
        <Handoff
          overlay
          from="salacope"
          to="lightpay"
          title="Connexion avec LightPay"
          description="Vos ventes seront versées sur votre wallet LightPay. Vous revenez ici juste après."
        />
      )}
    </div>
  );
};
