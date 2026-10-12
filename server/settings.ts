import { PLATFORM, PlatformSettings, applyPlatform } from '../src/shared/config/platform.js';
import { DEFAULT_LAUNCH_BANNER, LaunchBannerSettings } from '../src/shared/config/launchBanner.js';
import { DEFAULT_IDENTITY, SiteIdentity, mergeIdentity } from '../src/shared/config/identity.js';
import { query } from './db.js';

/**
 * Settings the administration can change (commission, payout delays), kept in `app_settings` and applied to the shared
 * `PLATFORM` rules of this server instance. Read again at most every 30 s, so a change reaches every instance within that time.
 */
const KEY = 'platform';
const BANNER_KEY = 'launch_banner';
const IDENTITY_KEY = 'identity';
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
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings WHERE key IN ($1, $2, $3)', [KEY, BANNER_KEY, IDENTITY_KEY]);
    const platform = rows.find((r) => r.key === KEY);
    if (platform) applyPlatform(JSON.parse(platform.value));
    const ident = rows.find((r) => r.key === IDENTITY_KEY);
    if (ident) identity = mergeIdentity(JSON.parse(ident.value));
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
