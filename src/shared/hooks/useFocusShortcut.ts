import { RefObject, useEffect } from 'react';

const isApple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** "⌘K" on Apple devices, "Ctrl K" elsewhere. */
export const shortcutLabel = (key: string) => (isApple() ? `⌘${key.toUpperCase()}` : `Ctrl ${key.toUpperCase()}`);

/** Focuses (and selects) `ref` on Ctrl/⌘ + `key`. */
export function useFocusShortcut(ref: RefObject<HTMLInputElement>, key = 'k'): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ref, key]);
}
