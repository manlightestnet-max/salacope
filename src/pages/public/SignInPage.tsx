import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { SignInForm, SignInMode, useSession } from '@/features/session';

/** Only same-site paths are accepted as a redirect target. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : ROUTES.account.explorer);

export const SignInPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const next = safeNext(params.get('next'));
  const create = params.get('creer') === '1';
  const [mode, setMode] = useState<SignInMode>(create ? 'signup' : 'signin');

  if (isAuthenticated && !params.get('next')) return <Navigate to={next} replace />;

  return (
    <div className="max-w-sm mx-auto px-4">
      <h1 className="text-xl font-semibold text-gray-900 text-center">{mode === 'signup' ? 'Créer un compte' : mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'}</h1>
      <p className="text-sm text-gray-500 text-center mt-1 mb-6">
        {mode === 'signup'
          ? 'Un seul compte pour Salacope et LightPay.'
          : mode === 'reset'
            ? 'Recevez un lien pour choisir un nouveau mot de passe.'
            : 'Accédez à vos achats et à votre boutique.'}
      </p>
      <Card className="p-5">
        <SignInForm
          key={create ? 'create' : 'signin'}
          create={create}
          onModeChange={setMode}
          onSignedIn={() => navigate(next, { replace: true })}
        />
      </Card>
    </div>
  );
};
