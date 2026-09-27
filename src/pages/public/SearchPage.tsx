import React, { useEffect, useState } from 'react';
import { Button, Container, Input, SearchField } from '@/shared/ui';
import { CatalogBrowser, CategoryTabs, useCatalogQuery } from '@/features/catalog';

/** Price range applied on submit, next to the sort select. */
const PriceFilter: React.FC = () => {
  const { query, setQuery } = useCatalogQuery();
  const [min, setMin] = useState(query.minPrice ? String(query.minPrice) : '');
  const [max, setMax] = useState(query.maxPrice ? String(query.maxPrice) : '');

  useEffect(() => {
    setMin(query.minPrice ? String(query.minPrice) : '');
    setMax(query.maxPrice ? String(query.maxPrice) : '');
  }, [query.minPrice, query.maxPrice]);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setQuery({ min: min || undefined, max: max || undefined });
      }}
    >
      <Input type="number" inputMode="numeric" placeholder="Prix min" value={min} onChange={(e) => setMin(e.target.value)} className="w-24" aria-label="Prix minimum" />
      <span className="text-gray-400">–</span>
      <Input type="number" inputMode="numeric" placeholder="Prix max" value={max} onChange={(e) => setMax(e.target.value)} className="w-24" aria-label="Prix maximum" />
      <Button type="submit">OK</Button>
    </form>
  );
};

/** `/recherche`: the header search lands here. A field is repeated for small screens (no header search there). */
export const SearchPage: React.FC = () => {
  const { query, setQuery } = useCatalogQuery();
  const [text, setText] = useState(query.text ?? '');
  useEffect(() => setText(query.text ?? ''), [query.text]);

  return (
    <Container className="py-8">
      <h1 className="sr-only">Recherche</h1>
      <SearchField
        value={text}
        onChange={setText}
        onSubmit={() => setQuery({ q: text.trim() || undefined })}
        placeholder="Rechercher"
        className="md:hidden mb-6"
      />
      <CatalogBrowser
        alwaysGrid
        toolbarExtra={<PriceFilter />}
        toolbar={<CategoryTabs value={query.category} onChange={(cat) => setQuery({ cat })} className="-mx-4 px-4 sm:mx-0 sm:px-0" />}
      />
    </Container>
  );
};
