import crypto from 'node:crypto';

/** `lst_4fK9…` — unguessable, so ids in URLs reveal nothing. */
export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(12).toString('base64url')}`;

/** No 0/O or 1/I: codes are read out loud to support. "TX-7K4P-92QD" */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const paymentCode = () => {
  const bytes = crypto.randomBytes(8);
  const code = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `TX-${code.slice(0, 4)}-${code.slice(4)}`;
};
