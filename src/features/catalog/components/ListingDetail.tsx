import React from 'react';
import clsx from 'clsx';
import { Check, Clock, Download, ShieldCheck } from 'lucide-react';
import { Badge, Button, usePane } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { FavoriteButton } from '@/features/library';
import { useSession } from '@/features/session';
import { COVER_FORMAT, ListingView, categoryLabel, deliveryLabel } from '../model';
import { ListingCover } from './ListingCover';
import { SellerCard } from './SellerCard';

/** Full listing content: used by the product page and the quick view. */
export const ListingDetail: React.FC<{ view: ListingView; sellerSales?: number }> = ({ view, sellerSales }) => {
  const { listing, seller } = view;
  const { user } = useSession();
  const isOwn = user?.id === listing.sellerId;
  const isService = listing.kind === 'service';
  // Inside the back-office the purchase happens in the shell too.
  const checkoutHref = usePane() ? ROUTES.account.checkout(listing.id) : ROUTES.checkout(listing.id);

  const format = COVER_FORMAT[listing.category];
  const heading = (
    <div className="min-w-0">
      <Badge className="mb-2">{categoryLabel(listing.category)}</Badge>
      <h1 className="text-2xl font-semibold text-gray-900 leading-tight">{listing.title}</h1>
      <p className="mt-2 text-gray-600">{listing.summary}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div className="min-w-0 space-y-6">
        {format === 'portrait' || format === 'square' ? (
          // Books and square covers sit beside the title, like a product sheet.
          <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
            <ListingCover
              src={listing.coverImage}
              category={listing.category}
              className={clsx('shrink-0 shadow-sm', format === 'portrait' ? 'w-36 sm:w-44' : 'w-44 sm:w-52')}
            />
            {heading}
          </div>
        ) : (
          <>
            <ListingCover src={listing.coverImage} category={listing.category} />
            {heading}
          </>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{listing.description}</p>
        </section>

        {listing.features.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Inclus</h2>
            <ul className="space-y-1.5">
              {listing.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-t border-gray-200 pt-6">
          <SellerCard seller={seller} salesCount={sellerSales} />
        </section>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--sticky-offset,0px)+1.5rem)] self-start">
        <div className="rounded-lg border border-gray-200 bg-surface p-5 space-y-4">
          <div className="text-2xl font-semibold text-gray-900 tabular-nums">{formatXaf(listing.priceXaf)}</div>

          {isOwn ? (
            <Button to={ROUTES.seller.listing(listing.id)} block size="lg">
              Modifier mon offre
            </Button>
          ) : (
            <Button to={checkoutHref} variant="primary" block size="lg">
              {isService ? 'Commander' : 'Acheter'}
            </Button>
          )}
          <FavoriteButton listingId={listing.id} variant="button" className="w-full" />

          <ul className="space-y-2.5 text-sm text-gray-600 pt-1">
            <li className="flex gap-2">
              {isService ? <Clock className="w-4 h-4 mt-0.5 shrink-0" /> : <Download className="w-4 h-4 mt-0.5 shrink-0" />}
              {deliveryLabel(listing)}
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Paiement MTN MoMo ou Airtel Money. Le vendeur est payé après votre validation, ou {PLATFORM.escrowDays} jours
                après la livraison.
              </span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
