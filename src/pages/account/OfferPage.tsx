import React from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, Page, useBooting } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useBackLink, useScrollTop } from '@/shared/hooks';
import { displayName } from '@/features/session';
import { ListingDetail, ListingSections, useListingView, useSellerListings } from '@/features/catalog';

/**
 * `/ac/explorer/offre/:id`: an offer opened from anywhere in the back-office except the
 * Explorer (which keeps its quick view). Back returns to where the user came from.
 */
export const OfferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const view = useListingView(id);
  const sellerListings = useSellerListings(view?.listing.sellerId);
  const top = useScrollTop<HTMLDivElement>(id);
  const back = useBackLink({ to: ROUTES.account.explorer, label: 'Explorer' });

  if (useBooting() && !view) {
    return (
      <Page title="Offre" back={back}>
        <ListingDetail view={null} />
      </Page>
    );
  }

  if (!view || view.listing.status !== 'published') {
    return (
      <Page title="Offre indisponible" back={back}>
        <EmptyState title="Cette offre n'est plus disponible." />
      </Page>
    );
  }

  const more = sellerListings.filter((v) => v.listing.id !== view.listing.id);
  const sales = sellerListings.reduce((s, v) => s + v.salesCount, 0);

  return (
    <Page
      title={view.listing.title}
      back={back}
    >
      <div ref={top} className="space-y-12">
        <ListingDetail key={id} view={view} sellerSales={sales} />
        {more.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Aussi chez {displayName(view.seller)}</h2>
            <ListingSections views={more} mode="rails" />
          </section>
        )}
      </div>
    </Page>
  );
};
