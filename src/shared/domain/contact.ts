/**
 * Buyer and seller only talk through Salacope: contact details (phone numbers, e-mails,
 * messaging apps) are refused in messages, deliveries and briefs, so the deal and its
 * protection stay on the platform. Enforced by the server; the app checks it too for instant feedback.
 */
const CONTACT_PATTERNS = [
  /(?:\+?\d[\s.\-()]*){8,}/, // phone numbers, however they are spaced
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, // e-mails
  /\b(?:whats?\s?app|wa\.me|telegram|t\.me|signal|messenger|m\.me)\b/i,
];

export const containsContact = (text: string) => CONTACT_PATTERNS.some((p) => p.test(text));

export const CONTACT_BLOCKED =
  'Pas de coordonnées ici (numéro, e-mail, WhatsApp…). Restez sur Salacope : c’est ce qui protège votre paiement et vos droits en cas de litige.';
