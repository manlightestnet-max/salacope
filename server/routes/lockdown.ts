import crypto from 'node:crypto';
import { DomainError } from '../../src/shared/domain/errors.js';
import { audit, requireAdmin } from '../compliance.js';
import { tx } from '../db.js';
import { route } from '../http.js';
import { KEY_NAME, LEVELS, Level, envLevel, levelNow, rank, refreshLockdown, setStored, stateNow, storedState } from '../lockdown.js';

/**
 * Emergency brake (see ../lockdown.ts). The state is public in one word, for the app to show a banner or the "stopped" screen;
 * changing it is reserved to the administrators, and lifting it asks for a reason and, when SALACOPE_UNLOCK_CODE is set, that code.
 */
route('GET', '/status', async () => ({ level: levelNow() }));

const unlockCodeOk = (given: unknown) => {
  const expected = process.env.SALACOPE_UNLOCK_CODE;
  if (!expected) return true;
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

route('GET', '/admin/lockdown', async (ctx) => {
  await requireAdmin(ctx);
  await refreshLockdown();
  return { state: stateNow(), codeRequired: Boolean(process.env.SALACOPE_UNLOCK_CODE) };
});

route('POST', '/admin/lockdown', async (ctx) => {
  const admin = await requireAdmin(ctx);
  const level = ctx.body.level as Level;
  if (!LEVELS.includes(level)) throw new DomainError('Niveau inconnu.');
  const reason = String(ctx.body.reason ?? '').trim().replace(/\s+/g, ' ').slice(0, 300);
  await refreshLockdown();
  const before = storedState();
  if (envLevel() !== 'off' && rank(level) < rank(envLevel())) {
    throw new DomainError('Ce niveau est imposé par la variable SALACOPE_LOCKDOWN du serveur : retirez-la sur Vercel, puis redéployez.', 409);
  }
  if (level === before.level) return { state: stateNow(), codeRequired: Boolean(process.env.SALACOPE_UNLOCK_CODE) };

  // Stopping is one click (no questions in an emergency); lifting or easing the brake needs a reason and, if set, the unlock code.
  if (rank(level) < rank(before.level)) {
    if (reason.length < 5) throw new DomainError('Indiquez pourquoi vous levez ou assouplissez le verrou (5 caractères minimum).');
    if (!unlockCodeOk(ctx.body.code)) {
      await new Promise((r) => setTimeout(r, 1500));
      await tx(async (q) => audit(q, admin, 'lockdown.denied', null, { level, reason })).catch(() => undefined);
      throw new DomainError('Code de déverrouillage incorrect.', 403);
    }
  }
  const next = { level, reason: reason || (level === 'off' ? '' : 'Verrou d’urgence'), since: new Date().toISOString(), by: admin.email };
  await tx(async (q) => {
    await q(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [KEY_NAME, JSON.stringify(next)]);
    await audit(q, admin, 'lockdown.set', null, { from: before.level, to: level, reason: next.reason });
  });
  setStored(next);
  return { state: stateNow(), codeRequired: Boolean(process.env.SALACOPE_UNLOCK_CODE) };
});

