import { PLATFORM, PlatformSettings, applyPlatform } from '../src/shared/config/platform.js';
import { query } from './db.js';

/**
 * Settings the administration can change (commission, payout delays), kept in `app_settings` and applied to the shared
 * `PLATFORM` rules of this server instance. Read again at most every 30 s, so a change reaches every instance within that time.
 */
const KEY = 'platform';
let loadedAt = 0;

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
    const [row] = await query<{ value: string }>('SELECT value FROM app_settings WHERE key = $1', [KEY]);
    if (row) applyPlatform(JSON.parse(row.value));
  } catch {
    // table not migrated yet, or unreadable: the defaults stay
  }
}

export async function savePlatform(settings: PlatformSettings): Promise<void> {
  await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [KEY, JSON.stringify(settings)]);
  applyPlatform(settings);
  loadedAt = Date.now();
}
