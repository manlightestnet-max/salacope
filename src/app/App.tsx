import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Button, EmptyState, Spinner, ToastProvider } from '@/shared/ui';
import { boot, useBootStatus, useLiveSync } from '@/shared/api';
import { router } from './router';

/** Nothing renders before the first load: guards and pages read the data synchronously. */
const BootGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useBootStatus();
  useEffect(() => {
    void boot().catch(() => undefined);
  }, []);
  useLiveSync();

  if (status === 'ready') return <>{children}</>;
  if (status === 'offline') {
    return (
      <EmptyState
        className="py-24"
        title="Salacope est injoignable"
        description="Vérifiez votre connexion internet puis réessayez."
        action={<Button onClick={() => window.location.reload()}>Réessayer</Button>}
      />
    );
  }
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
};

export const App: React.FC = () => (
  <ToastProvider>
    <BootGate>
      <RouterProvider router={router} />
    </BootGate>
  </ToastProvider>
);
