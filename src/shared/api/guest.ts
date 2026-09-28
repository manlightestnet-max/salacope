/**
 * Buying without an account: the secret key of this browser's guest profile (created by the
 * server at the first checkout). Sent with every request; dropped once an account takes it over.
 */
const KEY = 'salacope.guest';

export const guest = {
  key(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  save(key: string) {
    try {
      localStorage.setItem(KEY, key);
    } catch {
      // private window: the guest profile lasts for this tab
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing stored
    }
  },
};
