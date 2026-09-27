import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Clock, Copy, Smartphone, XCircle } from 'lucide-react';
import { PaymentAttempt } from '@/shared/db';
import { Button, Dialog, useToast } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { PAYMENT_CHANNELS } from '@/shared/config/payment';
import { PLATFORM } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';
import { PAYMENT_TIMEOUT_MS, cancelPayment, expirePayment, failPayment } from '../api';
import { usePaymentAttempt } from '../hooks';
import { attemptOutcome } from '../model';

/** The attempt's unique code, always visible and easy to copy. */
export const PaymentCode: React.FC<{ code: string; className?: string }> = ({ code, className }) => {
  const toast = useToast();
  return (
    <div className={clsx('flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5', className)}>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500">Code de la transaction</div>
        <div className="font-mono text-sm font-semibold tracking-wider text-gray-900">{code}</div>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(code).then(() => toast.success('Code copié'), () => undefined)}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Copier le code"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
};

const Countdown: React.FC<{ attempt: PaymentAttempt }> = ({ attempt }) => {
  const deadline = new Date(attempt.createdAt).getTime() + PAYMENT_TIMEOUT_MS;
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const left = Math.max(0, deadline - now);
  useEffect(() => {
    if (left === 0) expirePayment(attempt.id);
  }, [left, attempt.id]);

  const seconds = Math.ceil(left / 1000);
  return (
    <div className="w-full">
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${(left / PAYMENT_TIMEOUT_MS) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-gray-500 tabular-nums">
        {seconds} s pour valider
      </p>
    </div>
  );
};

const FAILURE_TEXT = (a: PaymentAttempt) => {
  const channel = PAYMENT_CHANNELS[a.channel].label;
  switch (a.status) {
    case 'expired':
      return `La demande n’a pas été validée dans les ${PLATFORM.paymentTimeoutSeconds} secondes.`;
    case 'cancelled':
      return 'Vous avez annulé la demande.';
    default:
      return a.failure === 'insufficient_funds'
        ? `Votre compte ${channel} n’a pas assez de fonds pour ${formatXaf(a.amount)}.`
        : a.failure === 'network'
        ? `${channel} ne répond pas pour le moment. Réessayez dans quelques minutes.`
        : `${channel} a refusé l’opération.`;
  }
};

export interface PaymentDialogProps {
  attemptId: string | undefined;
  /** Demo: plays the operator's confirmation. */
  onOperatorConfirm: () => void;
  onRetry: () => void;
  onChangeNumber: () => void;
  onClose: () => void;
}

/**
 * Mobile Money request in progress: waits for approval on the phone (with a deadline),
 * then shows the outcome. The attempt code stays visible so support can trace it.
 */
export const PaymentDialog: React.FC<PaymentDialogProps> = ({ attemptId, onOperatorConfirm, onRetry, onChangeNumber, onClose }) => {
  const attempt = usePaymentAttempt(attemptId);
  const open = Boolean(attempt) && attempt!.status !== 'succeeded';
  if (!attempt || !open) return null;

  const channel = PAYMENT_CHANNELS[attempt.channel];
  const pending = attempt.status === 'pending';

  return (
    <Dialog open onClose={onClose} dismissible={!pending} size="sm">
      {pending ? (
        <div className="flex flex-col items-center text-center gap-4 pt-2">
          <span className="relative w-14 h-14 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping motion-reduce:hidden" />
            <Smartphone className="relative w-6 h-6" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Validez sur votre téléphone</h2>
            <p className="mt-1.5 text-sm text-gray-600">
              Une demande de {formatXaf(attempt.amount)} a été envoyée au {attempt.phone}. Composez votre code secret {channel.label} pour
              confirmer.
            </p>
          </div>
          <Countdown attempt={attempt} />
          <PaymentCode code={attempt.code} className="w-full text-left" />
          <div className="w-full grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                cancelPayment(attempt.id);
                onChangeNumber();
              }}
            >
              Changer de numéro
            </Button>
            <Button variant="ghost" onClick={() => cancelPayment(attempt.id)}>
              Annuler
            </Button>
          </div>
          <div className="w-full border-t border-dashed border-gray-200 pt-3">
            <p className="text-[11px] text-gray-500 mb-2">Démo · réponse de l’opérateur</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              <Button size="sm" variant="primary" onClick={onOperatorConfirm}>
                Valider
              </Button>
              <Button size="sm" onClick={() => failPayment(attempt.id, 'declined')}>
                Refuser
              </Button>
              <Button size="sm" onClick={() => failPayment(attempt.id, 'insufficient_funds')}>
                Solde insuffisant
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-4 pt-2">
          <span
            className={clsx(
              'w-14 h-14 rounded-full flex items-center justify-center',
              attempt.status === 'expired' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            )}
          >
            {attempt.status === 'expired' ? <Clock className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{attemptOutcome(attempt)}</h2>
            <p className="mt-1.5 text-sm text-gray-600">{FAILURE_TEXT(attempt)}</p>
          </div>
          <PaymentCode code={attempt.code} className="w-full text-left" />
          <p className="text-xs text-gray-500">
            Aucune commande n’a été créée. Si votre compte a quand même été débité, ouvrez un ticket avec ce code : le support le retrouve
            immédiatement.
          </p>
          <div className="w-full grid grid-cols-2 gap-2">
            <Button to={`${ROUTES.account.newTicket}?ref=${attempt.code}&sujet=payment`}>Ouvrir un ticket</Button>
            <Button variant="primary" onClick={onRetry}>
              Réessayer
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
