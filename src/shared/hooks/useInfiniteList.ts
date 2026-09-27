import { useEffect, useRef, useState } from 'react';

const supported = typeof IntersectionObserver !== 'undefined';

/**
 * Shows `items` page by page: the next page is added when the sentinel gets close to
 * the viewport. `resetKey` starts over from the first page (new search, other category).
 */
export function useInfiniteList<T>(items: T[], pageSize: number, resetKey: string) {
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(pageSize), [resetKey, pageSize]);

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
