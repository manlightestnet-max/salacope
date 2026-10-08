import { useEffect } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

/** In-app path stack (pathname + search), mirrored from the router's navigations. */
const stack: string[] = [];

/** Mount once in the shell: keeps `stack` in step with pushes, replaces and back/forward. */
export const useTrackHistory = () => {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    const path = location.pathname + location.search;
    if (type === 'PUSH' || stack.length === 0) {
      if (stack[stack.length - 1] !== path) stack.push(path);
    } else if (type === 'REPLACE') {
      stack[stack.length - 1] = path;
    } else {
      const i = stack.lastIndexOf(path);
      if (i >= 0) stack.length = i + 1;
      else stack.splice(0, stack.length, path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
};

const { account, seller } = ROUTES;

/** Name of the screen a path belongs to, for the breadcrumb of the back arrow. */
const LABELS: [string, string][] = [
  ['/ac/achats/', 'Commande'],
  ['/dashboard/ventes/', 'Vente'],
  [account.messages, 'Messages'],
  [account.favorites, 'Favoris'],
  [account.following, 'Abonnements'],
  [account.orders, 'Mes achats'],
  [account.support, 'Support'],
  ['/ac/s/', 'Boutique'],
  ['/ac/p/', 'Offre'],
  [account.explorer, 'Explorer'],
  ['/ac/checkout/', 'Paiement'],
  [seller.listings, 'Offres'],
  [seller.sales, 'Ventes'],
  [seller.customers, 'Clients'],
  [seller.payouts, 'Paiements'],
  [seller.root, 'Tableau de bord'],
];

const labelOf = (path: string) => LABELS.find(([prefix]) => path.startsWith(prefix))?.[1];

/**
 * Back arrow of a detail screen reachable from many places: returns to the screen the
 * user actually came from (real history step), or to `fallback` on a direct visit.
 */
export const useBackLink = (fallback: { to: string; label: string }) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const current = pathname + search;
  // Read during render, before the tracker records this navigation: a new page is not
  // in the stack yet (the previous one is on top); a page reached by going back already is.
  const i = stack.lastIndexOf(current);
  const previous = i === -1 ? stack[stack.length - 1] : stack[i - 1];
  const label = previous && labelOf(previous);
  if (!previous || !label) return fallback;
  return { to: previous, label, onClick: () => navigate(-1) };
};
