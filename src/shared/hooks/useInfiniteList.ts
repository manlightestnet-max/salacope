import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const supported = typeof IntersectionObserver !== 'undefined';

// How far each list had been loaded, per history entry: going back to a page finds its list as long as it was, so the
// scroll position that comes back (the last item you were on) points at something that exists.
const loaded = new Map<string, number>();

/**
 * Shows `items` page by page: the next page is added when the sentinel gets close to
 * the viewport. `resetKey` starts over from the first page (new search, other category); coming back to the same
 * history entry keeps the pages already loaded.
 */
export function useInfiniteList<T>(items: T[], pageSize: number, resetKey: string) {
  const { key: entry } = useLocation();
  const memory = `${entry}:${resetKey}`;
  const [count, setCount] = useState(() => loaded.get(memory) ?? pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // A new search or category starts at the first page; the first render of a returning page does not.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setCount(loaded.get(memory) ?? pageSize);
  }, [memory, pageSize]);

  useEffect(() => {
    loaded.set(memory, count);
  }, [memory, count]);

  const hasMore = supported && count < items.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    // Re-created after each page: if the sentinel is still in reach, the next page follows.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setCount((c) => c + pageSize);
    }, { rootMargin: '0px 0px 600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, pageSize, count]);

  return { visible: supported ? items.slice(0, count) : items, hasMore, sentinelRef };
}
