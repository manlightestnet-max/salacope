import { createId, nowIso } from '@/shared/lib';
import { PLATFORM } from '@/shared/config/platform';
import { BriefQuestion, Category, Database, DomainError, Listing, ListingKind, db, replaceById } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { NotifyInput, withNotifications } from '@/features/notifications';

export interface ListingInput {
  kind: ListingKind;
  category: Category;
  title: string;
  summary: string;
  description: string;
  features: string[];
  priceXaf: number;
  coverImage: string;
  deliveryDays?: number;
  /** Services: revisions included. */
  revisions?: number;
  /** Services: questions answered by the buyer at checkout. */
  briefQuestions?: BriefQuestion[];
  fileName?: string;
  fileFormat?: string;
}

export const MAX_BRIEF_QUESTIONS = 6;

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80';

const validate = (input: ListingInput) => {
  if (input.title.trim().length < 8) throw new DomainError('Le titre doit faire au moins 8 caractères.');
  if (!input.summary.trim()) throw new DomainError('Ajoutez un résumé en une phrase.');
  if (!Number.isFinite(input.priceXaf) || input.priceXaf < PLATFORM.minPriceXaf) {
    throw new DomainError(`Le prix minimum est de ${PLATFORM.minPriceXaf} FCFA.`);
  }
  if (input.kind === 'service' && (!input.deliveryDays || input.deliveryDays < 1)) {
    throw new DomainError('Indiquez un délai de livraison en jours.');
  }
  if (input.kind === 'digital' && !input.fileName?.trim()) throw new DomainError('Indiquez le fichier livré au client.');
  if (input.kind === 'service') {
    const revisions = input.revisions ?? 0;
    if (!Number.isInteger(revisions) || revisions < 0 || revisions > PLATFORM.maxRevisions) {
      throw new DomainError(`Les retouches incluses vont de 0 à ${PLATFORM.maxRevisions}.`);
    }
    const questions = (input.briefQuestions ?? []).filter((q) => q.label.trim());
    if (questions.length > MAX_BRIEF_QUESTIONS) throw new DomainError(`${MAX_BRIEF_QUESTIONS} questions au maximum.`);
    if (questions.some((q) => q.label.trim().length > 120)) throw new DomainError('Une question dépasse 120 caractères.');
  }
};

const toFields = (input: ListingInput) => ({
  kind: input.kind,
  category: input.category,
  title: input.title.trim(),
  summary: input.summary.trim(),
  description: input.description.trim(),
  features: input.features.map((f) => f.trim()).filter(Boolean),
  priceXaf: Math.round(input.priceXaf),
  coverImage: input.coverImage.trim() || DEFAULT_COVER,
  deliveryDays: input.kind === 'service' ? input.deliveryDays : undefined,
  revisions: input.kind === 'service' ? input.revisions ?? 0 : undefined,
  briefQuestions:
    input.kind === 'service'
      ? (input.briefQuestions ?? []).filter((q) => q.label.trim()).map((q) => ({ ...q, label: q.label.trim() }))
      : undefined,
  file: input.kind === 'digital' ? { name: input.fileName!.trim(), format: input.fileFormat?.trim() || 'PDF' } : undefined,
});

const ownedListing = (listingId: string, sellerId: string): Listing => {
  const listing = db.get().listings.find((l) => l.id === listingId);
  if (!listing || listing.sellerId !== sellerId) throw new DomainError('Offre introuvable.');
  return listing;
};

/** Everyone following the store hears about a new offer going online. */
const followerNotices = (state: Database, listing: Listing): NotifyInput[] => {
  const seller = state.users.find((u) => u.id === listing.sellerId);
  const store = seller?.merchant?.storeName ?? seller?.name ?? 'Une boutique';
  return state.follows
    .filter((f) => f.sellerId === listing.sellerId)
    .map((f) => ({
      userId: f.userId,
      title: `Nouvelle offre de ${store}`,
      body: listing.title,
      href: `${ROUTES.account.following}?boutique=${listing.sellerId}`,
    }));
};

export function createListing(sellerId: string, input: ListingInput, publish: boolean): Listing {
  const seller = db.get().users.find((u) => u.id === sellerId);
  if (!seller?.merchant) throw new DomainError('Activez votre boutique pour publier une offre.');
  validate(input);
  const now = nowIso();
  const listing: Listing = {
    id: createId('lst'),
    sellerId,
    ...toFields(input),
    status: publish ? 'published' : 'draft',
    publishedAt: publish ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  db.update((s) => withNotifications({ ...s, listings: [listing, ...s.listings] }, publish ? followerNotices(s, listing) : []));
  return listing;
}

/** Past orders keep their own snapshot, so edits never change what was sold. */
export function updateListing(listingId: string, sellerId: string, input: ListingInput): void {
  ownedListing(listingId, sellerId);
  validate(input);
  db.update((s) => ({
    ...s,
    listings: replaceById(s.listings, listingId, (l) => ({ ...l, ...toFields(input), updatedAt: nowIso() })),
  }));
}

export function setListingStatus(listingId: string, sellerId: string, status: Listing['status']): void {
  const current = ownedListing(listingId, sellerId);
  const goesOnline = status === 'published' && current.status !== 'published';
  const now = nowIso();
  const updated: Listing = { ...current, status, updatedAt: now, publishedAt: goesOnline ? now : current.publishedAt };
  db.update((s) =>
    withNotifications(
      { ...s, listings: replaceById(s.listings, listingId, () => updated) },
      goesOnline ? followerNotices(s, updated) : []
    )
  );
}

export const listingHasOrders = (listingId: string) => db.get().orders.some((o) => o.listingId === listingId);

/** Only never-sold listings can be deleted; sold ones are unpublished instead. */
export function deleteListing(listingId: string, sellerId: string): void {
  ownedListing(listingId, sellerId);
  if (listingHasOrders(listingId)) {
    throw new DomainError('Cette offre a déjà été vendue : dépubliez-la plutôt que de la supprimer.');
  }
  db.update((s) => ({
    ...s,
    listings: s.listings.filter((l) => l.id !== listingId),
    favorites: s.favorites.filter((f) => f.listingId !== listingId),
  }));
}
