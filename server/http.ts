import { DomainError } from '../src/shared/domain/errors.js';
import { Identity, verifyIdToken } from './auth.js';
import { query } from './db.js';

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
  /** Signed-in Salacope user id; 401 otherwise. */
  userId(): Promise<string>;
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
  routes.push({ method, pattern, keys, handler });
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
  let user: Promise<string> | undefined;
  const getUserId = () => {
    if (!user) {
      user = getIdentity().then(async (id) => {
        if (!id) throw new DomainError('Connectez-vous pour continuer.', 401);
        const [row] = await query<{ id: string }>('SELECT id FROM users WHERE firebase_uid = $1', [id.uid]);
        if (!row) throw new DomainError('Compte introuvable : reconnectez-vous.', 401);
        return row.id;
      });
    }
    return user;
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
      userId: getUserId,
    });
    return reply(200, result ?? { ok: true });
  } catch (err) {
    if (err instanceof DomainError) return reply(err.status, { error: err.message });
    console.error('[api]', method, path, err);
    return reply(500, { error: 'Erreur du serveur. Réessayez dans un instant.' });
  }
}
