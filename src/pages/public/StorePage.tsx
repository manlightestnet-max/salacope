import React from 'react';
import { useParams } from 'react-router-dom';
import { Button, Container, EmptyState } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { SellerProfile } from '@/features/catalog';

/** `/boutique/:id`: shareable store page (quick view comes from the public layout). */
export const PublicStorePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const seller = useDb((s) => s.users.find((u) => u.id === id && u.merchant), [id]);

  if (!seller) {
    return <EmptyState className="py-24" title="Cette boutique n'existe pas" action={<Button to={ROUTES.home}>Retour au catalogue</Button>} />;
  }
  return (
    <Container size="lg" className="py-8">
      <SellerProfile seller={seller} />
    </Container>
  );
};
