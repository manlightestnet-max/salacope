import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { DomainError } from '../src/shared/domain/errors.js';

/**
 * Secrets kept in the database (storage keys…) are encrypted here, never stored in clear and never sent back to anyone:
 * AES-256-GCM with the key in SALACOPE_SETTINGS_KEY (32 random bytes, base64). Generate one with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * and keep it only in the server's environment: without it the stored secrets cannot be read.
 */
const key = (): Buffer => {
  const raw = process.env.SALACOPE_SETTINGS_KEY;
  const buf = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (buf.length !== 32) {
    throw new DomainError('La clé de chiffrement des réglages (SALACOPE_SETTINGS_KEY, 32 octets en base64) manque sur le serveur.', 500);
  }
  return buf;
};

export const secretsReady = () => {
  try {
    key();
    return true;
  } catch {
    return false;
  }
};

/** → `v1.<iv>.<tag>.<data>` (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decrypt(stored: string): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Format de secret inconnu.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
