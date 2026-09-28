import { auth, boot, guest, mutate, request } from '@/shared/api';
import { DomainError, Merchant, db, emptyDatabase } from '@/shared/db';

const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/**
 * One account for Salacope and LightPay (same sign-in). A LightPay user signing in here for
 * the first time gets their Salacope account created on the way.
 */
export async function signIn(email: string, password: string): Promise<void> {
  if (!isEmail(email)) throw new DomainError('Adresse e-mail invalide.');
  await auth.signIn(email, password);
  // Purchases made here without an account join it.
  await request('POST', '/session', {});
  guest.clear();
  await boot();
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export async function signUp({ name, email, password, phone }: SignUpInput): Promise<void> {
  if (!name.trim()) throw new DomainError('Indiquez votre nom pour créer le compte.');
  if (!isEmail(email)) throw new DomainError('Adresse e-mail invalide.');
  if (password.length < 8) throw new DomainError('Mot de passe trop court : 8 caractères minimum.');
  await auth.signUp(email, password);
  await request('POST', '/session', { name: name.trim(), phone: phone?.trim() });
  guest.clear();
  await boot();
}

export async function resetPassword(email: string): Promise<void> {
  if (!isEmail(email)) throw new DomainError('Saisissez l’adresse e-mail du compte.');
  await auth.resetPassword(email);
}

export async function signOut(): Promise<void> {
  auth.signOut();
  guest.clear();
  db.load(emptyDatabase());
  await boot().catch(() => undefined);
}

export async function updateProfile(data: { name: string; phone: string }): Promise<void> {
  if (!data.name.trim()) throw new DomainError('Le nom est obligatoire.');
  await mutate('PATCH', '/me', data);
}

export type MerchantInput = Pick<Merchant, 'storeName' | 'headline' | 'city'>;

const validateMerchant = (input: MerchantInput) => {
  if (!input.storeName.trim()) throw new DomainError('Le nom de la boutique est obligatoire.');
};

/** Opens the seller account. `verified` is set by the platform after an identity check. */
export async function activateMerchant(input: MerchantInput): Promise<void> {
  validateMerchant(input);
  await mutate('POST', '/merchant', input);
}

export async function updateMerchant(input: MerchantInput): Promise<void> {
  validateMerchant(input);
  await mutate('PATCH', '/merchant', input);
}

/** Where the seller connects, on LightPay, the wallet that receives the sales. */
export async function lightPayConnectUrl(): Promise<string> {
  const { url } = await request<{ url: string }>('POST', '/lightpay/connect', {});
  return url;
}

/** Back from LightPay with a code (or a refusal). */
export async function completeLightPayConnection(params: URLSearchParams): Promise<void> {
  await mutate('POST', '/lightpay/callback', {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
  });
}
