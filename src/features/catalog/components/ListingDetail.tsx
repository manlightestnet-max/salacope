import React, { useEffect } from 'react';
import clsx from 'clsx';
import { Check, CheckCircle2, Clock, Download, Eye, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Badge, Button, Pending, Skeleton, usePane } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { useViewPosition } from '@/shared/hooks';
import { plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { FavoriteButton } from '@/features/library';
import { useSession } from '@/features/session';
import { COVER_ASPECT, COVER_FORMAT, ListingView, categoryLabel, deliveryLabel } from '../model';
import { ListingGallery } from './ListingGallery';
import { trackListing, useListingStats } from '../api';
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

/** What visitors can see about the offer, from real figures: seller online, visits, purchases. */
const ListingStats: React.FC<{ listingId?: string }> = ({ listingId }) => {
  const stats = useListingStats(listingId);
  if (stats === null) return null;
  const chip = 'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-gray-200 bg-surface text-xs text-gray-600';
  if (!stats) {
    return (
      <div aria-hidden className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {stats.sellerOnline && (
        <li className={chip} title="Le vendeur est connecté à Salacope">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping motion-reduce:animate-none" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          Vendeur en ligne
        </li>
      )}
      {stats.views > 0 && (
        <li className={chip} title="Visites de cette page">
          <Eye className="w-3.5 h-3.5" />
          {plural(stats.views, 'visite')}
        </li>
      )}
      {stats.purchases > 0 && (
        <li className={chip} title="Commandes passées sur cette offre">
          <ShoppingBag className="w-3.5 h-3.5" />
          {plural(stats.purchases, 'achat')}
        </li>
      )}
    </ul>
  );
};

/**
 * Full listing content: used by the product page and the quick view. Without a `view` (data still arriving) it draws
 * the very same page, each value that depends on the offer painted as shimmer in place.
 * On a phone (`floating`): the cover follows you as a small thumbnail on the right once the gallery has scrolled away,
 * and a buy bar stays at the bottom until the real purchase card comes into view; it never goes past the end of the
 * offer, so it is gone before the suggestions.
 */
export const ListingDetail: React.FC<{ view: ListingView | null; sellerSales?: number; floating?: boolean }> = ({ view, sellerSales, floating = true }) => {
  const pending = !view;
  const { listing, seller } = view ?? { listing: PLACEHOLDER, seller: undefined };
  const P: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) =>
    pending ? <Pending className={className}>{children}</Pending> : <>{children}</>;
  const { user } = useSession();
  const isOwn = user?.id === listing.sellerId;
  const isService = listing.kind === 'service';
  // A digital product is bought once: if it is already theirs, the button leads to the order. A service can be ordered again.
  const owned = useDb(
    (s) => (listing.kind === 'digital' && user ? s.orders.find((o) => o.buyerId === user.id && o.listingId === listing.id && o.status !== 'cancelled') : undefined),
    [listing.id, listing.kind, user?.id]
  );
  // Inside the back-office the purchase happens in the shell too.
  const checkoutHref = usePane() ? ROUTES.account.checkout(listing.id) : ROUTES.checkout(listing.id);
  const stats = useListingStats(pending ? undefined : listing.id);

  const [galleryRef, galleryAt] = useViewPosition<HTMLDivElement>('-64px 0px 0px 0px');
  const [buyRef, buyAt] = useViewPosition<HTMLDivElement>();
  const docked = floating && !pending && galleryAt === 'above';
  const barShown = floating && !pending && !isOwn && buyAt === 'below';

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

  const buy = pending ? (
    <Button block size="lg" disabled variant="primary"><span className="opacity-0">Acheter</span></Button>
  ) : isOwn ? (
    <Button to={ROUTES.seller.listing(listing.id)} block size="lg">
      Modifier mon offre
    </Button>
  ) : owned ? (
    <Button to={ROUTES.account.order(owned.id)} block size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
      Déjà acheté · Ma commande
    </Button>
  ) : (
    <Button to={checkoutHref} variant="primary" block size="lg" onClick={() => trackListing(listing.id, 'click')}>
      {isService ? 'Commander' : 'Acheter'}
    </Button>
  );

  return (
    <div>
      {floating && (
        <div className="lg:hidden sticky top-[var(--sticky-offset,0px)] z-20 h-0">
          <button
            type="button"
            tabIndex={docked ? 0 : -1}
            aria-hidden={!docked}
            aria-label="Revoir les images"
            onClick={() => galleryRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
            className={clsx(
              'absolute right-0 top-2 w-14 h-14 origin-top-right overflow-hidden rounded-xl bg-gray-100 shadow-lg ring-1 ring-gray-950/10 transition duration-300 ease-out motion-reduce:transition-none',
              docked ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            )}
          >
            {!pending && <img src={listing.coverImage} alt="" className="w-full h-full object-cover" />}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="min-w-0 space-y-6">
          {format === 'portrait' || format === 'square' ? (
            // Books and square covers sit beside the title, like a product sheet.
            <div ref={galleryRef} className="flex flex-col sm:flex-row gap-5 sm:items-start">
              {pending ? (
                <Skeleton className={clsx('shrink-0 w-full mx-auto sm:mx-0', COVER_ASPECT[format], format === 'portrait' ? 'max-w-[18rem] sm:w-44' : 'max-w-[20rem] sm:w-52')} />
              ) : (
                <ListingGallery
                  listing={listing}
                  className={clsx('shrink-0 shadow-sm w-full mx-auto sm:mx-0', format === 'portrait' ? 'max-w-[18rem] sm:w-44' : 'max-w-[20rem] sm:w-52')}
                />
              )}
              {heading}
            </div>
          ) : (
            <>
              <div ref={galleryRef}>
                {pending ? (
                  <Skeleton className={clsx('-mx-4 sm:mx-0 rounded-xl', COVER_ASPECT[format])} />
                ) : (
                  <ListingGallery listing={listing} className="-mx-4 sm:mx-0" />
                )}
              </div>
              {heading}
            </>
          )}

          <ListingStats listingId={pending ? undefined : listing.id} />

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
            <SellerCard seller={seller} salesCount={sellerSales} pending={pending} online={stats?.sellerOnline} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--sticky-offset,0px)+1.5rem)] self-start">
          <div ref={buyRef} className="rounded-lg border border-gray-200 bg-surface p-5 space-y-4">
            <P><ListingPrice listing={listing} className="text-2xl font-semibold text-gray-900" /></P>

            {buy}
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

      {floating && (
        // Zero height, pinned to the bottom of the screen while the offer is on screen; it cannot go past the end of this block.
        <div className="lg:hidden sticky bottom-0 z-30 h-0">
          <div
            aria-hidden={!barShown}
            className={clsx(
              'absolute -inset-x-4 bottom-0 flex items-center gap-3 border-t border-gray-200 bg-canvas px-4 py-3 transition duration-300 ease-out motion-reduce:transition-none',
              barShown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
            )}
          >
            <ListingPrice listing={listing} className="shrink-0 text-lg font-semibold text-gray-900" />
            <div className="flex-1 min-w-0">{buy}</div>
          </div>
        </div>
      )}
    </div>
  );
};
