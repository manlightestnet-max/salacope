import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { RequireAuth, RequireMerchant } from '@/features/session';
import { PublicLayout } from './layouts/PublicLayout';
import { MinimalLayout } from './layouts/MinimalLayout';
import { AppLayout } from './layouts/AppLayout';
import { LegalLayout } from './layouts/LegalLayout';

import { HomePage } from '@/pages/public/HomePage';
import { SearchPage } from '@/pages/public/SearchPage';
import { ListingPage } from '@/pages/public/ListingPage';
import { SellPage } from '@/pages/public/SellPage';
import { PublicStorePage } from '@/pages/public/StorePage';
import { StorePage } from '@/pages/account/StorePage';
import { OfferPage } from '@/pages/account/OfferPage';
import { SignInPage } from '@/pages/public/SignInPage';
import { CheckoutPage } from '@/pages/shared/CheckoutPage';
import { ExplorerPage } from '@/pages/account/ExplorerPage';
import { OpenStorePage } from '@/pages/account/OpenStorePage';
import { CookiePolicy, LegalNotice, PrivacyPolicy, RefundPolicy, Terms } from '@/pages/legal/LegalPages';
import { OrdersPage } from '@/pages/account/OrdersPage';
import { FavoritesPage } from '@/pages/account/FavoritesPage';
import { FollowingPage } from '@/pages/account/FollowingPage';
import { SettingsPage } from '@/pages/account/SettingsPage';
import { SupportPage } from '@/pages/account/SupportPage';
import { NewTicketPage } from '@/pages/account/NewTicketPage';
import { TicketPage } from '@/pages/account/TicketPage';
import { OrderPage } from '@/pages/shared/OrderPage';
import { DashboardPage } from '@/pages/seller/DashboardPage';
import { SalesPage } from '@/pages/seller/SalesPage';
import { ListingsPage } from '@/pages/seller/ListingsPage';
import { ListingEditorPage } from '@/pages/seller/ListingEditorPage';
import { CustomersPage } from '@/pages/seller/CustomersPage';
import { PayoutsPage } from '@/pages/seller/PayoutsPage';
import { PaymentReturnPage } from '@/pages/account/PaymentReturnPage';
import { LightPayCallbackPage } from '@/pages/seller/LightPayCallbackPage';

const NotFound = () => (
  <EmptyState className="py-24" title="Page introuvable" action={<Button to={ROUTES.home}>Retour à l'accueil</Button>} />
);

const RedirectOrder = () => <Navigate to={ROUTES.seller.sale(useParams().id ?? '')} replace />;

/** Previous URLs kept working after the redesign. */
const LEGACY_REDIRECTS: [string, string][] = [
  ['/pesquisa', ROUTES.search],
  ['/compte/following', ROUTES.account.following],
  ['/compte/profil', ROUTES.account.settings],
  ['/dashboard/services', ROUTES.seller.listings],
  ['/dashboard/produits', ROUTES.seller.listings],
  ['/dashboard/services/nouveau', ROUTES.seller.newListing],
  ['/dashboard/produits/nouveau', ROUTES.seller.newListing],
  ['/dashboard/commandes', ROUTES.seller.sales],
  ['/dashboard/telechargements', ROUTES.seller.listings],
  ['/dashboard/revenus', ROUTES.seller.payouts],
  ['/dashboard/retraits', ROUTES.seller.payouts],
  ['/legal/termos', ROUTES.legal.terms],
  ['/legal/reembolso', ROUTES.legal.refund],
  ['/legal/privacidade', ROUTES.legal.privacy],
  ['/legal/kyb', ROUTES.legal.root],
];

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.search, element: <SearchPage /> },
      { path: '/produit/:id', element: <ListingPage /> },
      { path: '/boutique/:id', element: <PublicStorePage /> },
      { path: ROUTES.sell, element: <SellPage /> },
      {
        path: ROUTES.legal.root,
        element: <LegalLayout />,
        children: [
          { index: true, element: <LegalNotice /> },
          { path: 'cgu', element: <Terms /> },
          { path: 'remboursement', element: <RefundPolicy /> },
          { path: 'confidentialite', element: <PrivacyPolicy /> },
          { path: 'cookies', element: <CookiePolicy /> },
        ],
      },
      ...LEGACY_REDIRECTS.map(([from, to]) => ({ path: from, element: <Navigate to={to} replace /> })),
      { path: '/dashboard/commandes/:id', element: <RedirectOrder /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: <MinimalLayout />,
    children: [
      { path: ROUTES.signIn, element: <SignInPage /> },
      { path: '/checkout/:id', element: <CheckoutPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.account.root, element: <Navigate to={ROUTES.account.explorer} replace /> },
          { path: ROUTES.account.explorer, element: <ExplorerPage /> },
          { path: '/compte/explorer/boutique/:id', element: <StorePage /> },
          { path: '/compte/explorer/offre/:id', element: <OfferPage /> },
          { path: '/compte/checkout/:id', element: <CheckoutPage inApp /> },
          { path: ROUTES.paymentReturn, element: <PaymentReturnPage /> },
          { path: ROUTES.lightpayCallback, element: <LightPayCallbackPage /> },
          { path: ROUTES.account.openStore, element: <OpenStorePage /> },
          { path: ROUTES.account.orders, element: <OrdersPage /> },
          { path: '/compte/achats/:id', element: <OrderPage as="buyer" /> },
          { path: ROUTES.account.favorites, element: <FavoritesPage /> },
          { path: ROUTES.account.following, element: <FollowingPage /> },
          { path: ROUTES.account.settings, element: <SettingsPage /> },
          { path: ROUTES.account.support, element: <SupportPage /> },
          { path: ROUTES.account.newTicket, element: <NewTicketPage /> },
          { path: '/compte/support/:id', element: <TicketPage /> },
          {
            element: <RequireMerchant />,
            children: [
              { path: ROUTES.seller.root, element: <DashboardPage /> },
              { path: ROUTES.seller.sales, element: <SalesPage /> },
              { path: '/dashboard/ventes/:id', element: <OrderPage as="seller" /> },
              { path: ROUTES.seller.listings, element: <ListingsPage /> },
              { path: ROUTES.seller.newListing, element: <ListingEditorPage /> },
              { path: '/dashboard/offres/:id', element: <ListingEditorPage /> },
              { path: ROUTES.seller.customers, element: <CustomersPage /> },
              { path: ROUTES.seller.payouts, element: <PayoutsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
