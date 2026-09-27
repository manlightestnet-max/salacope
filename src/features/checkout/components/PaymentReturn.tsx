import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button, EmptyState, Handoff, useToast } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { cancelAttempt, refreshAttempt } from '../api';
import { usePaymentAttempt } from '../hooks';
import { attemptOutcome } from '../model';
import { PaymentCode } from './PaymentCode';

const POLL_MS = 3_000;
const MAX_POLLS = 20;

/**
 * Back from LightPay: asks where the payment stands. Paid -> the order opens; still
 * confirming -> waits a little; left or expired -> the buyer can resume or give up.
 */
export const PaymentReturn: React.FC<{ attemptId: string; interrupted: boolean }> = ({ attemptId, interrupted }) => {
  const attempt = usePaymentAttempt(attemptId);
  const navigate = useNavigate();
  const toast = useToast();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    const check = async () => {
      try {
        const a = await refreshAttempt(attemptId);
        if (stopped) return;
        setError(undefined);
        polls.current += 1;
        if (a.status === 'pending' && !interrupted && polls.current < MAX_POLLS) timer = window.setTimeout(check, POLL_MS);
        else setChecking(false);
      } catch (err) {
        if (!stopped) {
          setError((err as Error).message);
          setChecking(false);
        }
      }
    };
    void check();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [attemptId, interrupted]);

  useEffect(() => {
    if (attempt?.status === 'succeeded' && attempt.orderId) {
      toast.success('Paiement confirmé');
      navigate(ROUTES.account.order(attempt.orderId), { replace: true });
    }
  }, [attempt?.status, attempt?.orderId, navigate, toast]);

  const offer = attempt ? ROUTES.account.offer(attempt.listingId) : ROUTES.account.explorer;

  if (!attempt) {
    return error ? (
      <EmptyState title="Paiement introuvable" description={error} action={<Button to={ROUTES.account.orders}>Mes achats</Button>} />
    ) : (
      <div className="py-12">
        <Handoff from="lightpay" to="salacope" title="Retour de LightPay" description="Vérification de votre paiement…" />
      </div>
    );
  }

  if (attempt.status === 'succeeded') {
    return <EmptyState icon={CheckCircle2} title="Paiement confirmé" description="Ouverture de votre commande…" />;
  }

  if (attempt.status === 'pending' && checking) {
    return (
      <div className="py-12">
        <Handoff
          from="lightpay"
          to="salacope"
          title="Confirmation du paiement…"
          description="LightPay confirme votre paiement. Cela prend quelques secondes."
        />
      </div>
    );
  }

  if (attempt.status === 'pending') {
    return (
      <div className="max-w-md mx-auto py-12 space-y-5 text-center">
        <div className="flex justify-center text-gray-400">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Paiement pas encore reçu</h2>
          <p className="mt-1 text-sm text-gray-500">
            {formatXaf(attempt.amount)} · rien n’a été commandé tant que le paiement n’est pas confirmé.
          </p>
        </div>
        <PaymentCode code={attempt.code} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col gap-2">
          {attempt.checkoutUrl && (
            <Button
              variant="primary"
              onClick={() => {
                setLeaving(true);
                window.setTimeout(() => window.location.assign(attempt.checkoutUrl!), 700);
              }}
            >
              Reprendre le paiement
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await cancelAttempt(attempt.id).catch(() => undefined);
              navigate(offer, { replace: true });
            }}
          >
            Abandonner
          </Button>
        </div>
        {leaving && (
          <Handoff
            overlay
            from="salacope"
            to="lightpay"
            title="Paiement avec LightPay"
            description="Vous revenez ici juste après."
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-5 text-center">
      <div className="flex justify-center text-gray-400">
        <XCircle className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{attemptOutcome(attempt)}</h2>
        <p className="mt-1 text-sm text-gray-500">Aucune commande n’a été créée. Gardez ce code si vous contactez le support.</p>
      </div>
      <PaymentCode code={attempt.code} />
      <div className="flex flex-col gap-2">
        <Button variant="primary" to={ROUTES.account.checkout(attempt.listingId)}>
          Réessayer
        </Button>
        <Button variant="ghost" to={ROUTES.account.support}>
          Contacter le support
        </Button>
      </div>
    </div>
  );
};
