import React from 'react';
import { Container } from '@/shared/ui';
import { SearchView } from '@/features/catalog';

/** `/recherche`: the header search lands here. */
export const SearchPage: React.FC = () => (
  <Container className="py-8">
    <SearchView />
  </Container>
);
