import { DomainError } from '../src/shared/domain/errors.js';
import type { Identity } from './auth.js';
import type { Query } from './db.js';
import type { Context } from './http.js';
import { newId } from './ids.js';

/**
 * AML/CFT controls shared by the routes: who administers Salacope, which sellers may sell, and
 * the log of every administrator action.
 */

/** Firebase uids of Salacope's administrators (`SALACOPE_ADMIN_UIDS`, comma-separated). */
const adminUids = () =>
  (process.env.SALACOPE_ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const isAdminUid = (uid?: string | null) => Boolean(uid) && adminUids().includes(uid!);

export async function requireAdmin(ctx: Context): Promise<Identity> {
  const identity = await ctx.identity();
  if (!identity) throw new DomainError('Connectez-vous pour continuer.', 401);
  if (!isAdminUid(identity.uid)) throw new DomainError('Accès réservé à l’administration Salacope.', 403);
  return identity;
}

/** Sellers whose offers are shown and can be bought: identity verified, store and account active. */
export const SELLABLE_SELLERS = `SELECT m.user_id FROM merchants m JOIN users u ON u.id = m.user_id
  WHERE m.kyc_status = 'approved' AND m.suspended_at IS NULL AND u.blocked_at IS NULL`;

/** Before going online: the seller is verified and not suspended. */
export async function requireSellable(q: Query, sellerId: string) {
  const [m] = await q(
    `SELECT m.kyc_status, m.suspended_at, u.blocked_at FROM merchants m JOIN users u ON u.id = m.user_id WHERE m.user_id = $1`,
    [sellerId]
  );
  if (!m) throw new DomainError('Activez votre boutique pour publier une offre.', 403);
  if (m.blocked_at || m.suspended_at) throw new DomainError('Votre boutique est suspendue : vous ne pouvez pas publier. Écrivez au support.', 403);
  if (m.kyc_status !== 'approved') {
    throw new DomainError(
      m.kyc_status === 'pending'
        ? 'Votre identité est en cours de vérification : vous pourrez publier dès qu’elle sera validée.'
        : 'Vérifiez votre identité pour publier : Boutique → Vérification.',
      409
    );
  }
}

export async function audit(q: Query, admin: Identity, action: string, targetUserId: string | null, detail: Record<string, unknown> = {}) {
  await q('INSERT INTO admin_audit (id, admin_email, action, target_user_id, detail) VALUES ($1, $2, $3, $4, $5::jsonb)', [
    newId('aud'),
    admin.email,
    action,
    targetUserId,
    JSON.stringify(detail),
  ]);
}
