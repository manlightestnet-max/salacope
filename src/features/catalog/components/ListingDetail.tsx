import React, { useEffect } from 'react';
import clsx from 'clsx';
import { Check, Clock, Download, ShieldCheck } from 'lucide-react';
import { Badge, Button, Pending, Skeleton, usePane } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { FavoriteButton } from '@/features/library';
import { useSession } from '@/features/session';
import { COVER_ASPECT, COVER_FORMAT, ListingView, categoryLabel, deliveryLabel } from '../model';
import { ListingGallery } from './ListingGallery';
import { trackListing } from '../api';
import { ListingPrice } from './ListingPrice';
import { SellerCard } from './SellerCard';

/** What the page is drawn with until the offer is known: only its text sizes count, it is painted as shimmer. */
const PLACEHOLDER: ListingView['listing'] = {
  id: '',
  sellerId: '',
  kind: 'digital',
  category: 'ebook',
  title: 'Titre de l’offre qui peut tenir sur deux lignes',
  summary: 'Résumé de l’offre en une ou deux phrases, tel qu’il apparaîtra sous le titre.',
  description: 'Description complète de l’offre. Elle occupe plusieurs lignes, comme le vrai texte. Elle continue ici sur une autre ligne pour garder la hauteur de la page.',
  features: [],
  priceXaf: 25000,
  coverImage: '',
  status: 'published',
  createdAt: '',
  updatedAt: '',
};

/**
 * Full listing content: used by the product page and the quick view. Without a `view` (data still arriving) it draws
 * the very same page, each value that depends on the offer painted as shimmer in place.
 */
export const ListingDetail: React.FC<{ view: ListingView | null; sellerSales?: number }> = ({ view, sellerSales }) => {
  const pending = !view;
  const { listing, seller } = view ?? { listing: PLACEHOLDER, seller: undefined };
  const P: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) =>
    pending ? <Pending className={className}>{children}</Pending> : <>{children}</>;
  const { user } = useSession();
  const isOwn = user?.id === listing.sellerId;
  const isService = listing.kind === 'service';
  // Inside the back-office the purchase happens in the shell too.
  const checkoutHref = usePane() ? ROUTES.account.checkout(listing.id) : ROUTES.checkout(listing.id);

  const format = COVER_FORMAT[listing.category];
  // Insights for the seller: one view per visit (never their own).
  useEffect(() => {
    if (!pending && !isOwn) trackListing(listing.id, 'view');
  }, [listing.id, isOwn, pending]);
  const heading = (
    <div className="min-w-0">
      <Badge className="mb-2"><P>{categoryLabel(listing.category)}</P></Badge>
      <h1 className="text-2xl font-semibold text-gray-900 leading-tight"><P>{listing.title}</P></h1>
      <p className="mt-2 text-gray-600"><P>{listing.summary}</P></p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div className="min-w-0 space-y-6">
        {format === 'portrait' || format === 'square' ? (
          // Books and square covers sit beside the title, like a product sheet.
          <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
            {pending ? (
              <Skeleton className={clsx('shrink-0 w-full mx-auto sm:mx-0', COVER_ASPECT[format], format === 'portrait' ? 'max-w-[18rem] sm:w-44' : 'max-w-[20rem] sm:w-52')} />
            ) : (
              <ListingGallery
                listing={listing}
                className={clsx(
                  'shrink-0 shadow-sm w-full mx-auto sm:mx-0 animate-fade-up motion-reduce:animate-none',
                  format === 'portrait' ? 'max-w-[18rem] sm:w-44' : 'max-w-[20rem] sm:w-52'
                )}
              />
            )}
            {heading}
          </div>
        ) : (
          <>
            {pending ? (
              <Skeleton className={clsx('-mx-4 sm:mx-0 rounded-xl', COVER_ASPECT[format])} />
            ) : (
              <ListingGallery listing={listing} className="-mx-4 sm:mx-0 animate-fade-up motion-reduce:animate-none" />
            )}
            {heading}
          </>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line"><P>{listing.description}</P></p>
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
          <SellerCard seller={seller} salesCount={sellerSales} pending={pending} />
        </section>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--sticky-offset,0px)+1.5rem)] self-start">
        <div className="rounded-lg border border-gray-200 bg-surface p-5 space-y-4">
          <P><ListingPrice listing={listing} className="text-2xl font-semibold text-gray-900" /></P>

          {pending ? (
            <Button block size="lg" disabled variant="primary"><span className="opacity-0">Acheter</span></Button>
          ) : isOwn ? (
            <Button to={ROUTES.seller.listing(listing.id)} block size="lg">
              Modifier mon offre
            </Button>
          ) : (
            <Button to={checkoutHref} variant="primary" block size="lg" onClick={() => trackListing(listing.id, 'click')}>
              {isService ? 'Commander' : 'Acheter'}
            </Button>
          )}
          {pending ? <Skeleton className="h-10 w-full rounded-lg" /> : <FavoriteButton listingId={listing.id} variant="button" className="w-full" />}

          <ul className="space-y-2.5 text-sm text-gray-600 pt-1">
            <li className="flex gap-2">
              {isService ? <Clock className="w-4 h-4 mt-0.5 shrink-0" /> : <Download className="w-4 h-4 mt-0.5 shrink-0" />}
              <P>{deliveryLabel(listing)}</P>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Paiement MTN MoMo ou Airtel Money.{' '}
                <P>
                  {listing.kind === 'digital'
                    ? `Accès immédiat ; le vendeur est payé ${PLATFORM.digitalHoldDays} jours plus tard si vous ne signalez aucun problème.`
                    : `Le vendeur est payé après votre validation, ou ${PLATFORM.serviceValidationDays} jours après la livraison.`}
                </P>
              </span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

