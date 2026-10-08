import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button, Container, EmptyState, SkeletonStore, useBooting } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { SellerProfile } from '@/features/catalog';

/**
 * `/boutique/:id` and `/@handle` (verified stores): shareable store page (quick view comes
 * from the public layout). Any other one-segment address is not a page.
 */
export const PublicStorePage: React.FC = () => {
  const { id, handle } = useParams<{ id?: string; handle?: string }>();
  const at = handle?.startsWith('@') ? handle.slice(1).toLowerCase() : undefined;
  const seller = useDb(
    (s) => s.users.find((u) => u.merchant && (at ? u.merchant.verified && u.merchant.handle?.toLowerCase() === at : u.id === id)),
    [id, at]
  );

  const booting = useBooting();
  if (booting && !seller) return <Container size="lg" className="py-8"><SkeletonStore /></Container>;

  if (handle && !at) {
    return <EmptyState className="py-24" title="Page introuvable" action={<Button to={ROUTES.home}>Retour à l'accueil</Button>} />;
  }

  if (!seller) {
    return <EmptyState className="py-24" title="Cette boutique n'existe pas" action={<Button to={ROUTES.home}>Retour au catalogue</Button>} />;
  }
  // A store with a verified @name has one address: salacope.online/@name.
  if (!at && seller.merchant?.verified && seller.merchant.handle) {
    return <Navigate to={ROUTES.storeHandle(seller.merchant.handle)} replace />;
  }
  return (
    <Container size="lg" className="py-8">
      <SellerProfile seller={seller} />
    </Container>
  );
};
