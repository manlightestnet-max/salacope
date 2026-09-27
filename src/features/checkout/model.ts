import { PaymentAttempt, PaymentFailure } from '@/shared/db';

export const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 9;

export const FAILURE_LABEL: Record<PaymentFailure, string> = {
  declined: 'Paiement refusé',
  insufficient_funds: 'Solde insuffisant',
  network: 'Service de paiement indisponible',
};

/** Short outcome shown to the buyer and in the support pages. */
export const attemptOutcome = (a: Pick<PaymentAttempt, 'status' | 'failure'>): string => {
  switch (a.status) {
    case 'pending':
      return 'En attente de paiement';
    case 'succeeded':
      return 'Paiement confirmé';
    case 'failed':
      return a.failure ? FAILURE_LABEL[a.failure] : 'Paiement refusé';
    case 'expired':
      return 'Délai de paiement dépassé';
    case 'cancelled':
      return 'Paiement annulé';
  }
};
