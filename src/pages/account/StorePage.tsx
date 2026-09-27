import React from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, Page } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { useBackLink } from '@/shared/hooks';
import { displayName } from '@/features/session';
import { SellerProfile } from '@/features/catalog';

/** `/compte/explorer/boutique/:id`: a store's page inside the back-office. */
export const StorePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const seller = useDb((s) => s.users.find((u) => u.id === id && u.merchant), [id]);
  const back = useBackLink({ to: ROUTES.account.explorer, label: 'Explorer' });

  if (!seller) {
    return (
      <Page title="Boutique introuvable" back={back}>
        <EmptyState title="Cette boutique n'existe pas ou n'est plus active." />
      </Page>
    );
  }

  return (
    <Page title={displayName(seller)} back={back}>
      <SellerProfile seller={seller} />
    </Page>
  );
};
