import { PaymentAttempt, PaymentFailure } from '@/shared/db';

/** No 0/O or 1/I: codes are read out loud to support. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** "TX-7K4P-92QD" */
export const createPaymentCode = () => {
  let code = '';
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `TX-${code.slice(0, 4)}-${code.slice(4)}`;
};

export const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 9;

export const FAILURE_LABEL: Record<PaymentFailure, string> = {
  declined: 'Paiement refusé par l’opérateur',
  insufficient_funds: 'Solde insuffisant',
  network: 'Réseau de l’opérateur indisponible',
};

/** Short outcome shown to the buyer and in the support pages. */
export const attemptOutcome = (a: Pick<PaymentAttempt, 'status' | 'failure'>): string => {
  switch (a.status) {
    case 'pending':
      return 'En attente de validation';
    case 'succeeded':
      return 'Paiement confirmé';
    case 'failed':
      return a.failure ? FAILURE_LABEL[a.failure] : 'Paiement refusé';
    case 'expired':
      return 'Délai de validation dépassé';
    case 'cancelled':
      return 'Paiement annulé';
  }
};
