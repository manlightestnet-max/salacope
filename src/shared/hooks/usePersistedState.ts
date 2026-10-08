import { useCallback, useState } from 'react';

/** `useState` that survives leaving the page and coming back (kept for the visit, in this tab): filters of a list, a chosen view. */
export function usePersistedState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(`salacope:state:${key}`);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        sessionStorage.setItem(`salacope:state:${key}`, JSON.stringify(next));
      } catch {
        // private window: it simply does not persist
      }
    },
    [key]
  );
  return [value, set];
}
