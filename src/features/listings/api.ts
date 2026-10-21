import { mutate } from '@/shared/api';
import { Listing, ListingFileItem, db } from '@/shared/db';
import { ListingInput, MAX_BRIEF_QUESTIONS, validateListing } from '@/shared/domain';

export type { ListingInput };
export { MAX_BRIEF_QUESTIONS };

/** Checked here for instant feedback, then again by the server. */
export async function createListing(input: ListingInput, publish: boolean): Promise<Listing> {
  validateListing(input);
  const { listing } = await mutate<{ listing: Listing }>('POST', '/listings', { listing: { ...input, promoEndsAt: input.promoEndsAt ?? null }, publish });
  return listing;
}

/** Past orders keep their own snapshot, so edits never change what was sold. */
export async function updateListing(listingId: string, input: ListingInput): Promise<void> {
  validateListing(input);
  await mutate('PATCH', `/listings/${encodeURIComponent(listingId)}`, { listing: { ...input, promoEndsAt: input.promoEndsAt ?? null } });
}

/** A draft opened by the first file sent: it keeps what is typed so far and holds the files from then on (nothing is lost, nothing is left behind). */
export async function createDraft(input: Pick<ListingInput, 'kind' | 'category' | 'title' | 'summary'>): Promise<Listing> {
  const { listing } = await mutate<{ listing: Listing }>('POST', '/listings/draft', { listing: { kind: input.kind, category: input.category, title: input.title, summary: input.summary } });
  return listing;
}

/** The files of a draft, saved as they are added, taken out or marked as samples. */
export async function saveDraftFiles(listingId: string, files: ListingFileItem[]): Promise<void> {
  await mutate('PUT', `/listings/${encodeURIComponent(listingId)}/files`, { files });
}

/** The offer finished in the editor goes into its draft, and online right away when asked. */
export async function saveDraft(listingId: string, input: ListingInput, publish: boolean): Promise<void> {
  await updateListing(listingId, input);
  if (publish) await setListingStatus(listingId, 'published');
}

export async function setListingStatus(listingId: string, status: Listing['status']): Promise<void> {
  await mutate('POST', `/listings/${encodeURIComponent(listingId)}/status`, { status });
}

/** Sold at least once (in this seller's orders): it can only be unpublished. */
export const listingHasOrders = (listingId: string) => db.get().orders.some((o) => o.listingId === listingId);

/** Only never-sold listings can be deleted; sold ones are unpublished instead (checked by the server). */
export async function deleteListing(listingId: string): Promise<void> {
  await mutate('DELETE', `/listings/${encodeURIComponent(listingId)}`);
}
