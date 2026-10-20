import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Page, Panel } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { Listing } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { fetchGallery } from '@/features/catalog';
import { useCurrentUser } from '@/features/session';
import {
  CategoryField,
  DeliveryFields,
  DescriptionFields,
  InfoFields,
  ListingSection,
  MediaFields,
  PriceFields,
  SECTION_STEP,
  isListingSection,
  sectionHelp,
  sectionTitle,
  stepError,
  updateListing,
  useListingForm,
  useManagedListing,
} from '@/features/listings';

const FORM_ID = 'listing-section-form';

/** One section of an existing offer: its own fields, saved on their own, then back to the offer's page. */
const Section: React.FC<{ listing: Listing; section: ListingSection }> = ({ listing, section }) => {
  const navigate = useNavigate();
  const run = useServiceAction();
  const { form, setForm, set, featuresText, setFeaturesText, free, setFree, input } = useListingForm(listing);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const hub = ROUTES.seller.listing(listing.id);

  // The gallery is not in the catalogue: only the images section needs it (the others leave it as it is).
  useEffect(() => {
    if (section !== 'images' || !listing.galleryCount) return;
    let live = true;
    void fetchGallery(listing).then((images) => live && setForm((f) => (f.gallery === undefined ? { ...f, gallery: images } : f)));
    return () => {
      live = false;
    };
  }, [listing, section, setForm]);

  const save = async () => {
    const step = SECTION_STEP[section];
    const problem = (step !== null ? stepError(step, input(), free) : undefined) ?? (section === 'images' && !form.coverImage.trim() ? 'Ajoutez une image de couverture.' : undefined);
    if (problem) {
      setError(problem);
      return;
    }
    setError(undefined);
    setBusy(true);
    const ok = await run(() => updateListing(listing.id, input()), 'Modifications enregistrées');
    setBusy(false);
    if (ok) navigate(hub, { replace: true });
  };

  return (
    <Page
      title={sectionTitle(section, listing.kind)}
      width="narrow"
      back={{ to: hub, label: listing.title }}
      actions={
        <Button size="sm" type="submit" form={FORM_ID} variant="primary" loading={busy}>
          Enregistrer
        </Button>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Panel description={sectionHelp(section, listing.kind)} bodyClassName="space-y-4">
          {section === 'informations' && (
            <>
              <InfoFields form={form} set={set} />
              <CategoryField form={form} set={set} />
            </>
          )}
          {section === 'description' && <DescriptionFields form={form} set={set} featuresText={featuresText} setFeaturesText={setFeaturesText} />}
          {section === 'images' && <MediaFields form={form} set={set} />}
          {section === 'prix' && <PriceFields form={form} set={set} free={free} setFree={setFree} />}
          {section === 'livraison' && <DeliveryFields form={form} set={set} setForm={setForm} listingId={listing.id} />}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </Panel>
      </form>
    </Page>
  );
};

/** `/dashboard/offres/:id/:section` */
export const ListingSectionPage: React.FC = () => {
  const { id, section } = useParams<{ id: string; section: string }>();
  const user = useCurrentUser();
  const listing = useManagedListing(id, user.id);
  if (!listing) {
    return (
      <Page title="Offre introuvable" back={{ to: ROUTES.seller.listings, label: 'Offres' }}>
        <EmptyState title="Cette offre n'existe pas ou a été supprimée." />
      </Page>
    );
  }
  if (!isListingSection(section)) return <Navigate to={ROUTES.seller.listing(listing.id)} replace />;
  return <Section key={`${listing.id}:${section}`} listing={listing} section={section} />;
};
