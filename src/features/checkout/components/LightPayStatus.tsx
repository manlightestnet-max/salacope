import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';

/** Where the connection to LightPay stands: asking for the payment, connecting (with retries), opening the payment. */
export type LightPayLink = { step: 'request' | 'connect' | 'retry' | 'redirect' | 'open'; attempt: number };

type StepState = 'wait' | 'active' | 'done' | 'warn';

const stateOf = (link: LightPayLink): { label: string; state: StepState }[] => {
  const { step, attempt } = link;
  const connecting = step === 'connect' || step === 'retry';
  return [
    { label: 'Demande de paiement créée', state: step === 'request' ? 'active' : 'done' },
    {
      label: step === 'retry' ? `LightPay ne répond pas · nouvelle tentative (${attempt + 1}/2)` : attempt > 1 && connecting ? `Connexion à LightPay · tentative ${attempt}/2` : 'Connexion à LightPay',
      state: step === 'request' ? 'wait' : step === 'retry' ? 'warn' : connecting ? 'active' : 'done',
    },
    {
      label: step === 'redirect' ? 'Redirection vers la page LightPay' : 'Ouverture du paiement',
      state: step === 'redirect' ? 'active' : step === 'open' ? 'active' : 'wait',
    },
  ];
};

const ICON: Record<StepState, React.ReactNode> = {
  wait: <Circle className="w-4 h-4 text-gray-300" />,
  active: <Loader2 className="w-4 h-4 text-primary-600 animate-spin motion-reduce:animate-none" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-500" />,
};

/** The steps of a payment being opened, so a slow or failed connection to LightPay is visible, never a silent wait. */
export const LightPayStatus: React.FC<{ link: LightPayLink }> = ({ link }) => (
  <ol className="space-y-2 text-left text-sm" aria-live="polite">
    {stateOf(link).map(({ label, state }) => (
      <li key={label} className={clsx('flex items-center gap-2.5', state === 'wait' ? 'text-gray-400' : state === 'warn' ? 'text-amber-700' : 'text-gray-800')}>
        {ICON[state]}
        {label}
      </li>
    ))}
  </ol>
);
