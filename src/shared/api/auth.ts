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
    else {
      localStorage.removeItem(KEY);
      localStorage.removeItem('salacope.snapshot'); // the last view of the data goes with the session
    }
  } catch {
    // private window: the session lasts for this tab
  }
};

const MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'Un compte existe déjà avec cet e-mail : connectez-vous.',
  EMAIL_NOT_FOUND: 'E-mail ou mot de passe incorrect.',
  INVALID_PASSWORD: 'E-mail ou mot de passe incorrect.',
  // Also what Firebase answers when the account has no password (created with Google, or switched to
  // Google by a Google sign-in on LightPay, same accounts): say so, with the two ways out.
  INVALID_LOGIN_CREDENTIALS:
    'E-mail ou mot de passe incorrect. Compte créé avec Google ? Utilisez « Continuer avec Google », ou « Mot de passe oublié » pour en choisir un.',
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

// ---------------------------------------------------------------- Google (Firebase SDK, sign-in only)
// The SDK only signs in; its session is copied into Salacope's own storage (the REST refresh above
// then keeps it alive) and the SDK forgets it. On salacope.online the auth domain is the site itself
// (/__/auth/* is relayed to Firebase, see vercel.json): no third-party storage, same tab.
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lightpay-a5f01';
const SDK = 'https://www.gstatic.com/firebasejs/10.12.0/';
const REDIRECT_FLAG = 'g';
let firebase: Promise<any> | null = null;

const loadFirebase = () =>
  (firebase ??= (async () => {
    const appM = await import(/* @vite-ignore */ `${SDK}firebase-app.js`);
    const authM = await import(/* @vite-ignore */ `${SDK}firebase-auth.js`);
    const ownDomain = location.protocol === 'https:' && !location.hostname.endsWith('.vercel.app');
    const app = appM.getApps().length
      ? appM.getApp()
      : appM.initializeApp({ apiKey: API_KEY, projectId: PROJECT_ID, authDomain: ownDomain ? location.host : `${PROJECT_ID}.firebaseapp.com` });
    let fbAuth;
    try {
      fbAuth = authM.initializeAuth(app, { persistence: authM.inMemoryPersistence, popupRedirectResolver: authM.browserPopupRedirectResolver });
    } catch {
      fbAuth = authM.getAuth(app);
    }
    const provider = new authM.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return { ...authM, fbAuth, provider, ownDomain };
  })().catch(() => {
    firebase = null;
    throw new DomainError('Google ne répond pas. Vérifiez votre connexion et réessayez.');
  }));

const GOOGLE_ERRORS: Record<string, string> = {
  'auth/popup-closed-by-user': 'Connexion Google annulée.',
  'auth/cancelled-popup-request': 'Connexion Google annulée.',
  'auth/popup-blocked': 'Votre navigateur a bloqué la fenêtre Google : autorisez-la et réessayez.',
  'auth/unauthorized-domain': 'Ce site n’est pas encore autorisé pour Google : contactez le support.',
  'auth/network-request-failed': 'Pas de connexion internet.',
  'auth/user-disabled': 'Ce compte est désactivé.',
};
const googleError = (e: any) => new DomainError(GOOGLE_ERRORS[e?.code] ?? 'Connexion Google impossible pour le moment.');

const keepGoogle = async (fb: any, result: any) => {
  const user = result.user;
  const token = await user.getIdTokenResult();
  save({
    uid: user.uid,
    email: String(user.email ?? '').toLowerCase(),
    idToken: token.token,
    refreshToken: user.refreshToken,
    expiresAt: new Date(token.expirationTime).getTime(),
  });
  await fb.signOut(fb.fbAuth).catch(() => undefined);
};

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
  uid: () => current?.uid ?? null,

  async signIn(email: string, password: string) {
    save(fromSignIn(await identity('accounts:signInWithPassword', { email: email.trim(), password, returnSecureToken: true })));
  },

  async signUp(email: string, password: string) {
    save(fromSignIn(await identity('accounts:signUp', { email: email.trim(), password, returnSecureToken: true })));
  },

  /**
   * Google: on the site, the page leaves for Google and comes back with ?g=1 (finishGoogle()
   * completes it); elsewhere (local, preview) a popup. Resolves `true` when signed in right away.
   */
  async googleSignIn(): Promise<boolean> {
    const fb = await loadFirebase();
    if (!fb.ownDomain) {
      try {
        await keepGoogle(fb, await fb.signInWithPopup(fb.fbAuth, fb.provider));
        return true;
      } catch (e) {
        throw googleError(e);
      }
    }
    const url = new URL(location.href);
    url.searchParams.set(REDIRECT_FLAG, '1');
    history.replaceState(history.state, '', url.toString());
    try {
      await fb.signInWithRedirect(fb.fbAuth, fb.provider);
    } catch (e) {
      url.searchParams.delete(REDIRECT_FLAG);
      history.replaceState(history.state, '', url.toString());
      throw googleError(e);
    }
    return false;
  },

  /** Back from Google (?g=1): the account is signed in here. `false` when there was nothing to finish. */
  async finishGoogle(): Promise<boolean> {
    if (new URLSearchParams(location.search).get(REDIRECT_FLAG) !== '1') return false;
    const url = new URL(location.href);
    url.searchParams.delete(REDIRECT_FLAG);
    history.replaceState(history.state, '', url.toString());
    const fb = await loadFirebase();
    let result;
    try {
      result = await fb.getRedirectResult(fb.fbAuth);
    } catch (e) {
      throw googleError(e);
    }
    if (!result) return false;
    await keepGoogle(fb, result);
    return true;
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
