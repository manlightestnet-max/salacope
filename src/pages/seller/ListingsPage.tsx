import React, { useState } from 'react';
import { MoreHorizontal, Package, Plus } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, List, ListRow, Menu, Page, Panel, Segmented } from '@/shared/ui';
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
      help="Vos fichiers et services. Seules les offres en ligne apparaissent dans le catalogue ; une offre déjà vendue ne peut qu’être dépubliée."
      actions={
        <Button to={ROUTES.seller.newListing} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Nouvelle offre
        </Button>
      }
    >
      {listings.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucune offre"
          description="Un fichier livré au paiement, ou un service livré dans un délai fixé."
          action={<Button to={ROUTES.seller.newListing} variant="primary">Créer une offre</Button>}
          className="rounded-2xl border border-gray-200/70 bg-surface"
        />
      ) : (
        <Panel
          title="Vos offres"
          count={visible.length}
          flush
          actions={
            <Segmented
              label="Filtrer"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `Toutes · ${count('all')}` },
                { value: 'published', label: `En ligne · ${count('published')}` },
                { value: 'draft', label: `Brouillons · ${count('draft')}` },
              ]}
            />
          }
        >
          {visible.length === 0 ? (
            <EmptyState title="Aucune offre dans cette vue." />
          ) : (
            <List columns={{ main: 'Offre', meta: 'Statut', trailing: 'Prix', actions: true }}>
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
                                () => setListingStatus(listing.id, published ? 'draft' : 'published'),
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
          )}
        </Panel>
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
                onConfirm: () => run(() => setListingStatus(toDelete.listing.id, 'draft'), 'Offre dépubliée'),
              }
            : {
                title: 'Supprimer cette offre ?',
                description: 'Elle sera retirée du catalogue et des favoris. Cette action est définitive.',
                confirmLabel: 'Supprimer',
                danger: true,
                onConfirm: () => run(() => deleteListing(toDelete.listing.id), 'Offre supprimée'),
              })}
        />
      )}
    </Page>
  );
};
