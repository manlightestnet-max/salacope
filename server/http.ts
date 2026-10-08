import { DomainError } from '../src/shared/domain/errors.js';
import { Identity, verifyIdToken } from './auth.js';
import { query } from './db.js';
import { guestIdFromKey } from './guests.js';

export interface Context {
  method: string;
  path: string;
  params: Record<string, string>;
  search: URLSearchParams;
  body: any;
  rawBody: string;
  headers: Headers;
  /** This site's origin (return links), e.g. https://salacope.online. */
  origin: string;
  /** Firebase identity, or null for visitors. */
  identity(): Promise<Identity | null>;
  /** Buyer without an account: the secret key kept by their browser (`X-Salacope-Guest`), if sent. */
  guestKey: string | null;
  /** Salacope user id: an account, or a guest buying without one; 401 otherwise. */
  userId(): Promise<string>;
  /** Like `userId`, null for a visitor instead of 401. */
  viewerId(): Promise<string | null>;
  /** An account only (selling, settings): guests are asked to create one. */
  accountId(): Promise<string>;
}

type Handler = (ctx: Context) => Promise<unknown>;

const routes: { method: string; pattern: RegExp; keys: string[]; handler: Handler }[] = [];

/** `route('POST', '/listings/:id/status', handler)` — paths are relative to /api. */
export function route(method: string, path: string, handler: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/\/:([a-zA-Z]+)/g, (_, key) => {
      keys.push(key);
      return '/([^/]+)';
    })}$`
  );
  // Re-registering (a route module reloaded by the dev server) replaces the previous handler.
  const existing = routes.findIndex((r) => r.method === method && r.pattern.source === pattern.source);
  if (existing >= 0) routes[existing] = { method, pattern, keys, handler };
  else routes.push({ method, pattern, keys, handler });
}

export const notFound = (what = 'Élément introuvable.') => new DomainError(what, 404);

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

/** Entry point shared by the Vercel function and the Vite dev server. */
export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = (url.searchParams.get('__path') ?? url.pathname.replace(/^\/api/, '')).replace(/^\/?/, '/').replace(/\/$/, '') || '/';
  url.searchParams.delete('__path');
  const method = request.method.toUpperCase();

  const match = routes.find((r) => r.method === method && r.pattern.test(path));
  if (!match) return reply(404, { error: 'Route inconnue.' });
  const values = path.match(match.pattern)!.slice(1);

  const rawBody = method === 'GET' || method === 'HEAD' ? '' : await request.text();
  let body: any = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return reply(400, { error: 'Requête illisible.' });
    }
  }

  let identity: Promise<Identity | null> | undefined;
  const getIdentity = () => {
    if (!identity) {
      const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
      identity = token ? verifyIdToken(token) : Promise.resolve(null);
    }
    return identity;
  };
  const guestKey = request.headers.get('x-salacope-guest');
  let viewer: Promise<{ id: string; guest: boolean } | null> | undefined;
  const getViewer = () => {
    if (!viewer) {
      viewer = getIdentity().then(async (id) => {
        if (id) {
          const [row] = await query<{ id: string; blocked_at: string | null }>('SELECT id, blocked_at FROM users WHERE firebase_uid = $1', [id.uid]);
          if (!row) throw new DomainError('Compte introuvable : reconnectez-vous.', 401);
          // Blocked by Salacope (AML/CFT policy): nothing can be done with the account any more.
          if (row.blocked_at) throw new DomainError('Votre compte est bloqué. Écrivez à contact@salacope.online.', 403);
          return { id: row.id, guest: false };
        }
        const guest = await guestIdFromKey(guestKey);
        return guest ? { id: guest, guest: true } : null;
      });
    }
    return viewer;
  };
  const getUserId = async () => {
    const v = await getViewer();
    if (!v) throw new DomainError('Connectez-vous pour continuer.', 401);
    return v.id;
  };
  const getAccountId = async () => {
    const v = await getViewer();
    if (!v) throw new DomainError('Connectez-vous pour continuer.', 401);
    if (v.guest) throw new DomainError('Créez votre compte Salacope pour continuer.', 403);
    return v.id;
  };

  try {
    const result = await match.handler({
      method,
      path,
      params: Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(values[i])])),
      search: url.searchParams,
      body,
      rawBody,
      headers: request.headers,
      origin: (process.env.SALACOPE_PUBLIC_URL || url.origin).replace(/\/$/, ''),
      identity: getIdentity,
      guestKey,
      userId: getUserId,
      viewerId: async () => (await getViewer())?.id ?? null,
      accountId: getAccountId,
    });
    if (result instanceof Response) return result;
    return reply(200, result ?? { ok: true });
  } catch (err) {
    if (err instanceof DomainError) return reply(err.status, { error: err.message });
    console.error('[api]', method, path, err);
    return reply(500, { error: 'Erreur du serveur. Réessayez dans un instant.' });
  }
}
