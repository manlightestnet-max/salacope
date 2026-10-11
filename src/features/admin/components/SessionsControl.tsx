import React, { useState } from 'react';
import { Button, EmptyState, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { adminApi } from '../api';
import { useAdminResource } from '../hooks';
import { ReasonDialog } from './ReasonDialog';

/** Signs everybody out at once (after a breach): every sign-in made before now is void, administrators included. */
export const SessionsControl: React.FC = () => {
  const toast = useToast();
  const { data, error, set } = useAdminResource(() => adminApi.sessions(), []);
  const [open, setOpen] = useState(false);
  if (error) return <EmptyState title="Sessions indisponibles" description={error} />;
  if (!data) return <SkeletonRows rows={2} />;
  const { state } = data;
  return (
    <Panel title="Déconnecter tout le monde" description="Ferme toutes les sessions en cours, les vôtres comprises : chacun doit se reconnecter. À utiliser après une fuite de mot de passe ou un piratage.">
      <Button variant="danger" onClick={() => setOpen(true)}>
        Déconnecter tout le monde
      </Button>
      <p className="mt-3 text-xs text-gray-500">
        {state.validAfter ? `Dernière déconnexion générale : ${formatDateTime(state.validAfter)} par ${state.by}${state.reason ? ` — ${state.reason}` : ''}.` : 'Aucune déconnexion générale pour l’instant.'}
      </p>
      <ReasonDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Déconnecter tout le monde"
        description="Toutes les sessions sont fermées en quelques secondes. Vous serez déconnecté aussi."
        danger
        confirmLabel="Déconnecter tout le monde"
        onConfirm={async (reason) => {
          set(await adminApi.signOutAll(reason));
          toast.success('Tout le monde est déconnecté.');
        }}
      />
    </Panel>
  );
};
