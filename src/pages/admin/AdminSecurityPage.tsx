import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Tabs } from '@/shared/ui';
import { LockdownControl, SessionsControl } from '@/features/admin';

type View = 'verrou' | 'sessions';

/** Security: the emergency brake, and signing everybody out. One thing per tab. */
export const AdminSecurityPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('vue') === 'sessions' ? 'sessions' : 'verrou';
  return (
    <Page
      title="Sécurité"
      width="narrow"
      help="Pour un problème ou une attaque : le verrou d’urgence (suspendre les paiements, lecture seule, arrêt total) et la déconnexion générale. Chaque changement est inscrit au journal."
      toolbar={
        <Tabs
          bare
          segmented
          value={view}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set('vue', v);
            setParams(next, { replace: true });
          }}
          items={[
            { value: 'verrou', label: 'Verrou d’urgence' },
            { value: 'sessions', label: 'Sessions' },
          ]}
        />
      }
    >
      {view === 'verrou' ? <LockdownControl /> : <SessionsControl />}
    </Page>
  );
};
