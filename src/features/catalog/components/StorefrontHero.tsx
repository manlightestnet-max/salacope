import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, LucideIcon, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { Button } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { useSession } from '@/features/session';
import { COVER_FORMAT, ListingView } from '../model';
import { CardBreadcrumb, useQuickViewTo } from './ListingCard';
import { ListingPrice } from './ListingPrice';
import { SellerAvatar, SellerLink } from './SellerLink';
import { ShopBanner } from './ShopBanner';
import { ListingCover } from './ListingCover';

interface BuyerPromise {
  id: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}

const PROMISES: BuyerPromise[] = [
  {
    id: 'momo',
    icon: Smartphone,
    label: 'Mobile Money',
    detail: 'Payez avec MTN MoMo ou Airtel Money : vous validez le paiement sur votre téléphone, sans carte bancaire.',
  },
  {
    id: 'instant',
    icon: Zap,
    label: 'Accès immédiat',
    detail: 'E-books, templates et formations sont disponibles dans « Mes achats » dès que le paiement est confirmé.',
  },
  {
    id: 'escrow',
    icon: ShieldCheck,
    label: 'Paiement protégé',
    detail: `Pour un service, le vendeur est payé après la livraison : vous avez ${PLATFORM.serviceValidationDays} jours pour la valider ou signaler un problème.`,
  },
];

/** Buyer guarantees as compact chips; a tap unfolds the explanation, a second tap folds it. */
const StorePromises: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);
  // Keeps the text in place while the panel folds away.
  const [shown, setShown] = useState(PROMISES[0]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PROMISES.map((p) => {
          const active = open === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-expanded={active}
              aria-controls="store-promise"
              onClick={() => {
                setShown(p);
                setOpen(active ? null : p.id);
              }}
              className={clsx(
                'h-9 inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-primary-600/40 bg-primary-50 text-gray-900'
                  : 'border-gray-200 bg-surface text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              <span
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                  active ? 'bg-accent text-on-accent' : 'bg-primary-50 text-primary-700'
                )}
              >
                <p.icon className="w-3.5 h-3.5" />
              </span>
              {p.label}
              <ChevronDown className={clsx('w-3.5 h-3.5 text-gray-400 transition-transform duration-300', active && 'rotate-180')} />
            </button>
          );
        })}
      </div>
      <div
        id="store-promise"
        aria-hidden={!open}
        className={clsx(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <p className="mt-3 max-w-xl rounded-2xl border border-gray-200/60 bg-surface px-4 py-3 text-sm leading-relaxed text-gray-600">
            {shown.detail}
          </p>
        </div>
      </div>
    </div>
  );
};

/** Best seller among wide covers (they suit the hero), else among everything. */
const pickFeatured = (views: ListingView[]) => {
  const wide = views.filter((v) => ['video', 'landscape'].includes(COVER_FORMAT[v.listing.category]));
  return [...(wide.length ? wide : views)].sort(
    (a, b) => b.salesCount - a.salesCount || b.listing.createdAt.localeCompare(a.listing.createdAt)
  )[0];
};

const FeaturedListing: React.FC<{ view: ListingView }> = ({ view: { listing, seller } }) => {
  const to = useQuickViewTo(listing.id);

  return (
    <article className="rounded-[26px] border border-gray-200/60 bg-surface p-3 sm:p-3.5 shadow-sm">
      <Link to={to} preventScrollReset className="group relative block" aria-label={listing.title}>
        <ListingCover bare src={listing.coverImage} category={listing.category} imageClassName="transition-transform duration-700 group-hover:scale-[1.02]" />
        <span className="absolute left-3 top-3 h-7 px-3 rounded-full bg-canvas/75 backdrop-blur text-xs font-medium text-gray-900 flex items-center">
          À la une
        </span>
      </Link>
      <div className="px-2 pt-4 pb-2">
        <CardBreadcrumb listing={listing} />
        <h2 className="mt-2 text-lg sm:text-xl font-semibold leading-snug tracking-tight text-gray-900">
          <Link to={to} preventScrollReset className="hover:text-gray-950">
            {listing.title}
          </Link>
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <SellerAvatar seller={seller} size="sm" />
            <SellerLink seller={seller} className="text-[13.5px] text-gray-500" badgeClassName="w-4 h-4" />
          </div>
          <div className="flex items-center gap-3">
            <ListingPrice listing={listing} className="text-lg font-semibold text-primary-700" />
            <Link
              to={to}
              preventScrollReset
              className="h-10 px-4 rounded-full bg-gray-900 text-canvas text-sm font-semibold inline-flex items-center transition hover:brightness-110"
            >
              Voir l’offre
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

/** Storefront opening: guarantees, promise, calls to action and the offer of the moment. */
export const StorefrontHero: React.FC<{ views: ListingView[]; catalogueId: string }> = ({ views, catalogueId }) => {
  const { isMerchant } = useSession();
  const featured = useMemo(() => pickFeatured(views), [views]);

  return (
    <section className="grid items-start gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] pt-2 pb-12 sm:pt-4 lg:pt-6 lg:pb-14">
      <div>
        <StorePromises />
        <ShopBanner className="mt-5 max-w-[640px]" />
        <h1 className="mt-7 max-w-[720px] text-[38px] sm:text-5xl xl:text-[62px] font-semibold leading-[1.03] tracking-[-0.035em] text-gray-900">
          Formations, e-books et services de{' '}
          <span className="font-serif italic font-normal tracking-[-0.01em] text-primary-700">créateurs du Congo</span>.
        </h1>
        <p className="mt-5 max-w-[560px] text-base sm:text-lg leading-relaxed text-gray-500">
          Payez en MTN MoMo ou Airtel Money. Les fichiers sont disponibles tout de suite ; pour un service, votre paiement reste
          protégé jusqu’à la livraison.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            size="xl"
            pill
            className="w-full sm:w-auto"
            iconRight={<ArrowRight className="w-4 h-4" />}
            onClick={() => document.getElementById(catalogueId)?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explorer le catalogue
          </Button>
          <Button size="xl" pill className="w-full sm:w-auto" to={isMerchant ? ROUTES.seller.root : ROUTES.sell}>
            {isMerchant ? 'Ma boutique' : 'Vendre sur Salacope'}
          </Button>
        </div>
      </div>
      {featured && <FeaturedListing view={featured} />}
    </section>
  );
};
