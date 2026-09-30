import React from 'react';
import { Outlet } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Container, LaunchBanner, Logo, ThemeToggle } from '@/shared/ui';

/** Distraction-free chrome for checkout and sign-in. */
export const MinimalLayout: React.FC = () => (
  <div className="flex-1 flex flex-col bg-canvas">
    <LaunchBanner />
    <header className="h-14 border-b border-gray-200 bg-surface/80 backdrop-blur">
      <Container className="h-full flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            Paiement sécurisé
          </span>
          <ThemeToggle />
        </div>
      </Container>
    </header>
    <main className="flex-1 py-8">
      <Outlet />
    </main>
  </div>
);
