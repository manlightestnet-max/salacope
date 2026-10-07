import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Button, EmptyState, Skeleton, SkeletonCards, ToastProvider } from '@/shared/ui';
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
  // The shape of the site while the first data arrives: header, then a grid of cards.
  return (
    <div className="flex-1" aria-busy="true" aria-label="Chargement de Salacope">
      <div className="h-16 border-b border-gray-200/60 px-4 sm:px-6 flex items-center gap-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="hidden md:block h-10 flex-1 max-w-[460px] rounded-full" />
        <Skeleton className="ml-auto h-9 w-9 rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <SkeletonCards count={8} />
      </div>
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
