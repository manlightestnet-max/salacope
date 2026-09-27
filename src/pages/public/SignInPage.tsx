import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { SignInForm, useSession } from '@/features/session';

/** Only same-site paths are accepted as a redirect target. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : ROUTES.account.explorer);

export const SignInPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const next = safeNext(params.get('next'));
  const create = params.get('creer') === '1';

  if (isAuthenticated && !params.get('next')) return <Navigate to={next} replace />;

  return (
    <div className="max-w-sm mx-auto px-4">
      <h1 className="text-xl font-semibold text-gray-900 text-center">{create ? 'Créer un compte' : 'Connexion'}</h1>
      <p className="text-sm text-gray-500 text-center mt-1 mb-6">
        {create ? 'Un nom et un e-mail suffisent.' : 'Entrez votre e-mail pour accéder à votre compte.'}
      </p>
      <Card className="p-5">
        <SignInForm key={create ? 'create' : 'signin'} create={create} onSignedIn={() => navigate(next, { replace: true })} />
      </Card>
    </div>
  );
};
