import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const read = (key: string): string | null => {
  try {
    return sessionStorage.getItem(`salacope:param:${key}`);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    sessionStorage.setItem(`salacope:param:${key}`, value);
  } catch {
    // private window: it simply does not persist
  }
};

/**
 * A tab or filter kept in the address (`?name=value`, so a link can point to it) and remembered for the visit: leaving the
 * screen and coming back finds the same tab selected. The address wins when it has a value (a link, the overview's shortcuts).
 * `scope` names the screen (several screens may use the same parameter name).
 */
export function useRememberedParam<T extends string>(scope: string, name: string, allowed: readonly T[], fallback: T): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const key = `${scope}:${name}`;
  const fromUrl = allowed.find((v) => v === params.get(name));
  const remembered = read(key);
  const value = fromUrl ?? allowed.find((v) => v === remembered) ?? fallback;
  useEffect(() => {
    if (fromUrl) write(key, fromUrl);
  }, [key, fromUrl]);
  const set = (next: T) => {
    write(key, next);
    const copy = new URLSearchParams(params);
    copy.set(name, next);
    setParams(copy, { replace: true });
  };
  return [value, set];
}
