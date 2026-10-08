/**
 * Best-effort brake on abuse: how many requests one address may send per minute, by kind of route. It lives in the memory
 * of each running function, so it stops a flood from one source (the cost risk: a 2 MB catalogue called in a loop), not a
 * coordinated one; Vercel's own firewall rate limit is the second layer. Limits are high on purpose: many people share one
 * address on mobile networks, a normal visitor never gets near them.
 */
const WINDOW = 60_000;
const hits = new Map<string, number[]>();

/** Requests per minute and address, by bucket. */
const LIMITS: Record<string, number> = { catalogue: 150, preview: 600, public: 1200 };

/** Which bucket a request counts in. */
export const bucketOf = (method: string, path: string) => {
  if (method === 'GET' && (path === '/bootstrap' || path === '/catalog')) return 'catalogue';
  if (method === 'GET' && path.startsWith('/share/')) return 'preview';
  return 'public';
};

/** The caller's address as Vercel (or a proxy) reports it. */
export const addressOf = (headers: Headers) =>
  headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'local';

/** 0 when the request may go on, else the seconds to wait. */
export function secondsToWait(address: string, bucket: string, now = Date.now()): number {
  const key = `${bucket}:${address}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, list] of hits) if (!list.some((t) => now - t < WINDOW)) hits.delete(k);
  }
  return recent.length > LIMITS[bucket] ? Math.max(1, Math.ceil((WINDOW - (now - recent[0])) / 1000)) : 0;
}
