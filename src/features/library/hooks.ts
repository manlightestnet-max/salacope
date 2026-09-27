import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Listing, useDb } from '@/shared/db';
import { ROUTES } from '@/shared/config/routes';
import { useToast } from '@/shared/ui';
import { useSession } from '@/features/session';
import { toggleFavorite, toggleFollow } from './api';

/** Runs `action` for a signed-in user, otherwise sends the visitor to sign-in and back. */
export function useAuthAction() {
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (action: (userId: string) => void) => {
      if (!user) {
        navigate(`${ROUTES.signIn}?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      action(user.id);
    },
    [user, navigate, location]
  );
}

export function useFavorite(listingId: string) {
  const { user } = useSession();
  const run = useAuthAction();
  const active = useDb((s) => s.favorites.some((f) => f.userId === user?.id && f.listingId === listingId), [user?.id, listingId]);
  const toggle = () => run((uid) => toggleFavorite(uid, listingId));
  return { active, toggle };
}

export function useFollow(sellerId: string) {
  const { user } = useSession();
  const run = useAuthAction();
  const toast = useToast();
  const active = useDb((s) => s.follows.some((f) => f.userId === user?.id && f.sellerId === sellerId), [user?.id, sellerId]);
  const toggle = () =>
    run((uid) => {
      try {
        toggleFollow(uid, sellerId);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  return { active, toggle, isSelf: user?.id === sellerId };
}

export const useFavoriteIds = (userId: string) =>
  useDb((s) => s.favorites.filter((f) => f.userId === userId).map((f) => f.listingId), [userId]);

export const useFollowedSellers = (userId: string) =>
  useDb(
    (s) =>
      s.follows
        .filter((f) => f.userId === userId)
        .map((f) => ({ follow: f, seller: s.users.find((u) => u.id === f.sellerId) }))
        .filter((x) => x.seller),
    [userId]
  );

/** When a published offer went online. */
export const publishedAt = (l: Pick<Listing, 'publishedAt' | 'createdAt'>) => l.publishedAt ?? l.createdAt;

/** Published offers of each followed store that appeared since the follower last looked. */
export const useFollowUpdates = (userId: string) =>
  useDb(
    (s) => {
      const bySeller = new Map<string, Listing[]>();
      s.follows
        .filter((f) => f.userId === userId)
        .forEach((f) => {
          const seen = f.lastSeenAt ?? f.createdAt;
          bySeller.set(
            f.sellerId,
            s.listings.filter((l) => l.sellerId === f.sellerId && l.status === 'published' && publishedAt(l) > seen)
          );
        });
      const total = [...bySeller.values()].reduce((n, list) => n + list.length, 0);
      return { bySeller, total };
    },
    [userId]
  );
