import { DomainError } from '@/shared/domain';
import { Patch, Removal, db } from '@/shared/db';
import { auth } from './auth';

/** Calls the Salacope API as the signed-in person. Errors carry a message safe to show. */
export async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await auth.idToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new DomainError('Pas de connexion internet. Réessayez.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new DomainError(data?.error ?? 'Erreur du serveur. Réessayez dans un instant.', res.status);
  return data as T;
}

/** A write: the server answers with the rows that changed, applied to the local cache. */
export async function mutate<T = any>(method: string, path: string, body?: unknown): Promise<T & { patch?: Patch; removed?: Removal }> {
  const result = await request<T & { patch?: Patch; removed?: Removal }>(method, path, body);
  if (result.patch || result.removed) db.apply(result.patch, result.removed);
  return result;
}
