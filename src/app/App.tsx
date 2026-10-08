import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { BootingContext, Button, EmptyState, ToastProvider } from '@/shared/ui';
import { boot, showSnapshot, useBootStatus, useLiveSync } from '@/shared/api';
import { router } from './router';

// The real page at once with the last known data (signed-in accounts); the server then refreshes it in place.
showSnapshot();

/** Nothing renders before the first load: guards and pages read the data synchronously. */
const BootGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useBootStatus();
  useEffect(() => {
    void boot().catch(() => undefined);
  }, []);
  useLiveSync();

  if (status !== 'offline') return <BootingContext.Provider value={status === 'loading'}>{children}</BootingContext.Provider>;
  {
    return (
      <EmptyState
        className="py-24"
        title="Salacope est injoignable"
        description="Vérifiez votre connexion internet puis réessayez."
        action={<Button onClick={() => window.location.reload()}>Réessayer</Button>}
      />
    );
  }
  return null;
};

export const App: React.FC = () => (
  <ToastProvider>
    <BootGate>
      <RouterProvider router={router} />
    </BootGate>
  </ToastProvider>
);
