import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheKey, cached, remember } from '@/shared/hooks';

/**
 * Loads an admin resource; `reload` refetches, `set` replaces it after an action. The last answer is kept: coming back to
 * a screen or a tab shows it immediately and refreshes it in the background, so `loading` is only true while there is
 * nothing to show yet.
 */
export function useAdminResource<T>(load: () => Promise<T>, deps: unknown[]) {
  const key = cacheKey(load, deps);
  const [data, setData] = useState<T | undefined>(() => cached<T>(key));
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(() => cached(key) === undefined);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(() => {
    const mine = ++seq.current;
    setError(undefined);
    const known = cached<T>(key);
    setData(known);
    setLoading(known === undefined);
    run().then(
      (d) => {
        remember(key, d);
        if (mine !== seq.current) return;
        // Same answer as the one on screen: nothing is replaced, so a form being filled is left alone.
        if (known === undefined || JSON.stringify(known) !== JSON.stringify(d)) setData(d);
        setLoading(false);
      },
      (e) => mine === seq.current && (setError((e as Error).message), setLoading(false))
    );
  }, [run, key]);
  useEffect(reload, [reload]);

  const set = useCallback(
    (next: T | undefined | ((cur: T | undefined) => T | undefined)) => {
      setData((cur) => {
        const value = typeof next === 'function' ? (next as (cur: T | undefined) => T | undefined)(cur) : next;
        remember(key, value);
        return value;
      });
    },
    [key]
  );
  return { data, error, loading, reload, set };
}
