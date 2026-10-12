import React, { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { reportError } from '@/shared/lib';

/** What a screen that crashed shows: a short apology and the ways out. The error itself is reported to the server. */
export const RouteError: React.FC = () => {
  const error = useRouteError();
  useEffect(() => {
    reportError(error, 'route');
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <EmptyState
        title="Quelque chose s’est mal passé"
        description="L’erreur a été signalée à l’équipe. Rechargez la page ; si le problème revient, écrivez au support."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Recharger
            </Button>
            <Button variant="secondary" onClick={() => window.location.assign('/')}>
              Accueil
            </Button>
          </div>
        }
      />
    </div>
  );
};
