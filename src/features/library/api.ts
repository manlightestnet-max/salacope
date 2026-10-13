import { mutate } from '@/shared/api';
import { DomainError, db } from '@/shared/db';
import { noteListing } from '@/shared/lib';

const path = (p: string, id: string) => `/${p}/${encodeURIComponent(id)}`;

/** Resolves to whether the offer is now a favourite. */
export async function toggleFavorite(listingId: string): Promise<boolean> {
  const exists = db.get().favorites.some((f) => f.listingId === listingId);
  await mutate(exists ? 'DELETE' : 'POST', path('favorites', listingId));
  const listing = db.get().listings.find((l) => l.id === listingId);
  if (!exists && listing) noteListing(listing, 'like');
  return !exists;
}

/** Resolves to whether the store is now followed. */
export async function toggleFollow(userId: string, sellerId: string): Promise<boolean> {
  if (userId === sellerId) throw new DomainError('Vous ne pouvez pas suivre votre propre boutique.');
  const exists = db.get().follows.some((f) => f.sellerId === sellerId);
  await mutate(exists ? 'DELETE' : 'POST', path('follows', sellerId));
  return !exists;
}

/** The follower has looked at this store's latest offers: they stop counting as new. */
export async function markFollowSeen(sellerId: string): Promise<void> {
  await mutate('POST', `${path('follows', sellerId)}/seen`);
}
