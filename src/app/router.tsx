import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { isAdminHost } from '@/shared/config/hosts';
import { RequireAdmin, RequireAuth, RequireMerchant } from '@/features/session';
import { PublicLayout } from './layouts/PublicLayout';
import { MinimalLayout } from './layouts/MinimalLayout';
import { AdminLayout, AppLayout } from './layouts/AppLayout';
import { RouteError } from './RouteError';
import { LegalLayout } from './layouts/LegalLayout';

import { HomePage } from '@/pages/public/HomePage';
import { SearchPage } from '@/pages/public/SearchPage';
import { ListingPage } from '@/pages/public/ListingPage';
import { SellPage } from '@/pages/public/SellPage';
import { PublicStorePage } from '@/pages/public/StorePage';
import { StorePage } from '@/pages/account/StorePage';
import { MessagesPage } from '@/pages/account/MessagesPage';
import { OfferPage } from '@/pages/account/OfferPage';
import { SignInPage } from '@/pages/public/SignInPage';
import { CheckoutPage } from '@/pages/shared/CheckoutPage';
import { ExplorerPage } from '@/pages/account/ExplorerPage';
import { AccountSearchPage } from '@/pages/account/AccountSearchPage';
import { OpenStorePage } from '@/pages/account/OpenStorePage';
import { AccountDeletion, AmlPolicy, CookiePolicy, LegalNotice, PrivacyPolicy, RefundPolicy, Terms } from '@/pages/legal/LegalPages';
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
import { ListingManagePage } from '@/pages/seller/ListingManagePage';
import { CustomersPage } from '@/pages/seller/CustomersPage';
import { PayoutsPage } from '@/pages/seller/PayoutsPage';
import { PaymentReturnPage } from '@/pages/account/PaymentReturnPage';
import { LightPayCallbackPage } from '@/pages/seller/LightPayCallbackPage';
import { VerificationPage } from '@/pages/seller/VerificationPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminSellersPage } from '@/pages/admin/AdminSellersPage';
import { AdminSellerPage } from '@/pages/admin/AdminSellerPage';
import { AdminUserPage } from '@/pages/admin/AdminUserPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';
import { AdminBannersPage } from '@/pages/admin/AdminBannersPage';
import { AdminStoragePage } from '@/pages/admin/AdminStoragePage';
import { AdminStorageSectionPage } from '@/pages/admin/AdminStorageSectionPage';
import { AdminSupportPage } from '@/pages/admin/AdminSupportPage';
import { AdminDisputesPage } from '@/pages/admin/AdminDisputesPage';
import { AdminNewDisputePage } from '@/pages/admin/AdminNewDisputePage';
import { AdminFundsPage } from '@/pages/admin/AdminFundsPage';
import { DisputesPage } from '@/pages/seller/DisputesPage';
import { CustomerPage } from '@/pages/seller/CustomerPage';
import { AdminLaunchBannerPage } from '@/pages/admin/AdminLaunchBannerPage';
import { AdminSecurityPage } from '@/pages/admin/AdminSecurityPage';
import { AdminIdentityFieldPage } from '@/pages/admin/AdminIdentityFieldPage';
import { AdminIdentityPage } from '@/pages/admin/AdminIdentityPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminExplorePage } from '@/pages/admin/AdminExplorePage';
import { AdminMessagePage, AdminMessagesPage } from '@/pages/admin/AdminMessagesPage';
import { AdminSettingsSectionPage } from '@/pages/admin/AdminSettingsSectionPage';
import { AdminFundPage } from '@/pages/admin/AdminFundPage';
import { AdminTicketPage } from '@/pages/admin/AdminTicketPage';

const NotFound = () => (
  <EmptyState className="py-24" title="Page introuvable" action={<Button to={ROUTES.home}>Retour à l'accueil</Button>} />
);

/** Old address of an offer or store → the short one, same id. */
const RedirectParam = ({ to }: { to: (id: string) => string }) => <Navigate to={to(useParams().id ?? '')} replace />;

/** Old `/compte/…` addresses (bookmarks, notifications already sent) → `/ac/…`, same rest of the path and query. */
const RedirectAccount = () => {
  const { search, hash } = useLocation();
  const rest = useParams()['*'] ?? '';
  return <Navigate to={`${ROUTES.account.root}${rest ? `/${rest}` : ''}${search}${hash}`} replace />;
};

const RedirectOrder = () => <Navigate to={ROUTES.seller.sale(useParams().id ?? '')} replace />;

/** Previous URLs kept working after the redesign. */
const LEGACY_REDIRECTS: [string, string][] = [
  ['/pesquisa', ROUTES.search],
  ['/ac/following', ROUTES.account.following],
  ['/ac/profil', ROUTES.account.settings],
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
    errorElement: <RouteError />,
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, element: isAdminHost() ? <Navigate to={ROUTES.admin.root} replace /> : <HomePage /> },
      { path: ROUTES.search, element: <SearchPage /> },
      { path: '/p/:id', element: <ListingPage /> },
      { path: '/produit/:id', element: <RedirectParam to={ROUTES.listing} /> },
      { path: '/s/:id', element: <PublicStorePage /> },
      { path: '/boutique/:id', element: <RedirectParam to={ROUTES.store} /> },
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
          { path: 'lutte-anti-blanchiment', element: <AmlPolicy /> },
          { path: 'suppression-compte', element: <AccountDeletion /> },
        ],
      },
      { path: '/compte', element: <RedirectAccount /> },
      { path: '/compte/*', element: <RedirectAccount /> },
      ...LEGACY_REDIRECTS.map(([from, to]) => ({ path: from, element: <Navigate to={to} replace /> })),
      { path: '/dashboard/commandes/:id', element: <RedirectOrder /> },
      // salacope.online/@handle (verified stores); other one-segment addresses show "not found".
      { path: '/:handle', element: <PublicStorePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    errorElement: <RouteError />,
    element: <MinimalLayout />,
    children: [
      { path: ROUTES.signIn, element: <SignInPage /> },
      { path: '/checkout/:id', element: <CheckoutPage /> },
    ],
  },
  {
    errorElement: <RouteError />,
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.account.root, element: <Navigate to={ROUTES.account.explorer} replace /> },
          { path: ROUTES.account.explorer, element: <ExplorerPage /> },
          { path: ROUTES.account.search, element: <AccountSearchPage /> },
          { path: '/ac/s/:id', element: <StorePage /> },
          { path: '/ac/p/:id', element: <OfferPage /> },
          { path: '/ac/explorer/boutique/:id', element: <RedirectParam to={ROUTES.account.store} /> },
          { path: '/ac/explorer/offre/:id', element: <RedirectParam to={ROUTES.account.offer} /> },
          { path: '/ac/checkout/:id', element: <CheckoutPage inApp /> },
          { path: ROUTES.paymentReturn, element: <PaymentReturnPage /> },
          { path: ROUTES.lightpayCallback, element: <LightPayCallbackPage /> },
          { path: ROUTES.account.openStore, element: <OpenStorePage /> },
          { path: ROUTES.account.messages, element: <MessagesPage /> },
          { path: '/ac/messages/:id', element: <MessagesPage /> },
          { path: ROUTES.account.orders, element: <OrdersPage /> },
          { path: '/ac/achats/:id', element: <OrderPage as="buyer" /> },
          { path: ROUTES.account.favorites, element: <FavoritesPage /> },
          { path: ROUTES.account.following, element: <FollowingPage /> },
          { path: ROUTES.account.settings, element: <SettingsPage /> },
          { path: ROUTES.account.disputes, element: <DisputesPage as="buyer" /> },
          { path: '/ac/litiges/:id', element: <DisputesPage as="buyer" /> },
          { path: ROUTES.account.support, element: <SupportPage /> },
          { path: ROUTES.account.newTicket, element: <NewTicketPage /> },
          { path: '/ac/support/:id', element: <TicketPage /> },
          {
            element: <RequireMerchant />,
            children: [
              { path: ROUTES.seller.root, element: <DashboardPage /> },
              { path: ROUTES.seller.sales, element: <SalesPage /> },
              { path: '/dashboard/ventes/:id', element: <OrderPage as="seller" /> },
              { path: ROUTES.seller.listings, element: <ListingsPage /> },
              { path: ROUTES.seller.newListing, element: <ListingEditorPage /> },
              { path: '/dashboard/offres/:id/:section?', element: <ListingManagePage /> },
              { path: ROUTES.seller.customers, element: <CustomersPage /> },
              { path: '/dashboard/clients/:id', element: <CustomerPage /> },
              { path: ROUTES.seller.payouts, element: <PayoutsPage /> },
              { path: ROUTES.seller.verification, element: <VerificationPage /> },
              { path: ROUTES.seller.disputes, element: <DisputesPage as="seller" /> },
              { path: '/dashboard/litiges/:id', element: <DisputesPage as="seller" /> },
            ],
          },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: ROUTES.admin.root, element: <AdminOverviewPage /> },
              { path: ROUTES.admin.sellers, element: <AdminSellersPage /> },
              { path: '/admin/vendeurs/:id', element: <AdminSellerPage /> },
              { path: ROUTES.admin.users, element: <AdminUsersPage /> },
              { path: '/admin/acs/:id', element: <AdminUserPage /> },
              { path: ROUTES.admin.audit, element: <AdminAuditPage /> },
              { path: ROUTES.admin.banners, element: <AdminBannersPage /> },
              { path: ROUTES.admin.storage, element: <AdminStoragePage /> },
              { path: '/admin/stockage/:section', element: <AdminStorageSectionPage /> },
              { path: ROUTES.admin.launchBanner, element: <AdminLaunchBannerPage /> },
              { path: ROUTES.admin.security, element: <AdminSecurityPage /> },
              { path: ROUTES.admin.settings, element: <AdminSettingsPage /> },
              { path: '/admin/parametres/identite', element: <AdminIdentityPage /> },
              { path: '/admin/parametres/explorer', element: <AdminExplorePage /> },
              { path: '/admin/parametres/messages', element: <AdminMessagesPage /> },
              { path: '/admin/parametres/messages/:event', element: <AdminMessagePage /> },
              { path: '/admin/parametres/identite/:champ', element: <AdminIdentityFieldPage /> },
              { path: '/admin/parametres/:section', element: <AdminSettingsSectionPage /> },
              { path: ROUTES.admin.disputes, element: <AdminDisputesPage /> },
              { path: ROUTES.admin.newDispute, element: <AdminNewDisputePage /> },
              { path: '/admin/litiges/:id', element: <AdminDisputesPage /> },
              { path: ROUTES.admin.funds, element: <AdminFundsPage /> },
              { path: '/admin/fonds/:id', element: <AdminFundPage /> },
              { path: ROUTES.admin.support, element: <AdminSupportPage /> },
              { path: '/admin/support/:id', element: <AdminTicketPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
