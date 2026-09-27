import { nowIso } from '@/shared/lib';
import { DomainError, db } from '@/shared/db';

export function toggleFavorite(userId: string, listingId: string): boolean {
  const exists = db.get().favorites.some((f) => f.userId === userId && f.listingId === listingId);
  db.update((s) => ({
    ...s,
    favorites: exists
      ? s.favorites.filter((f) => !(f.userId === userId && f.listingId === listingId))
      : [...s.favorites, { userId, listingId, createdAt: nowIso() }],
  }));
  return !exists;
}

export function toggleFollow(userId: string, sellerId: string): boolean {
  if (userId === sellerId) throw new DomainError('Vous ne pouvez pas suivre votre propre boutique.');
  const exists = db.get().follows.some((f) => f.userId === userId && f.sellerId === sellerId);
  db.update((s) => ({
    ...s,
    follows: exists
      ? s.follows.filter((f) => !(f.userId === userId && f.sellerId === sellerId))
      : [...s.follows, { userId, sellerId, createdAt: nowIso(), lastSeenAt: nowIso() }],
  }));
  return !exists;
}

/** The follower has looked at this store's latest offers: they stop counting as new. */
export function markFollowSeen(userId: string, sellerId: string): void {
  const at = nowIso();
  db.update((s) => ({
    ...s,
    follows: s.follows.map((f) => (f.userId === userId && f.sellerId === sellerId ? { ...f, lastSeenAt: at } : f)),
  }));
}
