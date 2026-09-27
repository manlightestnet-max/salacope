import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Badge, Button, EmptyState, Page } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { LISTING_FORM_ID, ListingEditor, createListing, setListingStatus, updateListing, useManagedListing } from '@/features/listings';
import { displayName } from '@/features/session';

/**
 * `/dashboard/offres/nouvelle`: guided creation, published from the last step.
 * `/dashboard/offres/:id`: same editor, saved from the pinned bar.
 */
export const ListingEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const listing = useManagedListing(id, user.id);
  const navigate = useNavigate();
  const run = useServiceAction();
  const isNew = !id;
  const back = { to: ROUTES.seller.listings, label: 'Offres' };

  if (!isNew && !listing) {
    return (
      <Page title="Offre introuvable" back={back}>
        <EmptyState title="Cette offre n'existe pas ou a été supprimée." />
      </Page>
    );
  }

  const published = listing?.status === 'published';

  return (
    <Page
      back={back}
      title={isNew ? 'Nouvelle offre' : listing!.title}
      meta={
        listing && (
          <span className="ml-2">
            <Badge tone={published ? 'success' : 'neutral'} dot>
              {published ? 'En ligne' : 'Brouillon'}
            </Badge>
          </span>
        )
      }
      actions={
        isNew ? null : (
          <>
            {published && (
              <Button
                size="sm"
                variant="ghost"
                to={ROUTES.account.offer(listing!.id)}
                icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Voir</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() =>
                run(() => setListingStatus(listing!.id, published ? 'draft' : 'published'), published ? 'Offre dépubliée' : 'Offre publiée')
              }
            >
              {published ? 'Dépublier' : 'Publier'}
            </Button>
            <Button size="sm" type="submit" form={LISTING_FORM_ID} variant="primary">
              Enregistrer
            </Button>
          </>
        )
      }
    >
      <ListingEditor
        key={listing?.id ?? 'new'}
        listing={listing}
        sellerName={displayName(user)}
        onSubmit={async (input, publish) => {
          if (isNew) {
            let createdId = '';
            const ok = await run(async () => {
              createdId = (await createListing(input, publish)).id;
            }, publish ? 'Offre publiée' : 'Brouillon enregistré');
            if (ok) navigate(ROUTES.seller.listing(createdId), { replace: true });
          } else {
            await run(() => updateListing(listing!.id, input), 'Modifications enregistrées');
          }
        }}
      />
    </Page>
  );
};
