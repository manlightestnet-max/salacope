import React, { useEffect, useState } from 'react';
import { Button, Field, Input } from '@/shared/ui';
import { finishGoogleSignIn, resetPassword, signIn, signInWithGoogle, signUp } from '../api';

/** Google's mark (brand colours, like the operators' logos). */
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export type SignInMode = 'signin' | 'signup' | 'reset';
type Mode = SignInMode;

/**
 * Google, or e-mail and password: a Salacope account (the same Firebase account as on LightPay).
 * Paying never needs a LightPay account.
 * `create` starts on sign-up.
 */
export const SignInForm: React.FC<{ onSignedIn: () => void; create?: boolean; onModeChange?: (mode: SignInMode) => void }> = ({
  onSignedIn,
  create = false,
  onModeChange,
}) => {
  const [mode, setModeState] = useState<Mode>(create ? 'signup' : 'signin');
  const setMode = (next: Mode) => {
    setModeState(next);
    onModeChange?.(next);
  };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Back from Google (?g=1): finish the sign-in here.
  useEffect(() => {
    let live = true;
    setBusy(true);
    finishGoogleSignIn()
      .then((done) => live && done && onSignedIn())
      .catch((err) => live && setError((err as Error).message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const google = async () => {
    if (busy) return;
    setError(undefined);
    setNotice(undefined);
    setBusy(true);
    try {
      if (await signInWithGoogle()) onSignedIn(); // else: the page is leaving for Google
      else return;
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(undefined);
    setNotice(undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(undefined);
    setNotice(undefined);
    setBusy(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setNotice('Si un compte existe avec cet e-mail, un lien pour choisir un nouveau mot de passe vient d’être envoyé.');
        setMode('signin');
        return;
      }
      if (mode === 'signup') await signUp({ name, email, password });
      else await signIn(email, password);
      onSignedIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode !== 'reset' && (
        <>
          <Button size="lg" block disabled={busy} onClick={google} icon={<GoogleMark />}>
            Continuer avec Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-gray-400" aria-hidden>
            <span className="h-px flex-1 bg-gray-200" />
            ou
            <span className="h-px flex-1 bg-gray-200" />
          </div>
        </>
      )}
      {mode === 'signup' && (
        <Field label="Votre nom">
          {(id) => <Input id={id} autoFocus required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
      )}

      <Field label="Adresse e-mail">
        {(id) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            autoFocus={mode !== 'signup'}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.cg"
          />
        )}
      </Field>

      {mode !== 'reset' && (
        <Field
          label="Mot de passe"
          hint={mode === 'signup' ? '8 caractères minimum.' : undefined}
          action={
            mode === 'signin' ? (
              <button type="button" onClick={() => switchTo('reset')} className="text-xs text-gray-500 hover:text-gray-900">
                Mot de passe oublié ?
              </button>
            ) : undefined
          }
        >
          {(id) => (
            <Input
              id={id}
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      )}

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {notice && <p className="text-sm text-gray-600" role="status">{notice}</p>}

      <Button type="submit" variant="primary" size="lg" block disabled={busy}>
        {busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte' : mode === 'reset' ? 'Recevoir le lien' : 'Se connecter'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        {mode === 'signup' ? (
          <>
            Déjà un compte ?{' '}
            <button type="button" onClick={() => switchTo('signin')} className="font-medium text-gray-900 hover:underline">
              Se connecter
            </button>
          </>
        ) : mode === 'reset' ? (
          <button type="button" onClick={() => switchTo('signin')} className="font-medium text-gray-900 hover:underline">
            Retour à la connexion
          </button>
        ) : (
          <>
            Pas encore de compte ?{' '}
            <button type="button" onClick={() => switchTo('signup')} className="font-medium text-gray-900 hover:underline">
              Créer un compte
            </button>
          </>
        )}
      </p>
    </form>
  );
};
