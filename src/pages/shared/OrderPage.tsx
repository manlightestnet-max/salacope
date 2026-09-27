import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { EmptyState, Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { OrderWorkspace, Perspective, perspectiveOf, useOrderView } from '@/features/orders';

/**
 * One page component for `/compte/achats/:id` (buyer) and `/dashboard/ventes/:id` (seller).
 * A party opening the other side's URL is redirected to its own view.
 */
export const OrderPage: React.FC<{ as: Perspective }> = ({ as }) => {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const view = useOrderView(id);
  const perspective = view ? perspectiveOf(view.order, user.id) : null;

  if (!view || !perspective) {
    return (
      <Page
        title="Commande introuvable"
        back={as === 'seller' ? { to: ROUTES.seller.sales, label: 'Ventes' } : { to: ROUTES.account.orders, label: 'Mes achats' }}
      >
        <EmptyState title="Cette commande n'existe pas ou ne vous concerne pas." />
      </Page>
    );
  }
  if (perspective !== as) {
    return <Navigate to={perspective === 'seller' ? ROUTES.seller.sale(view.order.id) : ROUTES.account.order(view.order.id)} replace />;
  }
  return <OrderWorkspace view={view} perspective={perspective} userId={user.id} />;
};
