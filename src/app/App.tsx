import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/shared/ui';
import { settleDueOrders } from '@/features/orders';
import { expireStalePayments } from '@/features/checkout';
import { router } from './router';

const SETTLE_INTERVAL_MS = 60_000;

/** Releases escrow on orders whose confirmation window has passed (a server job in production). */
const useEscrowSettlement = () => {
  useEffect(() => {
    const settle = () => {
      settleDueOrders();
      expireStalePayments();
    };
    settle();
    const id = setInterval(settle, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
};

export const App: React.FC = () => {
  useEscrowSettlement();
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
};
