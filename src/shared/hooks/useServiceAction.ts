import { useCallback } from 'react';
import { useToast } from '../ui/Toast';

/**
 * Wraps a service call: shows the error message as a toast,
 * or `successMessage` when it succeeds. Returns whether it succeeded.
 */
export function useServiceAction() {
  const toast = useToast();
  return useCallback(
    (fn: () => void, successMessage?: string): boolean => {
      try {
        fn();
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      }
    },
    [toast]
  );
}
