import { useSyncExternalStore } from 'react';

/**
 * The notice above the header, controlled from the administration: off, a line of text, or a line of text with a button.
 * `audience` is for later (showing it only to chosen accounts); today it is always everybody.
 */
export interface LaunchBannerSettings {
  enabled: boolean;
  style: 'text' | 'button';
  text: string;
  /** Second line in grey, on wide screens (e.g. the English version). Optional. */
  secondary: string;
  buttonLabel: string;
  /** A page of the site (/…) or an https:// address. */
  buttonLink: string;
  audience: 'all';
}

export const DEFAULT_LAUNCH_BANNER: LaunchBannerSettings = {
  enabled: true,
  style: 'text',
  text: 'Site en cours de développement, lancement très bientôt',
  secondary: 'Under development, going live soon',
  buttonLabel: '',
  buttonLink: '',
  audience: 'all',
};

let current: LaunchBannerSettings = DEFAULT_LAUNCH_BANNER;
const listeners = new Set<() => void>();

/** What the server sent (it arrives with the data). */
export function applyLaunchBanner(next?: Partial<LaunchBannerSettings> | null) {
  if (!next) return;
  const merged = { ...DEFAULT_LAUNCH_BANNER, ...next };
  if (JSON.stringify(merged) === JSON.stringify(current)) return;
  current = merged;
  listeners.forEach((l) => l());
}

export const useLaunchBannerSettings = (): LaunchBannerSettings =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
