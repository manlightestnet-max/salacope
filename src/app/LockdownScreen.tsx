import React, { useEffect, useState } from 'react';
import { OctagonAlert } from 'lucide-react';
import { Button, Field, Input } from '@/shared/ui';
import { auth, request } from '@/shared/api';
import { LockdownControl } from '@/features/admin';

/**
 * What everybody sees while the server is stopped (see server/lockdown.ts). It asks the server again every few seconds and
 * comes back by itself. Administrators sign in with Firebase only (no Salacope data is needed) to lift the lock.
 */
export const LockdownScreen: React.FC = () => {
  const [admin, setAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(auth.signedIn());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      request<{ level: string }>('GET', '/status')
        .then((s) => s.level !== 'total' && window.location.reload())
        .catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await auth.signIn(email, password);
      setSignedIn(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-16 flex flex-col items-center">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
          <OctagonAlert className="w-6 h-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Salacope est momentanément arrêté</h1>
        <p className="mt-2 text-sm text-gray-500">Nous faisons une vérification de sécurité. Vos paiements et vos données sont protégés. Revenez dans quelques instants : cette page se rouvre toute seule.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
          {!admin && (
            <Button variant="ghost" onClick={() => setAdmin(true)}>
              Administration
            </Button>
          )}
        </div>
      </div>

      {admin && (
        <div className="mt-10 w-full max-w-xl text-left">
          {signedIn ? (
            <LockdownControl />
          ) : (
            <form onSubmit={login} className="space-y-4 rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-600">Connectez-vous avec votre compte administrateur pour gérer le verrou.</p>
              <Field label="E-mail">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />}</Field>
              <Field label="Mot de passe">{(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />}</Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" variant="primary" loading={busy}>
                Se connecter
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
