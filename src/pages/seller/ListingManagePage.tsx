import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, ArrowUpRight, FileText, Image, Package, Tag, Truck } from 'lucide-react';
import { Badge, Button, EmptyState, List, ListRow, Page, Panel } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { Listing } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { fetchGallery } from '@/features/catalog';
import { useCurrentUser } from '@/features/session';
import { VerificationNotice } from '@/features/verification';
import {
  CategoryField,
  DeliveryFields,
  DescriptionFields,
  HiddenBadge,
  InfoFields,
  LISTING_SECTIONS,
  ListingInput,
  ListingSection,
  MediaFields,
  PriceFields,
  isListingSection,
  sectionHelp,
  sectionSummary,
  sectionTitle,
  setListingStatus,
  stepError,
  updateListing,
  useListingForm,
  useManagedListing,
} from '@/features/listings';

const ICON: Record<ListingSection, React.ElementType> = { informations: Package, description: FileText, images: Image, prix: Tag, livraison: Truck };

const icon = (Icon: React.ElementType) => (
  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
);

/** The first thing to fix before saving, and the section it is in. */
const firstProblem = (f: ListingInput, free: boolean): { section: ListingSection; message: string } | undefined => {
  const info = stepError(1, f, free);
  if (info) return { section: info.includes('inclus') ? 'description' : 'informations', message: info };
  const delivery = stepError(2, f, free);
  if (delivery) return { section: 'livraison', message: delivery };
  if (!f.coverImage.trim()) return { section: 'images', message: 'Ajoutez une image de couverture.' };
  const price = stepError(3, f, free);
  if (price) return { section: 'prix', message: price };
  return undefined;
};

/**
 * The page of an offer that exists. Its sections are listed on the left (title and a summary of each, "Configuré" or "À compléter");
 * the one chosen opens on the right, so nothing is reopened step by step. Several sections can be changed before saving once. On a
 * phone the list and the section take turns. The step-by-step editor is only for creating an offer.
 */
const Manage: React.FC<{ listing: Listing; param: ListingSection | undefined; onReset: () => void }> = ({ listing, param, onReset }) => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const run = useServiceAction();
  const { form, setForm, set, featuresText, setFeaturesText, free, setFree, input } = useListingForm(listing);
  const [baseline, setBaseline] = useState(() => JSON.stringify(input()));
  const [problem, setProblem] = useState<{ section: ListingSection; message: string }>();
  const [busy, setBusy] = useState(false);
  const current: ListingSection = param ?? 'informations';
  const open = Boolean(param);
  const published = listing.status === 'published';
  const dirty = JSON.stringify(input()) !== baseline;

  // The gallery is not in the catalogue: it is read when the images are opened (and is then the reference for "changed").
  useEffect(() => {
    if (current !== 'images' || !listing.galleryCount || form.gallery !== undefined) return;
    let live = true;
    void fetchGallery(listing).then((images) => {
      if (!live) return;
      setForm((f) => (f.gallery === undefined ? { ...f, gallery: images } : f));
      setBaseline((b) => JSON.stringify({ ...JSON.parse(b), gallery: images }));
    });
    return () => {
      live = false;
    };
  }, [current, listing, form.gallery, setForm]);

  const save = async () => {
    const found = firstProblem(input(), free);
    if (found) {
      setProblem(found);
      navigate(ROUTES.seller.listingSection(listing.id, found.section), { replace: true });
      return;
    }
    setProblem(undefined);
    setBusy(true);
    const ok = await run(() => updateListing(listing.id, input()), 'Modifications enregistrées');
    setBusy(false);
    if (ok) setBaseline(JSON.stringify(input()));
  };

  return (
    <Page
      fill
      back={{ to: ROUTES.seller.listings, label: 'Offres' }}
      title={listing.title}
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
            variant="secondary"
            disabled={Boolean(listing.hiddenReason)}
            title={listing.hiddenReason ? `Masquée par Salacope : ${listing.hiddenReason}` : undefined}
            onClick={() => run(() => setListingStatus(listing.id, published ? 'draft' : 'published'), published ? 'Offre dépubliée' : 'Offre publiée')}
          >
            {published ? 'Dépublier' : 'Publier'}
          </Button>
          {dirty && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              Annuler
            </Button>
          )}
          <Button size="sm" variant="primary" disabled={!dirty} loading={busy} onClick={() => void save()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4">
        <section className={clsx('min-h-0 overflow-y-auto space-y-4', open && 'hidden lg:block')}>
          {user.merchant && <VerificationNotice merchant={user.merchant} />}
          {listing.hiddenReason && (
            <div role="alert" className="rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-800">
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
                    selected={section === current}
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
        </section>

        <div className={clsx('min-h-0 overflow-y-auto', !open && 'hidden lg:block')}>
          <Link to={ROUTES.seller.listing(listing.id)} className="lg:hidden mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Rubriques
          </Link>
          <Panel title={sectionTitle(current, listing.kind)} description={sectionHelp(current, listing.kind)} bodyClassName="space-y-4">
            {current === 'informations' && (
              <>
                <InfoFields form={form} set={set} />
                <CategoryField form={form} set={set} />
              </>
            )}
            {current === 'description' && <DescriptionFields form={form} set={set} featuresText={featuresText} setFeaturesText={setFeaturesText} />}
            {current === 'images' && <MediaFields form={form} set={set} />}
            {current === 'prix' && <PriceFields form={form} set={set} free={free} setFree={setFree} />}
            {current === 'livraison' && <DeliveryFields form={form} set={set} setForm={setForm} listingId={listing.id} />}
            {problem?.section === current && (
              <p className="text-sm text-red-600" role="alert">
                {problem.message}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
};

/** `/dashboard/offres/:id` and `/dashboard/offres/:id/:section` */
export const ListingManagePage: React.FC = () => {
  const { id, section } = useParams<{ id: string; section?: string }>();
  const user = useCurrentUser();
  const listing = useManagedListing(id, user.id);
  // Bumped to throw away unsaved changes: the form starts again from the saved offer.
  const [rev, setRev] = useState(0);
  if (!listing) {
    return (
      <Page title="Offre introuvable" back={{ to: ROUTES.seller.listings, label: 'Offres' }}>
        <EmptyState title="Cette offre n'existe pas ou a été supprimée." />
      </Page>
    );
  }
  if (section && !isListingSection(section)) return <Navigate to={ROUTES.seller.listing(listing.id)} replace />;
  return <Manage key={`${listing.id}:${rev}`} listing={listing} param={section as ListingSection | undefined} onReset={() => setRev((r) => r + 1)} />;
};
