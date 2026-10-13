import { PLATFORM, PlatformSettings, applyPlatform } from '../src/shared/config/platform.js';
import { DEFAULT_LAUNCH_BANNER, LaunchBannerSettings } from '../src/shared/config/launchBanner.js';
import { DEFAULT_IDENTITY, SiteIdentity, mergeIdentity } from '../src/shared/config/identity.js';
import { DEFAULT_EXPLORE, ExploreSettings, cleanExplore } from '../src/shared/config/explore.js';
import type { MessageTemplate } from '../src/shared/config/messages.js';
import { query } from './db.js';

/**
 * Settings the administration can change (commission, payout delays), kept in `app_settings` and applied to the shared
 * `PLATFORM` rules of this server instance. Read again at most every 30 s, so a change reaches every instance within that time.
 */
const KEY = 'platform';
const BANNER_KEY = 'launch_banner';
const IDENTITY_KEY = 'identity';
const EXPLORE_KEY = 'explore';
const MESSAGES_KEY = 'messages';
let messages: Record<string, Partial<MessageTemplate>> = {};

/** The message templates the administration rewrote (event → its changes); the others keep their original text. */
export const currentMessages = () => messages;
let explore: ExploreSettings = DEFAULT_EXPLORE;

/** How the Explorer ranks offers (weights, new offers, "À la une"). */
export const currentExplore = () => explore;
let loadedAt = 0;
let banner: LaunchBannerSettings = DEFAULT_LAUNCH_BANNER;
let identity: SiteIdentity = DEFAULT_IDENTITY;

export const currentIdentity = () => identity;

export const currentLaunchBanner = () => banner;

export const currentPlatform = (): PlatformSettings => ({
  feeRate: PLATFORM.feeRate,
  feeRateDigital: PLATFORM.feeRateDigital,
  feeRateService: PLATFORM.feeRateService,
  digitalHoldDays: PLATFORM.digitalHoldDays,
  serviceValidationDays: PLATFORM.serviceValidationDays,
});

export async function ensurePlatform(): Promise<void> {
  if (Date.now() - loadedAt < 30_000) return;
  loadedAt = Date.now();
  try {
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings WHERE key IN ($1, $2, $3, $4, $5)', [KEY, BANNER_KEY, IDENTITY_KEY, EXPLORE_KEY, MESSAGES_KEY]);
    const platform = rows.find((r) => r.key === KEY);
    if (platform) applyPlatform(JSON.parse(platform.value));
    const ident = rows.find((r) => r.key === IDENTITY_KEY);
    if (ident) identity = mergeIdentity(JSON.parse(ident.value));
    const texts = rows.find((r) => r.key === MESSAGES_KEY);
    if (texts) messages = JSON.parse(texts.value);
    const ranking = rows.find((r) => r.key === EXPLORE_KEY);
    if (ranking) explore = cleanExplore(JSON.parse(ranking.value));
    const launch = rows.find((r) => r.key === BANNER_KEY);
    if (launch) banner = { ...DEFAULT_LAUNCH_BANNER, ...JSON.parse(launch.value) };
  } catch {
    // table not migrated yet, or unreadable: the defaults stay
  }
}

export async function savePlatform(settings: PlatformSettings): Promise<void> {
  await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [KEY, JSON.stringify(settings)]);
  applyPlatform(settings);
  loadedAt = Date.now();
}

export async function saveLaunchBanner(next: LaunchBannerSettings): Promise<void> {
  await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [BANNER_KEY, JSON.stringify(next)]);
  banner = next;
  loadedAt = Date.now();
}

export async function saveIdentity(next: SiteIdentity): Promise<void> {
  await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [IDENTITY_KEY, JSON.stringify(next)]);
  identity = next;
  loadedAt = Date.now();
}

export async function saveExplore(next: ExploreSettings): Promise<void> {
  const clean = cleanExplore(next);
  await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [EXPLORE_KEY, JSON.stringify(clean)]);
  explore = clean;
  loadedAt = Date.now();
}

export async function saveMessages(next: Record<string, Partial<MessageTemplate>>): Promise<void> {
  await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [MESSAGES_KEY, JSON.stringify(next)]);
  messages = next;
  loadedAt = Date.now();
}
