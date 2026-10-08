import { User, useDb } from '@/shared/db';
import { useBooting } from '@/shared/ui';

/** Stands in for the account until the first answer: the screen draws, its values wait. */
const PENDING_USER: User = { id: '', name: '', email: '', phone: '', createdAt: '' };

export interface Session {
  user: User | null;
  /** Signed in, or a guest who bought without an account on this browser. */
  isAuthenticated: boolean;
  /** Bought without an account: no store, no settings until they create one. */
  isGuest: boolean;
  isMerchant: boolean;
}

export function useSession(): Session {
  const user = useDb((s) => s.users.find((u) => u.id === s.sessionUserId) ?? null);
  return { user, isAuthenticated: Boolean(user), isGuest: Boolean(user?.guest), isMerchant: Boolean(user?.merchant) };
}

/** For screens behind `RequireAuth`: the user is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useSession();
  const booting = useBooting();
  if (!user && booting) return PENDING_USER;
  if (!user) throw new Error('useCurrentUser used outside of RequireAuth');
  return user;
}

export function useUser(id: string | undefined): User | undefined {
  return useDb((s) => s.users.find((u) => u.id === id), [id]);
}

/** Public name of a user: store name for sellers, person name otherwise. */
export const displayName = (user?: User) => user?.merchant?.storeName ?? user?.name ?? 'Utilisateur supprimé';
