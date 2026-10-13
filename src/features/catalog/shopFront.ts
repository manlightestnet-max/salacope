import { useEffect, useSyncExternalStore } from 'react';
import { User } from '@/shared/db';

/**
 * A private store's pages (its store page, its offers) are shown as a shop of its own: the public layout swaps the
 * marketplace header and footer (search, Explorer, other categories) for the store's name, so buyers stay in that shop.
 */
let current: User | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Called by a page that shows a store's content: a private store takes over the layout while the page is open. */
export function useShopFront(seller: User | undefined) {
  const shop = seller?.merchant?.private ? seller : null;
  useEffect(() => {
    if (!shop) return;
    current = shop;
    emit();
    return () => {
      if (current?.id === shop.id) {
        current = null;
        emit();
      }
    };
  }, [shop]);
}

/** The private store whose shop is on screen, if any (read by the public layout). */
export const useShopFrontSeller = () => useSyncExternalStore(subscribe, () => current);
