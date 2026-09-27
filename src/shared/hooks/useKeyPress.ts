import { useEffect } from 'react';

/** Invokes `handler` whenever `key` is pressed on the window. */
export function useKeyPress(key: string, handler: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, active]);
}
