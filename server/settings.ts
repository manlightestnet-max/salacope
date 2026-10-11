import { PLATFORM, PlatformSettings, applyPlatform } from '../src/shared/config/platform.js';
import { DEFAULT_LAUNCH_BANNER, LaunchBannerSettings } from '../src/shared/config/launchBanner.js';
import { query } from './db.js';

/**
 * Settings the administration can change (commission, payout delays), kept in `app_settings` and applied to the shared
 * `PLATFORM` rules of this server instance. Read again at most every 30 s, so a change reaches every instance within that time.
 */
const KEY = 'platform';
const BANNER_KEY = 'launch_banner';
let loadedAt = 0;
let banner: LaunchBannerSettings = DEFAULT_LAUNCH_BANNER;

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
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings WHERE key IN ($1, $2)', [KEY, BANNER_KEY]);
    const platform = rows.find((r) => r.key === KEY);
    if (platform) applyPlatform(JSON.parse(platform.value));
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
