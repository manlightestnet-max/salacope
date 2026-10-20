import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, FileText, Image, Package, Tag, Truck } from 'lucide-react';
import { Badge, Button, EmptyState, List, ListRow, Page, Panel } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { HiddenBadge, LISTING_SECTIONS, ListingSection, sectionSummary, sectionTitle, setListingStatus, useManagedListing } from '@/features/listings';
import { VerificationNotice } from '@/features/verification';

const ICON: Record<ListingSection, React.ElementType> = { informations: Package, description: FileText, images: Image, prix: Tag, livraison: Truck };

const icon = (Icon: React.ElementType) => (
  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
);

/**
 * `/dashboard/offres/:id`: an offer that exists, managed one section at a time. Each row opens its own screen (title and
 * summary, description, images, price and promotion, delivery); publishing and unpublishing stay here. The step-by-step
 * editor is only for creating an offer.
 */
export const ListingManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const listing = useManagedListing(id, user.id);
  const run = useServiceAction();
  const back = { to: ROUTES.seller.listings, label: 'Offres' };

  if (!listing) {
    return (
      <Page title="Offre introuvable" back={back}>
        <EmptyState title="Cette offre n'existe pas ou a été supprimée." />
      </Page>
    );
  }

  const published = listing.status === 'published';

  return (
    <Page
      back={back}
      title={listing.title}
      width="narrow"
      meta={
        <span className="ml-2">
          {listing.hiddenReason ? (
            <HiddenBadge listing={listing} />
          ) : (
            <Badge tone={published ? 'success' : 'neutral'} dot>
              {published ? 'En ligne' : 'Brouillon'}
            </Badge>
          )}
        </span>
      }
      actions={
        <>
          {published && (
            <Button size="sm" variant="ghost" to={ROUTES.account.offer(listing.id)} icon={<ArrowUpRight className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">Voir</span>
            </Button>
          )}
          <Button
            size="sm"
            variant={published ? 'secondary' : 'primary'}
            disabled={Boolean(listing.hiddenReason)}
            title={listing.hiddenReason ? `Masquée par Salacope : ${listing.hiddenReason}` : undefined}
            onClick={() => run(() => setListingStatus(listing.id, published ? 'draft' : 'published'), published ? 'Offre dépubliée' : 'Offre publiée')}
          >
            {published ? 'Dépublier' : 'Publier'}
          </Button>
        </>
      }
    >
      {user.merchant && <VerificationNotice merchant={user.merchant} className="mb-4" />}
      {listing.hiddenReason && (
        <div role="alert" className="mb-4 rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Cette offre a été masquée par Salacope</p>
          <p className="mt-1 whitespace-pre-line break-words">Raison : {listing.hiddenReason}</p>
          <p className="mt-2 text-red-700">Elle n’apparaît plus dans le catalogue et vous ne pouvez pas la republier. Corrigez ce qui est signalé, puis demandez son rétablissement au support.</p>
          <Button className="mt-3" size="sm" variant="secondary" to={`${ROUTES.account.newTicket}?sujet=other`}>
            Contacter le support
          </Button>
        </div>
      )}
      <Panel flush>
        <List>
          {LISTING_SECTIONS.map((section) => {
            const { text, done } = sectionSummary(section, listing);
            return (
              <ListRow
                key={section}
                to={ROUTES.seller.listingSection(listing.id, section)}
                leading={icon(ICON[section])}
                title={sectionTitle(section, listing.kind)}
                subtitle={text}
                meta={
                  done ? (
                    <Badge tone="success" dot>
                      Configuré
                    </Badge>
                  ) : (
                    <Badge>À compléter</Badge>
                  )
                }
              />
            );
          })}
        </List>
      </Panel>
    </Page>
  );
};
