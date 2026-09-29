import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads an admin resource; `reload` refetches, `set` replaces it after an action. */
export function useAdminResource<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  const reload = useCallback(() => {
    const mine = ++seq.current;
    setLoading(true);
    setError(undefined);
    run().then(
      (d) => mine === seq.current && (setData(d), setLoading(false)),
      (e) => mine === seq.current && (setError((e as Error).message), setLoading(false))
    );
  }, [run]);
  useEffect(reload, [reload]);
  return { data, error, loading, reload, set: setData };
}
