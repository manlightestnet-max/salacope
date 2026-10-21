import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser, displayName } from '@/features/session';
import { ListingEditor, createListing, saveDraft } from '@/features/listings';

/**
 * `/dashboard/offres/nouvelle`: the guided creation of an offer, published from the last step. Once it exists, an offer is
 * managed from its own page (`ListingManagePage`): this editor is never opened on it again.
 */
export const ListingEditorPage: React.FC = () => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const run = useServiceAction();

  return (
    <Page back={{ to: ROUTES.seller.listings, label: 'Offres' }} title="Nouvelle offre">
      <ListingEditor
        sellerName={displayName(user)}
        onSubmit={async (input, publish, draftId) => {
          let createdId = draftId ?? '';
          const ok = await run(async () => {
            // A file sent on the way already opened a draft: it is completed, not created a second time.
            if (draftId) await saveDraft(draftId, input, publish);
            else createdId = (await createListing(input, publish)).id;
          }, publish ? 'Offre publiée' : 'Brouillon enregistré');
          if (ok) navigate(ROUTES.seller.listing(createdId), { replace: true });
        }}
      />
    </Page>
  );
};
