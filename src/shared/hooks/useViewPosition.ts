import { useEffect, useRef, useState } from 'react';

export type ViewPosition = 'in' | 'above' | 'below';

/**
 * Where an element is relative to the visible area: on screen, scrolled past (above) or still to come (below).
 * `rootMargin` shrinks the area (e.g. '-64px 0px 0px 0px' to ignore what a pinned header covers).
 */
export function useViewPosition<T extends Element>(rootMargin = '0px'): [React.RefObject<T>, ViewPosition] {
  const ref = useRef<T>(null);
  const [position, setPosition] = useState<ViewPosition>('in');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return setPosition('in');
        const top = entry.rootBounds?.top ?? 0;
        setPosition(entry.boundingClientRect.bottom <= top ? 'above' : 'below');
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, position];
}
