import React, { useState } from 'react';
import { OctagonAlert } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState, Field, Input, List, ListRow, Panel, SkeletonRows, Textarea, useToast } from '@/shared/ui';
import { LockdownLevel, reportLockdown } from '@/shared/api';
import { formatDateTime } from '@/shared/lib';
import { AdminLockdown, adminApi } from '../api';
import { useAdminResource } from '../hooks';

const LEVELS: { level: LockdownLevel; title: string; text: string }[] = [
  { level: 'off', title: 'Normal', text: 'Tout fonctionne.' },
  { level: 'payments', title: 'Paiements suspendus', text: 'Aucun paiement, versement ni remboursement ne passe par LightPay. Le reste du site fonctionne.' },
  { level: 'readonly', title: 'Lecture seule', text: 'Paiements suspendus, et la base de données n’accepte plus aucune écriture : on peut seulement consulter.' },
  { level: 'total', title: 'Arrêt total', text: 'Plus rien ne touche la base de données ni LightPay. Le site affiche « arrêté » à tout le monde, sauf cet écran.' },
];
const RANK: Record<LockdownLevel, number> = { off: 0, payments: 1, readonly: 2, total: 3 };

/** Choosing a level opens a confirmation: stopping is one click, lifting asks for a reason (and the unlock code if one is set). */
export const LockdownControl: React.FC = () => {
  const toast = useToast();
  const { data, error, set } = useAdminResource(() => adminApi.lockdown(), []);
  const [target, setTarget] = useState<LockdownLevel | null>(null);
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  if (error) return <EmptyState title="Verrou indisponible" description={error} />;
  if (!data) return <SkeletonRows rows={4} />;
  const { state } = data;
  const lowering = target !== null && RANK[target] < RANK[state.level];
  const close = () => {
    setTarget(null);
    setReason('');
    setCode('');
    setFailure(undefined);
  };

  const apply = async () => {
    if (!target) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const next: AdminLockdown = await adminApi.setLockdown(target, reason, code);
      set(next);
      toast.success(target === 'off' ? 'Verrou levé' : 'Verrou appliqué');
      close();
      // The app never finished starting while stopped: it starts again from the beginning.
      if (state.level === 'total' && next.state.level !== 'total') window.location.reload();
      else reportLockdown(next.state.level);
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {state.level !== 'off' && (
        <p className="rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">{LEVELS.find((l) => l.level === state.level)?.title}</span>
          {state.since ? ` depuis le ${formatDateTime(state.since)}` : ''}
          {state.by ? ` par ${state.by}` : ''}
          {state.reason ? ` — ${state.reason}` : ''}
        </p>
      )}
      {state.forced && (
        <p className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Un niveau est imposé par la variable <code className="font-mono">SALACOPE_LOCKDOWN</code> du serveur : il ne peut pas être abaissé d’ici. Retirez-la sur Vercel, puis redéployez.
        </p>
      )}
      <Panel title="Verrou d’urgence" description="Chaque niveau est plus strict que le précédent. Un niveau choisi ici s’applique en quelques secondes partout." flush>
        <List>
          {LEVELS.map((l) => (
            <ListRow
              key={l.level}
              onClick={l.level === state.level ? undefined : () => setTarget(l.level)}
              leading={
                <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                  <OctagonAlert className="w-4 h-4" />
                </span>
              }
              title={l.title}
              subtitle={l.text}
              meta={l.level === state.level ? <Badge tone={l.level === 'off' ? 'success' : 'danger'} dot>Actuel</Badge> : undefined}
            />
          ))}
        </List>
      </Panel>

      <Dialog
        open={target !== null}
        onClose={close}
        title={target === 'off' ? 'Lever le verrou' : lowering ? 'Assouplir le verrou' : `Appliquer : ${LEVELS.find((l) => l.level === target)?.title}`}
        description={LEVELS.find((l) => l.level === target)?.text}
        size="sm"
        dismissible={!busy}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Retour
            </Button>
            <Button variant={lowering ? 'primary' : 'danger'} loading={busy} onClick={apply}>
              {lowering ? 'Confirmer' : 'Appliquer maintenant'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={lowering ? 'Raison (obligatoire)' : 'Raison'} optional={!lowering}>
            {(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={lowering ? 'Ex. : vérification terminée, accès changés.' : 'Ex. : paiements suspects.'} />}
          </Field>
          {lowering && data.codeRequired && (
            <Field label="Code de déverrouillage">{(id) => <Input id={id} type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />}</Field>
          )}
          {failure && <p className="text-sm text-red-600">{failure}</p>}
        </div>
      </Dialog>
    </div>
  );
};
