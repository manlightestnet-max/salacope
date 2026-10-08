import React from 'react';
import { Page } from '@/shared/ui';
import { SearchView } from '@/features/catalog';

/** `/ac/recherche?q=…`: the search screen inside the back-office (the top bar's field lands here). */
export const AccountSearchPage: React.FC = () => (
  <Page title="Recherche" width="full">
    <SearchView />
  </Page>
);
