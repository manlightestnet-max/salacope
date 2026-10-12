import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheKey, cached, remember } from './resourceCache';

const supported = typeof IntersectionObserver !== 'undefined';

export interface PagedRows<T, X = undefined> {
  items: T[];
  hasMore: boolean;
  extra: X;
}

/**
 * A list loaded page by page: the first page on mount (and again when `deps` change), the next one when `sentinelRef` comes
 * near the bottom of the scrolling pane. `extra` is what the first page carries besides rows (counts, totals).
 */
export function usePagedList<T, X = undefined>(load: (offset: number) => Promise<PagedRows<T, X>>, deps: unknown[]) {
  const key = cacheKey(load, deps);
  const known = cached<{ items: T[]; extra: X; hasMore: boolean }>(key);
  const [items, setItems] = useState<T[] | undefined>(known?.items);
  const [extra, setExtra] = useState<X | undefined>(known?.extra);
  const [hasMore, setHasMore] = useState(known?.hasMore ?? false);
  const [error, setError] = useState<string>();
  const [more, setMore] = useState(false);
  const seq = useRef(0);
  const busy = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  // What the screen shows, for `next` (read at call time).
  const latest = useRef({ extra, hasMore });
  latest.current = { extra, hasMore };

  const reload = useCallback(() => {
    const mine = ++seq.current;
    busy.current = false;
    setError(undefined);
    const before = cached<{ items: T[]; extra: X; hasMore: boolean }>(key);
    setItems(before?.items);
    setExtra(before?.extra);
    setHasMore(before?.hasMore ?? false);
    run(0).then(
      (page) => {
        if (mine !== seq.current) return;
        // The first page is fresh; what had been scrolled to beyond it is kept (matched by id when rows have one).
        const idOf = (r: T) => (r as { id?: string }).id;
        const ids = new Set(page.items.map(idOf).filter((v): v is string => v !== undefined));
        const rest = (before?.items ?? []).slice(page.items.length).filter((r) => !ids.has(idOf(r) as string));
        const merged = [...page.items, ...rest];
        const more_ = rest.length ? (before?.hasMore ?? page.hasMore) : page.hasMore;
        // Kept for the next visit under the key these rows belong to, and only here (never "whatever is on screen").
        remember(key, { items: merged, extra: page.extra, hasMore: more_ });
        setItems(merged);
        setExtra(page.extra);
        setHasMore(more_);
      },
      (e) => mine === seq.current && setError((e as Error).message)
    );
  }, [run, key]);
  useEffect(reload, [reload]);

  const loaded = items?.length ?? 0;
  const next = useCallback(() => {
    if (busy.current || !items) return;
    busy.current = true;
    setMore(true);
    const mine = seq.current;
    run(items.length)
      .then((page) => {
        if (mine !== seq.current) return;
        remember(key, { items: [...items, ...page.items], extra: latest.current.extra, hasMore: page.hasMore });
        setItems([...items, ...page.items]);
        setHasMore(page.hasMore);
      })
      .catch((e) => mine === seq.current && (setError((e as Error).message), setHasMore(false)))
      .finally(() => {
        busy.current = false;
        setMore(false);
      });
  }, [items, run, key]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!supported || !el || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && next(), { rootMargin: '0px 0px 400px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loaded, next]);

  return { items, extra, hasMore, error, loadingMore: more, sentinelRef, reload, next };
}
