import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Dialog, usePane } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useListingView } from '../hooks';
import { ListingDetail } from './ListingDetail';
import { QUICK_VIEW_PARAM } from './ListingCard';

/** Listing opened over the current catalogue page via `?produit=<id>`. */
export const ListingQuickView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const id = params.get(QUICK_VIEW_PARAM) ?? undefined;
  const view = useListingView(id);
  const inPane = Boolean(usePane());

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete(QUICK_VIEW_PARAM);
    setParams(next, { preventScrollReset: true });
  };

  if (!id) return null;

  return (
    <Dialog
      open
      onClose={close}
      size="xl"
      title={
        view ? (
          <Link
            to={inPane ? ROUTES.account.offer(view.listing.id) : ROUTES.listing(view.listing.id)}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            Ouvrir la page de l'offre <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          'Offre introuvable'
        )
      }
    >
      {view ? <ListingDetail view={view} floating={false} /> : <p className="text-sm text-gray-500">Cette offre n'existe plus.</p>}
    </Dialog>
  );
};
