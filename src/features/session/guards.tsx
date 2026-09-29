import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { useSession } from './hooks';

/** Redirects to sign-in, then back to the requested page. */
export const RequireAuth: React.FC = () => {
  const { isAuthenticated } = useSession();
  const location = useLocation();
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.signIn}?next=${next}`} replace />;
  }
  return <Outlet />;
};

/** Salacope administration: only accounts the server marks as administrators (the API checks again). */
export const RequireAdmin: React.FC = () => {
  const { user } = useSession();
  if (!user?.admin) return <Navigate to={ROUTES.account.explorer} replace />;
  return <Outlet />;
};

/** Seller area: accounts without a store are sent to store onboarding (inside the back-office). */
export const RequireMerchant: React.FC = () => {
  const { isMerchant } = useSession();
  if (!isMerchant) return <Navigate to={ROUTES.account.openStore} replace />;
  return <Outlet />;
};
