import { useCallback, useRef } from 'react';
import { useToast } from '../ui/Toast';

/**
 * Wraps a service call: shows the error message as a toast, or `successMessage` when it
 * succeeds. Resolves to whether it succeeded. A second call while one runs is ignored (double tap).
 */
export function useServiceAction() {
  const toast = useToast();
  const running = useRef(false);
  return useCallback(
    async (fn: () => unknown, successMessage?: string): Promise<boolean> => {
      if (running.current) return false;
      running.current = true;
      try {
        await fn();
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      } finally {
        running.current = false;
      }
    },
    [toast]
  );
}
