import { User, useDb } from '@/shared/db';

export interface Session {
  user: User | null;
  isAuthenticated: boolean;
  isMerchant: boolean;
}

export function useSession(): Session {
  const user = useDb((s) => s.users.find((u) => u.id === s.sessionUserId) ?? null);
  return { user, isAuthenticated: Boolean(user), isMerchant: Boolean(user?.merchant) };
}

/** For screens behind `RequireAuth`: the user is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useSession();
  if (!user) throw new Error('useCurrentUser used outside of RequireAuth');
  return user;
}

export function useUser(id: string | undefined): User | undefined {
  return useDb((s) => s.users.find((u) => u.id === id), [id]);
}

/** Public name of a user: store name for sellers, person name otherwise. */
export const displayName = (user?: User) => user?.merchant?.storeName ?? user?.name ?? 'Utilisateur supprimé';
