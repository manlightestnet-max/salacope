import React from 'react';
import { Container } from '@/shared/ui';
import { useFreshCatalog } from '@/shared/api';
import {
  CatalogBrowser,
  CategoryTabs,
  CreatorStrip,
  SellerInvite,
  StorefrontHero,
  useCatalogQuery,
  usePublishedListings,
} from '@/features/catalog';
import { useSession } from '@/features/session';

const CATALOGUE_ID = 'catalogue';

/**
 * Storefront: opening, catalogue by category, top creators, then an invitation to sell.
 * Once a category is picked, only the pinned chips and the results grid remain.
 */
export const HomePage: React.FC = () => {
  const { isMerchant } = useSession();
  useFreshCatalog();
  const views = usePublishedListings();
  const { query, setQuery, hasFilters } = useCatalogQuery();

  return (
    <Container>
      {!hasFilters && <StorefrontHero views={views} catalogueId={CATALOGUE_ID} />}
      <CatalogBrowser
        anchorId={CATALOGUE_ID}
        toolbar={
          <CategoryTabs value={query.category} onChange={(cat) => setQuery({ cat, q: undefined })} className="-mx-4 px-4 sm:mx-0 sm:px-0" />
        }
      />
      {!hasFilters && (
        <>
          <CreatorStrip views={views} className="mt-20" />
          {!isMerchant && <SellerInvite views={views} className="mt-20" />}
        </>
      )}
    </Container>
  );
};
