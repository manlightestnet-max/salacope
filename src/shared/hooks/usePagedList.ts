import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [items, setItems] = useState<T[]>();
  const [extra, setExtra] = useState<X>();
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string>();
  const [more, setMore] = useState(false);
  const seq = useRef(0);
  const busy = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(() => {
    const mine = ++seq.current;
    busy.current = false;
    setError(undefined);
    setItems(undefined);
    run(0).then(
      (page) => {
        if (mine !== seq.current) return;
        setItems(page.items);
        setExtra(page.extra);
        setHasMore(page.hasMore);
      },
      (e) => mine === seq.current && setError((e as Error).message)
    );
  }, [run]);
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
        setItems((cur) => [...(cur ?? []), ...page.items]);
        setHasMore(page.hasMore);
      })
      .catch((e) => mine === seq.current && (setError((e as Error).message), setHasMore(false)))
      .finally(() => {
        busy.current = false;
        setMore(false);
      });
  }, [items, run]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!supported || !el || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && next(), { rootMargin: '0px 0px 400px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loaded, next]);

  return { items, extra, hasMore, error, loadingMore: more, sentinelRef, reload, next };
}
