import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Page } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { CatalogBrowser, CategoryTabs, ListingQuickView, useCatalogQuery } from '@/features/catalog';

/**
 * Storefront inside the back-office: tabs pinned in the page bar, offers open as pages. A text or price search is the
 * search screen's job: old links with `?q=` or a price range are sent there.
 */
export const ExplorerPage: React.FC = () => {
  const { query, setQuery } = useCatalogQuery();
  const { search } = useLocation();

  if (query.text || query.minPrice || query.maxPrice) return <Navigate to={`${ROUTES.account.search}${search}`} replace />;

  return (
    <Page title="Explorer" width="full" toolbar={<CategoryTabs value={query.category} onChange={(cat) => setQuery({ cat })} className="py-2" />}>
      <CatalogBrowser />
      <ListingQuickView />
    </Page>
  );
};
