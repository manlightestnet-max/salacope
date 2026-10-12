import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheKey, cached, remember } from '@/shared/hooks';
import { DisputeDetail, disputesApi } from './api';

/** One room, kept fresh while it is open (the other parties write at any time). */
export function useDisputeRoom(id: string | undefined, load: (id: string) => Promise<DisputeDetail>, everyMs = 8_000) {
  const key = cacheKey(load, [id]);
  const [detail, setDetail] = useState<DisputeDetail | undefined>(() => cached<DisputeDetail>(key));
  const [error, setError] = useState<string>();
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const refresh = useCallback(() => {
    if (!id) return Promise.resolve();
    return load(id).then(
      (d) => {
        remember(key, d);
        if (alive.current) (setDetail(d), setError(undefined));
      },
      (e) => alive.current && setError((e as Error).message)
    );
  }, [id, load, key]);

  useEffect(() => {
    // The conversation seen last is shown at once, and refreshed.
    setDetail(cached<DisputeDetail>(key));
    setError(undefined);
    if (!id) return;
    void refresh();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && void refresh(), everyMs);
    return () => window.clearInterval(timer);
  }, [id, key, refresh, everyMs]);

  const set = useCallback((d: DisputeDetail) => (remember(key, d), setDetail(d)), [key]);
  return { detail, error, refresh, set };
}

/** Open disputes and unread messages for the menu badges; checked on each page and every minute. */
export function useDisputeSummary(enabled: boolean, key: string) {
  const [summary, setSummary] = useState<{ open: number; total: number; unread: number }>();
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () => disputesApi.summary().then((s) => live && setSummary(s), () => undefined);
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [enabled, key]);
  return summary;
}
