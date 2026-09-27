import { mutate } from '@/shared/api';
import { Listing, db } from '@/shared/db';
import { ListingInput, MAX_BRIEF_QUESTIONS, validateListing } from '@/shared/domain';

export type { ListingInput };
export { MAX_BRIEF_QUESTIONS };

/** Checked here for instant feedback, then again by the server. */
export async function createListing(input: ListingInput, publish: boolean): Promise<Listing> {
  validateListing(input);
  const { listing } = await mutate<{ listing: Listing }>('POST', '/listings', { listing: input, publish });
  return listing;
}

/** Past orders keep their own snapshot, so edits never change what was sold. */
export async function updateListing(listingId: string, input: ListingInput): Promise<void> {
  validateListing(input);
  await mutate('PATCH', `/listings/${encodeURIComponent(listingId)}`, { listing: input });
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
