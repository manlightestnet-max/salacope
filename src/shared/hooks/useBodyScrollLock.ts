import { useEffect } from 'react';

/** Prevents the page behind an overlay from scrolling while `active`. */
export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
