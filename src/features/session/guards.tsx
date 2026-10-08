import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { ADMIN_HOST, isPublicHost } from '@/shared/config/hosts';
import { auth, guest } from '@/shared/api';
import { useBooting } from '@/shared/ui';
import { useSession } from './hooks';

/** Redirects to sign-in, then back to the requested page. */
const SHARED = /^\/ac\/(p|s)\/([^/]+)\/?$/;

export const RequireAuth: React.FC = () => {
  const { isAuthenticated } = useSession();
  const location = useLocation();
  const booting = useBooting();
  // A shared link to an offer or a store (/ac/p/…, /ac/s/…) opened by someone without an account goes straight to the
  // public page of the same offer or store: nobody is stopped by a sign-in wall on a link a friend sent them.
  const shared = SHARED.exec(location.pathname);
  const publicPage = shared && (shared[1] === 'p' ? ROUTES.listing(shared[2]) : ROUTES.store(shared[2]));
  if (publicPage && !auth.signedIn() && !guest.key()) return <Navigate to={`${publicPage}${location.search}`} replace />;
  if (booting) return <Outlet />; // the real screen draws now; the answer decides afterwards
  if (!isAuthenticated) {
    if (publicPage) return <Navigate to={`${publicPage}${location.search}`} replace />;
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.signIn}?next=${next}`} replace />;
  }
  return <Outlet />;
};

/** Salacope administration: only accounts the server marks as administrators (the API checks again). */
export const RequireAdmin: React.FC = () => {
  const { user } = useSession();
  const location = useLocation();
  if (useBooting()) return <Outlet />;
  // On the public site, the administration lives at its own address.
  if (isPublicHost()) {
    window.location.replace(`https://${ADMIN_HOST}${location.pathname}${location.search}`);
    return null;
  }
  if (!user?.admin) return <Navigate to={ROUTES.account.explorer} replace />;
  return <Outlet />;
};

/** Seller area: accounts without a store are sent to store onboarding (inside the back-office). */
export const RequireMerchant: React.FC = () => {
  const { isMerchant } = useSession();
  if (useBooting()) return <Outlet />;
  if (!isMerchant) return <Navigate to={ROUTES.account.openStore} replace />;
  return <Outlet />;
};
