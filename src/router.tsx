import React from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { PageWrapper } from './components/layout/PageWrapper';
import { Home } from './pages/Home';
import { SearchResults } from './pages/SearchResults';
import { ProductDetail } from './pages/ProductDetail';
import { BecomeCreator } from './pages/BecomeCreator';
import { Checkout } from './pages/Checkout';
import { LegalLayout } from './pages/legal/LegalLayout';
import { LegalIndex } from './pages/legal/LegalIndex';
import { Kyb } from './pages/legal/Kyb';
import { Termos } from './pages/legal/Termos';
import { Reembolso } from './pages/legal/Reembolso';
import { Privacidade } from './pages/legal/Privacidade';
import { Cookies } from './pages/legal/Cookies';

import { AccountShell } from './components/account/AccountShell';
import { AccountOverview } from './pages/account/AccountOverview';
import { UserFavorites } from './pages/account/UserFavorites';
import { UserPurchases } from './pages/account/UserPurchases';
import { UserFollowing } from './pages/account/UserFollowing';
import { AccountProfile } from './pages/account/AccountProfile';

import { ProDashboardOverview } from './pages/account/ProDashboardOverview';
import { FreelancerServices } from './pages/account/FreelancerServices';
import { CreateServiceView } from './pages/account/CreateServiceView';
import { SellerProducts } from './pages/account/SellerProducts';
import { CreateProductView } from './pages/account/CreateProductView';
import { ProOrders } from './pages/account/ProOrders';
import { ProClients } from './pages/account/ProClients';
import { SellerDownloads } from './pages/account/SellerDownloads';
import { ProRevenue } from './pages/account/ProRevenue';
import { ProWithdrawals } from './pages/account/ProWithdrawals';

import { useAuth } from './context/AuthContext';

const RootRoute: React.FC = () => {
  return (
    <PageWrapper>
      <Home />
    </PageWrapper>
  );
};

const CheckoutRoute: React.FC = () => {
  return <Checkout />;
};

const ProductDetailRoute: React.FC = () => {
  return (
    <PageWrapper>
      <ProductDetail />
    </PageWrapper>
  );
};

const CatchAllRoute: React.FC = () => {
  return <Navigate to="/" replace />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
  },
  {
    path: '/pesquisa',
    element: (
      <PageWrapper>
        <SearchResults />
      </PageWrapper>
    ),
  },
  {
    path: '/produit/:id',
    element: <ProductDetailRoute />,
  },
  {
    path: '/checkout/:id',
    element: <CheckoutRoute />,
  },
  {
    path: '/vendre',
    element: (
      <PageWrapper>
        <BecomeCreator />
      </PageWrapper>
    ),
  },
  {
    path: '/compte',
    element: <AccountShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/compte/explorer" replace />,
      },
      {
        path: 'explorer',
        element: <Home />,
      },
      {
        path: 'dashboard',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'checkout/:id',
        element: <Checkout />,
      },
      {
        path: 'favoris',
        element: <UserFavorites />,
      },
      {
        path: 'achats',
        element: <UserPurchases />,
      },
      {
        path: 'following',
        element: <UserFollowing />,
      },
      {
        path: 'profil',
        element: <AccountProfile />,
      },
    ],
  },
  {
    path: '/dashboard',
    element: <AccountShell />,
    children: [
      {
        index: true,
        element: <ProDashboardOverview />,
      },
      {
        path: 'services',
        element: <FreelancerServices />,
      },
      {
        path: 'services/nouveau',
        element: <CreateServiceView />,
      },
      {
        path: 'produits',
        element: <SellerProducts />,
      },
      {
        path: 'produits/nouveau',
        element: <CreateProductView />,
      },
      {
        path: 'commandes',
        element: <ProOrders />,
      },
      {
        path: 'commandes/:id',
        element: <ProOrders />,
      },
      {
        path: 'clients',
        element: <ProClients />,
      },
      {
        path: 'telechargements',
        element: <SellerDownloads />,
      },
      {
        path: 'revenus',
        element: <ProRevenue />,
      },
      {
        path: 'retraits',
        element: <ProWithdrawals />,
      },
    ],
  },
  {
    path: '/legal',
    element: (
      <PageWrapper>
        <LegalLayout />
      </PageWrapper>
    ),
    children: [
      {
        index: true,
        element: <LegalIndex />,
      },
      {
        path: 'kyb',
        element: <Kyb />,
      },
      {
        path: 'termos',
        element: <Termos />,
      },
      {
        path: 'reembolso',
        element: <Reembolso />,
      },
      {
        path: 'privacidade',
        element: <Privacidade />,
      },
      {
        path: 'cookies',
        element: <Cookies />,
      },
    ],
  },
  {
    path: '*',
    element: <CatchAllRoute />,
  },
]);
