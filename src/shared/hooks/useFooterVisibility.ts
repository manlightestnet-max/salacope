import { createContext, useContext, useEffect } from 'react';

/** Provided by layouts that have a footer; pages use `useHideFooter`. */
export const FooterVisibilityContext = createContext<(hidden: boolean) => void>(() => {});

/** Hides the site footer while `hidden` (e.g. an infinite list still has results to load). */
export function useHideFooter(hidden: boolean) {
  const setHidden = useContext(FooterVisibilityContext);
  useEffect(() => {
    setHidden(hidden);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}
