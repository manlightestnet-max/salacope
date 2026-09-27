import { createId, nowIso } from '@/shared/lib';
import { DomainError, Merchant, User, db, replaceById } from '@/shared/db';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const findUserByEmail = (email: string): User | undefined =>
  db.get().users.find((u) => u.email === normalizeEmail(email));

export interface SignInInput {
  email: string;
  name?: string;
  phone?: string;
}

/**
 * Demo sign-in: signs into the account with this e-mail, creating it on first use.
 * Replace with real authentication (OTP / password) when a backend exists.
 */
export function signIn({ email, name, phone }: SignInInput): User {
  const normalized = normalizeEmail(email);
  if (!isEmail(normalized)) throw new DomainError('Adresse e-mail invalide.');

  let user = findUserByEmail(normalized);
  if (!user) {
    if (!name?.trim()) throw new DomainError('Indiquez votre nom pour créer le compte.');
    user = { id: createId('usr'), name: name.trim(), email: normalized, phone: phone?.trim() ?? '', createdAt: nowIso() };
    const created = user;
    db.update((s) => ({ ...s, users: [...s.users, created] }));
  }

  const userId = user.id;
  db.update((s) => ({ ...s, sessionUserId: userId }));
  return user;
}

export function signOut(): void {
  db.update((s) => ({ ...s, sessionUserId: null }));
}

export function updateProfile(userId: string, data: Pick<User, 'name' | 'phone'>): void {
  if (!data.name.trim()) throw new DomainError('Le nom est obligatoire.');
  db.update((s) => ({
    ...s,
    users: replaceById(s.users, userId, (u) => ({ ...u, name: data.name.trim(), phone: data.phone.trim() })),
  }));
}

export type MerchantInput = Pick<Merchant, 'storeName' | 'headline' | 'city' | 'payoutChannel' | 'payoutPhone'>;

const validateMerchant = (input: MerchantInput) => {
  if (!input.storeName.trim()) throw new DomainError('Le nom de la boutique est obligatoire.');
  if (!input.payoutPhone.trim()) throw new DomainError('Le numéro de versement est obligatoire.');
};

/** Opens the seller account. `verified` is set by the platform after an identity check. */
export function activateMerchant(userId: string, input: MerchantInput): void {
  validateMerchant(input);
  db.update((s) => ({
    ...s,
    users: replaceById(s.users, userId, (u) => ({
      ...u,
      merchant: { ...input, storeName: input.storeName.trim(), verified: false, activatedAt: nowIso() },
    })),
  }));
}

export function updateMerchant(userId: string, input: MerchantInput): void {
  validateMerchant(input);
  db.update((s) => ({
    ...s,
    users: replaceById(s.users, userId, (u) => (u.merchant ? { ...u, merchant: { ...u.merchant, ...input } } : u)),
  }));
}
