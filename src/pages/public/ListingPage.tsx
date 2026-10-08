import React from 'react';
import { useParams } from 'react-router-dom';
import { Container, EmptyState, Button, useBooting } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useFreshCatalog } from '@/shared/api';
import { useScrollTop } from '@/shared/hooks';
import { displayName } from '@/features/session';
import { ListingDetail, ListingSections, useListingView, useSellerListings } from '@/features/catalog';

/** Shareable page of a listing (the catalogue uses the quick view instead). */
export const ListingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  useFreshCatalog(true, id); // opening an offer shows what the database says now (price, text, photos, stock of sales)
  const view = useListingView(id);
  const sellerListings = useSellerListings(view?.listing.sellerId);
  const top = useScrollTop<HTMLDivElement>(id);

  if (useBooting() && !view) {
    return (
      <Container className="py-8">
        <div className="max-w-6xl mx-auto">
          <ListingDetail view={null} />
        </div>
      </Container>
    );
  }

  if (!view || view.listing.status !== 'published') {
    return (
      <EmptyState
        className="py-24"
        title="Cette offre n'est plus disponible"
        action={<Button to={ROUTES.search}>Voir le catalogue</Button>}
      />
    );
  }

  const more = sellerListings.filter((v) => v.listing.id !== view.listing.id);
  const sellerSales = sellerListings.reduce((s, v) => s + v.salesCount, 0);

  return (
    <Container className="py-8 space-y-12">
      <div ref={top} className="max-w-6xl mx-auto scroll-mt-24">
        <ListingDetail key={id} view={view} sellerSales={sellerSales} />
      </div>
      {more.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-6">Aussi chez {displayName(view.seller)}</h2>
          <ListingSections views={more} mode="rails" />
        </section>
      )}
    </Container>
  );
};
