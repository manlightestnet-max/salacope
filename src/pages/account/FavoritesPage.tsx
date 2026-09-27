import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, LayoutGrid, Rows3 } from 'lucide-react';
import { Button, EmptyState, Page, Segmented, Table, TBody, THead, Td, Th, Tr } from '@/shared/ui';
import { useDb } from '@/shared/db';
import { formatDate, formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { displayName, useCurrentUser } from '@/features/session';
import { FavoriteButton } from '@/features/library';
import {
  KIND_FILTERS,
  KindBadge,
  KindFilter,
  ListingSections,
  ListingThumb,
  usePublishedListings,
} from '@/features/catalog';

type View = 'grid' | 'table';
const VIEW_KEY = 'salacope.favorites.view';

const VIEWS = [
  { value: 'grid', label: 'Grille', icon: LayoutGrid, iconOnly: true },
  { value: 'table', label: 'Tableau', icon: Rows3, iconOnly: true },
] as const;

const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
};

/** `/compte/favoris`: saved offers as covers or as a table (type, price, date saved, buy). */
export const FavoritesPage: React.FC = () => {
  const user = useCurrentUser();
  const favorites = useDb((s) => s.favorites.filter((f) => f.userId === user.id), [user.id]);
  const published = usePublishedListings();
  const [view, setView] = useState<View>(readView);
  const [kind, setKind] = useState<KindFilter>('all');

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // preference only
    }
  }, [view]);

  const rows = useMemo(() => {
    const savedAt = new Map(favorites.map((f) => [f.listingId, f.createdAt]));
    return published
      .filter((v) => savedAt.has(v.listing.id) && (kind === 'all' || v.listing.kind === kind))
      .map((v) => ({ ...v, savedAt: savedAt.get(v.listing.id)! }))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }, [favorites, published, kind]);

  return (
    <Page
      title="Favoris"
      width="full"
      actions={
        favorites.length > 0 && (
          <>
            <Segmented label="Type" value={kind} options={KIND_FILTERS} onChange={setKind} className="hidden sm:inline-flex" />
            <Segmented label="Affichage" value={view} options={VIEWS} onChange={setView} />
          </>
        )
      }
    >
      {favorites.length === 0 ? (
        <EmptyState icon={Heart} title="Aucun favori" action={<Button to={ROUTES.account.explorer}>Explorer le catalogue</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun favori de ce type" />
      ) : view === 'grid' ? (
        <ListingSections views={rows} mode="grids" />
      ) : (
        <Table>
          <THead>
            <Th>Offre</Th>
            <Th className="hidden md:table-cell">Type</Th>
            <Th align="right" className="hidden sm:table-cell">
              Prix
            </Th>
            <Th className="hidden xl:table-cell">Ajouté le</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </THead>
          <TBody>
            {rows.map(({ listing, seller, savedAt }) => (
              <Tr key={listing.id}>
                <Td className="w-full max-w-0">
                  <Link to={ROUTES.account.offer(listing.id)} className="flex items-center gap-3 min-w-0 group">
                    <ListingThumb src={listing.coverImage} category={listing.category} />
                    <div className="min-w-0">
                      <div className="text-gray-900 truncate group-hover:underline underline-offset-2">{listing.title}</div>
                      <div className="text-xs text-gray-500 truncate">
                        <span className="sm:hidden font-medium text-gray-900 tabular-nums">{formatXaf(listing.priceXaf)} · </span>
                        {displayName(seller)}
                      </div>
                    </div>
                  </Link>
                </Td>
                <Td className="hidden md:table-cell">
                  <KindBadge kind={listing.kind} category={listing.category} />
                </Td>
                <Td align="right" className="hidden sm:table-cell font-medium text-gray-900 whitespace-nowrap">
                  {formatXaf(listing.priceXaf)}
                </Td>
                <Td className="hidden xl:table-cell whitespace-nowrap text-gray-500">{formatDate(savedAt)}</Td>
                <Td align="right" className="pl-0 sm:pl-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" variant="primary" to={ROUTES.account.checkout(listing.id)}>
                      {listing.kind === 'service' ? 'Commander' : 'Acheter'}
                    </Button>
                    <FavoriteButton listingId={listing.id} className="shadow-none" />
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Page>
  );
};
