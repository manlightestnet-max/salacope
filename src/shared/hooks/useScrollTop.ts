import { useEffect, useRef } from 'react';

/**
 * A page opened from a link inside another page of the same kind (an offer from "Aussi chez…") is a new page:
 * it starts at the top, whichever element scrolls. Put the returned ref on the first element of the page.
 */
export function useScrollTop<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'start' });
  }, [key]);
  return ref;
}
