import React from 'react';
import { Page } from '@/shared/ui';
import { CatalogBrowser, CategoryTabs, ListingQuickView, useCatalogQuery } from '@/features/catalog';

/** Storefront inside the back-office: tabs pinned in the page bar, search in the top bar, offers open over the pane. */
export const ExplorerPage: React.FC = () => {
  const { query, setQuery } = useCatalogQuery();

  return (
    <Page
      title={query.text ? `« ${query.text} »` : 'Explorer'}
      width="full"
      toolbar={<CategoryTabs value={query.category} onChange={(cat) => setQuery({ cat })} className="py-2" />}
    >
      <CatalogBrowser />
      <ListingQuickView />
    </Page>
  );
};
