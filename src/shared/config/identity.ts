import { useSyncExternalStore } from 'react';

/**
 * What the site says about itself, edited in Admin > Parametres > Identite: the contact address, the line under the logo,
 * the description search engines and assistants read, the picture shown when a link is shared, and the social profiles.
 * Nothing here is written in the code; the values below are only what shows until the administration sets its own.
 */
export const SOCIALS = [
  { key: 'facebook', label: 'Facebook', example: 'https://www.facebook.com/salacope' },
  { key: 'instagram', label: 'Instagram', example: 'https://www.instagram.com/salacope' },
  { key: 'tiktok', label: 'TikTok', example: 'https://www.tiktok.com/@salacope' },
  { key: 'youtube', label: 'YouTube', example: 'https://www.youtube.com/@salacope' },
  { key: 'x', label: 'X', example: 'https://x.com/salacope' },
  { key: 'linkedin', label: 'LinkedIn', example: 'https://www.linkedin.com/company/salacope' },
  { key: 'telegram', label: 'Telegram', example: 'https://t.me/salacope' },
  { key: 'whatsapp', label: 'WhatsApp (chaîne ou lien)', example: 'https://whatsapp.com/channel/...' },
] as const;
export type SocialKey = (typeof SOCIALS)[number]['key'];

export interface SiteIdentity {
  contactEmail: string;
  /** Where the team is based (footer). */
  headquarters: string;
  description: string;
  /** Picture shown when the home page is shared (https address or a path of the site); empty = the site icon. */
  shareImage: string;
  socials: Record<SocialKey, string>;
}

export const DEFAULT_IDENTITY: SiteIdentity = {
  contactEmail: 'contact@salacope.online',
  headquarters: 'Luanda, Angola',
  description:
    "Salacope est la marketplace congolaise des produits numériques et des services : e-books, formations, templates, design, coaching. Paiement MTN MoMo et Airtel Money en FCFA, argent protégé jusqu'à la livraison.",
  shareImage: '',
  socials: { facebook: '', instagram: '', tiktok: '', youtube: '', x: '', linkedin: '', telegram: '', whatsapp: '' },
};

let current: SiteIdentity = DEFAULT_IDENTITY;
const listeners = new Set<() => void>();

export const mergeIdentity = (next?: Partial<SiteIdentity> | null): SiteIdentity => ({
  ...DEFAULT_IDENTITY,
  ...next,
  socials: { ...DEFAULT_IDENTITY.socials, ...(next?.socials ?? {}) },
});

/** What the server sent (it arrives with the data). */
export function applyIdentity(next?: Partial<SiteIdentity> | null) {
  if (!next) return;
  const merged = mergeIdentity(next);
  if (JSON.stringify(merged) === JSON.stringify(current)) return;
  current = merged;
  listeners.forEach((l) => l());
}

export const useSiteIdentity = (): SiteIdentity =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );

/** The social profiles that are filled in, in a fixed order. */
export const socialLinks = (identity: SiteIdentity) => SOCIALS.map((s) => ({ ...s, url: identity.socials[s.key] })).filter((s) => s.url);
