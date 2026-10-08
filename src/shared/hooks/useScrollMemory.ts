import { useCallback, useRef } from 'react';

// Where each scrolling area was left, kept for the whole visit: coming back to a list puts it exactly where it was.
const positions = new Map<string, number>();

/**
 * Remembers and restores the scroll position of a scrolling element under `key`. Put the returned callback ref on the
 * element: it is restored as soon as the element mounts (the content is already in it), and saved while scrolling.
 */
export function useScrollMemory<T extends HTMLElement>(key: string | undefined) {
  const cleanup = useRef<() => void>();
  return useCallback(
    (el: T | null) => {
      cleanup.current?.();
      cleanup.current = undefined;
      if (!el || !key) return;
      const saved = positions.get(key);
      if (saved) el.scrollTop = saved;
      let frame = 0;
      const onScroll = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => positions.set(key, el.scrollTop));
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      cleanup.current = () => {
        el.removeEventListener('scroll', onScroll);
        cancelAnimationFrame(frame);
      };
    },
    [key]
  );
}
