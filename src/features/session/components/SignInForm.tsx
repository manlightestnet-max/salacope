import React, { useState } from 'react';
import { Button, Field, Input } from '@/shared/ui';
import { DEMO_ACCOUNTS } from '@/shared/db';
import { findUserByEmail, signIn } from '../api';

/**
 * E-mail first: known e-mail → signed in; unknown → asks for a name to create the account.
 * `create` starts on the sign-up step (name + e-mail).
 */
export const SignInForm: React.FC<{ onSignedIn: () => void; create?: boolean }> = ({ onSignedIn, create = false }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'email' | 'create'>(create ? 'create' : 'email');
  const [error, setError] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      if (step === 'email' && !findUserByEmail(email)) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Adresse e-mail invalide.');
        setStep('create');
        return;
      }
      if (step === 'create' && create && findUserByEmail(email)) {
        setStep('email');
        throw new Error('Un compte existe déjà avec cet e-mail : continuez pour vous connecter.');
      }
      signIn({ email, name });
      onSignedIn();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const signInDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    signIn({ email: account.email, name: account.name, phone: account.phone });
    onSignedIn();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Adresse e-mail" error={step === 'email' ? error : undefined}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (!create) setStep('email');
              }}
              placeholder="vous@exemple.cg"
            />
          )}
        </Field>

        {step === 'create' && (
          <Field label="Votre nom" hint={create ? undefined : "Aucun compte n'existe avec cet e-mail : il sera créé."} error={error}>
            {(id) => (
              <Input id={id} autoFocus={!create} required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
          </Field>
        )}

        <Button type="submit" variant="primary" size="lg" block>
          {step === 'create' ? 'Créer mon compte' : 'Continuer'}
        </Button>
      </form>

      <div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="flex-1 border-t border-gray-200" />
          Comptes de démonstration
          <span className="flex-1 border-t border-gray-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => signInDemo(a)}
              className="text-left rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900">{a.label}</div>
              <div className="text-xs text-gray-500">{a.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
