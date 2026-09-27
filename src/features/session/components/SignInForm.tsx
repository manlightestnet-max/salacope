import React, { useState } from 'react';
import { Button, Field, Input } from '@/shared/ui';
import { resetPassword, signIn, signUp } from '../api';

export type SignInMode = 'signin' | 'signup' | 'reset';
type Mode = SignInMode;

/**
 * E-mail and password. The same account works on LightPay (one sign-in for both).
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
            Déjà un compte Salacope ou LightPay ?{' '}
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
      {mode === 'signin' && <p className="text-center text-xs text-gray-400">Votre compte LightPay fonctionne aussi ici.</p>}
    </form>
  );
};
