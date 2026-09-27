import React, { useState } from 'react';
import { MoreHorizontal, Package, Plus } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, List, ListRow, Menu, Page, Tabs } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDate, formatXaf, plural } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { KIND_LABEL, ListingThumb } from '@/features/catalog';
import { ManagedListing, deleteListing, listingHasOrders, setListingStatus, useManagedListings } from '@/features/listings';

type Filter = 'all' | 'published' | 'draft';

export const ListingsPage: React.FC = () => {
  const user = useCurrentUser();
  const listings = useManagedListings(user.id);
  const run = useServiceAction();
  const [filter, setFilter] = useState<Filter>('all');
  const [toDelete, setToDelete] = useState<ManagedListing | null>(null);

  const visible = listings.filter((l) => filter === 'all' || l.listing.status === filter);
  const count = (f: Filter) => listings.filter((l) => f === 'all' || l.listing.status === f).length;

  return (
    <Page
      title="Offres"
      actions={
        <Button to={ROUTES.seller.newListing} variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
          Nouvelle offre
        </Button>
      }
      toolbar={
        listings.length > 0 && (
          <Tabs
            bare
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'Toutes', count: count('all') },
              { value: 'published', label: 'En ligne', count: count('published') },
              { value: 'draft', label: 'Brouillons', count: count('draft') },
            ]}
          />
        )
      }
    >
      {listings.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucune offre"
          description="Un fichier livré au paiement, ou un service livré dans un délai fixé."
          action={<Button to={ROUTES.seller.newListing} variant="primary">Créer une offre</Button>}
        />
      ) : (
        visible.length === 0 ? (
          <EmptyState title="Aucune offre dans cette vue." />
        ) : (
          <List>
            {visible.map((m) => {
              const { listing } = m;
              const published = listing.status === 'published';
              return (
                <ListRow
                  key={listing.id}
                  to={ROUTES.seller.listing(listing.id)}
                  leading={<ListingThumb src={listing.coverImage} category={listing.category} size="md" />}
                  title={listing.title}
                  subtitle={`${KIND_LABEL[listing.kind]} · ${plural(m.sales, 'vente')} · modifiée le ${formatDate(listing.updatedAt)}`}
                  meta={
                    <Badge tone={published ? 'success' : 'neutral'} dot>
                      {published ? 'En ligne' : 'Brouillon'}
                    </Badge>
                  }
                  trailing={
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="font-medium text-gray-900">{formatXaf(listing.priceXaf)}</span>
                      {m.revenue > 0 && <span className="text-xs text-gray-500">{formatXaf(m.revenue)} encaissés</span>}
                    </span>
                  }
                  actions={
                    <Menu
                      items={[
                        { label: 'Modifier', to: ROUTES.seller.listing(listing.id) },
                        ...(published ? [{ label: 'Voir dans le catalogue', to: ROUTES.account.offer(listing.id) }] : []),
                        {
                          label: published ? 'Dépublier' : 'Publier',
                          onSelect: () =>
                            run(
                              () => setListingStatus(listing.id, user.id, published ? 'draft' : 'published'),
                              published ? 'Offre dépubliée' : 'Offre publiée'
                            ),
                        },
                        'divider',
                        { label: 'Supprimer', danger: true, onSelect: () => setToDelete(m) },
                      ]}
                      trigger={({ toggle }) => (
                        <button
                          type="button"
                          onClick={toggle}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
                    />
                  }
                />
              );
            })}
          </List>
        )
      )}

      {toDelete && (
        <ConfirmDialog
          open
          onClose={() => setToDelete(null)}
          {...(listingHasOrders(toDelete.listing.id)
            ? {
                title: 'Cette offre a déjà été vendue',
                description: "Elle ne peut pas être supprimée, car vos clients y ont encore accès. Dépubliez-la pour la retirer du catalogue.",
                confirmLabel: 'Dépublier',
                onConfirm: () => run(() => setListingStatus(toDelete.listing.id, user.id, 'draft'), 'Offre dépubliée'),
              }
            : {
                title: 'Supprimer cette offre ?',
                description: 'Elle sera retirée du catalogue et des favoris. Cette action est définitive.',
                confirmLabel: 'Supprimer',
                danger: true,
                onConfirm: () => run(() => deleteListing(toDelete.listing.id, user.id), 'Offre supprimée'),
              })}
        />
      )}
    </Page>
  );
};
