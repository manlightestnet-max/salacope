import { DomainError } from '@/shared/domain';

/**
 * Firebase accounts (same project as LightPay: one account for both), over the REST API.
 * The web API key is public by design; the server verifies every ID token.
 */
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAyOdD8qSUfx8wvHhb5F4EJ4zKjavwnpeI';
const KEY = 'salacope.auth';

interface Credentials {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
  /** ms epoch */
  expiresAt: number;
}

const read = (): Credentials | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
};

let current: Credentials | null = read();

const save = (c: Credentials | null) => {
  current = c;
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    // private window: the session lasts for this tab
  }
};

const MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'Un compte existe déjà avec cet e-mail : connectez-vous.',
  EMAIL_NOT_FOUND: 'E-mail ou mot de passe incorrect.',
  INVALID_PASSWORD: 'E-mail ou mot de passe incorrect.',
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  INVALID_EMAIL: 'Adresse e-mail invalide.',
  MISSING_PASSWORD: 'Saisissez votre mot de passe.',
  WEAK_PASSWORD: 'Mot de passe trop court : 6 caractères minimum.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Trop de tentatives. Réessayez dans quelques minutes.',
  USER_DISABLED: 'Ce compte est désactivé.',
  TOKEN_EXPIRED: 'Session expirée : reconnectez-vous.',
  INVALID_REFRESH_TOKEN: 'Session expirée : reconnectez-vous.',
};

const post = async (url: string, body: string, contentType = 'application/json') => {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  } catch {
    throw new DomainError('Pas de connexion internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(data?.error?.message ?? '').split(' ')[0];
    throw new DomainError(MESSAGES[code] ?? 'Connexion impossible pour le moment.', res.status);
  }
  return data;
};

const identity = (path: string, body: object) =>
  post(`https://identitytoolkit.googleapis.com/v1/${path}?key=${API_KEY}`, JSON.stringify(body));

const fromSignIn = (d: any): Credentials => ({
  uid: d.localId,
  email: String(d.email).toLowerCase(),
  idToken: d.idToken,
  refreshToken: d.refreshToken,
  expiresAt: Date.now() + Number(d.expiresIn ?? 3600) * 1000,
});

export const auth = {
  signedIn: () => Boolean(current),
  email: () => current?.email ?? null,

  async signIn(email: string, password: string) {
    save(fromSignIn(await identity('accounts:signInWithPassword', { email: email.trim(), password, returnSecureToken: true })));
  },

  async signUp(email: string, password: string) {
    save(fromSignIn(await identity('accounts:signUp', { email: email.trim(), password, returnSecureToken: true })));
  },

  async resetPassword(email: string) {
    await identity('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email: email.trim() });
  },

  signOut() {
    save(null);
  },

  /** A valid ID token (refreshed a few minutes before expiry), or null when signed out. */
  async idToken(): Promise<string | null> {
    if (!current) return null;
    if (current.expiresAt - Date.now() > 5 * 60_000) return current.idToken;
    try {
      const d = await post(
        `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
        `grant_type=refresh_token&refresh_token=${encodeURIComponent(current.refreshToken)}`,
        'application/x-www-form-urlencoded'
      );
      save({ ...current, idToken: d.id_token, refreshToken: d.refresh_token, expiresAt: Date.now() + Number(d.expires_in) * 1000 });
      return current!.idToken;
    } catch (err) {
      if ((err as DomainError).status === 400) save(null);
      throw err;
    }
  },
};
