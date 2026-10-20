import type { OrderRefund } from '../db/schema.js';

/** Why a refund to a phone is smaller than what was paid (shown wherever the amounts are). */
export const REFUND_FEES_WHY = 'Ces frais font partie de la maintenance et des opérations du réseau (opérateur mobile et LightPay).';

/** The two ways a payment comes back, in plain words. */
export const REFUND_RULE =
  'Payé par mobile money : remboursé sur le même numéro, moins les frais de retrait (opérateur et LightPay). Payé par wallet LightPay : remboursé en totalité.';

/** "14:32", Congo time: when LightPay sends a refund that waits for its delay (nothing once that moment has passed). */
export const refundDepartureTime = (r: OrderRefund): string | null =>
  r.releaseAt && new Date(r.releaseAt).getTime() > Date.now()
    ? new Date(r.releaseAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' })
    : null;

/** What a refund came to, in one sentence ("Vous êtes remboursé de …"). */
export const refundSentence = (r: OrderRefund, format: (n: number) => string): string => {
  if (r.paid === 0) return 'Commande annulée : elle était gratuite, rien n’est à rembourser.';
  if (r.sent <= 0) return 'Le montant est trop faible pour couvrir les frais de retrait : contactez le support.';
  const departs = refundDepartureTime(r);
  const when = departs ? ` Le virement part à ${departs}.` : '';
  if (r.sent >= r.paid) return `Vous êtes remboursé de ${format(r.paid)}.${when}`;
  return `Vous êtes remboursé de ${format(r.sent)} : ${format(r.paid)} payés moins ${format(r.paid - r.sent)} de frais de retrait (opérateur et LightPay).${when}`;
};
