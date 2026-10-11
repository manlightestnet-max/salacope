import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AdminStorage, StoragePurpose, adminApi, useAdminResource } from '@/features/admin';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { STORAGE } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';
import { STORAGE_PURPOSES, mb } from './AdminStoragePage';

/** Saves, then goes back to the list where the item shows as configured. */
function useSave(done: string) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const save = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await work();
      toast.success(done);
      navigate(ROUTES.admin.storage, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return { busy, error, save };
}

const Footer: React.FC<{ error?: string; busy: boolean; disabled?: boolean }> = ({ error, busy, disabled }) => (
  <>
    {error && (
      <p className="mt-4 text-sm text-red-600" role="alert">
        {error}
      </p>
    )}
    <div className="mt-5 flex justify-end">
      <Button type="submit" variant="primary" loading={busy} disabled={disabled}>
        Enregistrer
      </Button>
    </div>
  </>
);

const KeyNotice: React.FC = () => (
  <p className="mb-4 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <span>
      La clé de chiffrement manque sur le serveur : ajoutez <code className="font-mono">SALACOPE_SETTINGS_KEY</code> dans l’environnement, puis rechargez.
    </span>
  </p>
);

const AccountForm: React.FC<{ storage: AdminStorage }> = ({ storage }) => {
  const { busy, error, save } = useSave('Compte enregistré');
  const [accountId, setAccountId] = useState(storage.accountId);
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(() => adminApi.saveStorage({ accountId, accessKeyId, secretAccessKey, buckets: storage.buckets as Record<string, { name: string; publicUrl?: string }> }));
      }}
    >
      {!storage.keyReady && <KeyNotice />}
      <Panel title="Compte Cloudflare R2" description="Les clés sont chiffrées en base et ne s’affichent plus jamais.">
        <div className="space-y-4">
          <Field label="Identifiant de compte Cloudflare">{(id) => <Input id={id} value={accountId} onChange={(e) => setAccountId(e.target.value)} autoComplete="off" />}</Field>
          <Field label="Clé d’accès (Access Key ID)">
            {(id) => (
              <Input
                id={id}
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder={storage.accessKey ? `Enregistrée (${storage.accessKey}) — laisse vide pour la garder` : ''}
                autoComplete="off"
              />
            )}
          </Field>
          <Field label="Clé secrète (Secret Access Key)">
            {(id) => (
              <Input
                id={id}
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder={storage.secretKey ? `Enregistrée (${storage.secretKey}) — laisse vide pour la garder` : ''}
                autoComplete="new-password"
              />
            )}
          </Field>
        </div>
        <Footer error={error} busy={busy} disabled={!storage.keyReady} />
      </Panel>
    </form>
  );
};

const BucketForm: React.FC<{ storage: AdminStorage; purpose: StoragePurpose }> = ({ storage, purpose }) => {
  const meta = STORAGE_PURPOSES.find((p) => p.id === purpose)!;
  const { busy, error, save } = useSave(`${meta.label} : bucket enregistré`);
  const [name, setName] = useState(storage.buckets[purpose]?.name ?? '');
  const [publicUrl, setPublicUrl] = useState(storage.buckets[purpose]?.publicUrl ?? '');

  if (!storage.configured) {
    return (
      <Panel>
        <EmptyState
          title="Configurez d’abord le compte"
          description="Les buckets utilisent les clés du compte Cloudflare R2."
          action={
            <Button to={ROUTES.admin.storageSection('compte')} variant="primary">
              Configurer le compte
            </Button>
          }
        />
      </Panel>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const buckets = { ...storage.buckets, [purpose]: { name, publicUrl } } as Record<string, { name: string; publicUrl?: string }>;
        save(() => adminApi.saveStorage({ accountId: storage.accountId, buckets }));
      }}
    >
      {!storage.keyReady && <KeyNotice />}
      <Panel title={meta.label} description={meta.hint}>
        <div className="space-y-4">
          <Field label="Nom du bucket" hint="Laisse vide pour garder ce type de fichier dans la base.">
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. salacope-images" autoComplete="off" />}
          </Field>
          {meta.publicAddress && (
            <Field label="Adresse publique du bucket">
              {(id) => <Input id={id} value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="https://img.salacope.online" autoComplete="off" />}
            </Field>
          )}
        </div>
        <Footer error={error} busy={busy} disabled={!storage.keyReady} />
      </Panel>
    </form>
  );
};

/** What each kind of existing file is called on the page. */
const MIGRATION_LABEL: Record<string, string> = {
  covers: 'couvertures',
  galleries: 'galeries',
  logos: 'photos de boutique',
  banners: 'bannières',
  messages: 'pièces jointes de discussions',
  deliveries: 'fichiers de livraison',
  kyc: 'pièces d’identité',
};

/** Moves the files that are still in the database to storage, a batch at a time, with the count going down. */
const Migration: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const toast = useToast();
  const { data: left, reload } = useAdminResource(() => (enabled ? adminApi.storageMigration() : Promise.resolve({} as Record<string, number>)), [enabled]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const total = Object.values(left ?? {}).reduce((a, b) => a + b, 0);

  const run = async () => {
    setRunning(true);
    setError(undefined);
    try {
      let moved = 0;
      for (;;) {
        const report = await adminApi.migrateStorage();
        moved += report.migrated;
        if (report.migrated === 0) {
          if (report.failed) setError(`${report.failed} fichier(s) n’ont pas pu être déplacés (espace du vendeur dépassé ou image illisible) : ils restent dans la base.`);
          break;
        }
      }
      toast.success(moved ? `${moved} fichier${moved > 1 ? 's' : ''} déplacé${moved > 1 ? 's' : ''}` : 'Rien à déplacer');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
      reload();
    }
  };

  return (
    <Panel title="Fichiers existants" description="Ce qui est encore dans la base peut être déplacé vers le stockage, par petits lots. Un fichier n’est retiré de la base qu’une fois lu en retour depuis le stockage.">
      {!enabled ? (
        <p className="text-sm text-gray-500">Enregistrez d’abord le compte Cloudflare R2.</p>
      ) : !left ? (
        <SkeletonRows rows={2} />
      ) : (
        <div className="space-y-3">
          {total ? (
            <ul className="divide-y divide-gray-100 text-sm">
              {Object.entries(left).map(([key, n]) => (
                <li key={key} className="flex justify-between py-2">
                  <span className="text-gray-700">{MIGRATION_LABEL[key] ?? key}</span>
                  <span className="tabular-nums text-gray-500">{n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Tout est déjà dans le stockage.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button variant="primary" disabled={running || !total} onClick={run}>
            {running ? 'Déplacement en cours…' : 'Déplacer les fichiers existants'}
          </Button>
        </div>
      )}
    </Panel>
  );
};

const Usage: React.FC<{ storage: AdminStorage }> = ({ storage }) => (
  <Panel title="Utilisation" description={`Chaque vendeur dispose de ${Math.round(STORAGE.quotaBytes / 1024 / 1024)} Mo, ${Math.round(STORAGE.maxFileBytes / 1024 / 1024)} Mo au maximum par fichier.`}>
    {storage.usage.length ? (
      <ul className="divide-y divide-gray-100 text-sm">
        {storage.usage.map((u) => (
          <li key={u.purpose} className="flex items-center justify-between py-2">
            <span className="text-gray-700">{STORAGE_PURPOSES.find((p) => p.id === u.purpose)?.label ?? u.purpose}</span>
            <span className="tabular-nums text-gray-500">
              {u.files} fichier{u.files > 1 ? 's' : ''} · {mb(u.bytes)}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-gray-500">Aucun fichier stocké sur R2 pour l’instant.</p>
    )}
  </Panel>
);

const TITLES: Record<string, string> = {
  compte: 'Compte Cloudflare R2',
  existants: 'Fichiers existants',
  utilisation: 'Utilisation',
  ...Object.fromEntries(STORAGE_PURPOSES.map((p) => [p.id, p.label])),
};

/** `/admin/stockage/:section` — one part of the storage settings, in its own screen. */
export const AdminStorageSectionPage: React.FC = () => {
  const { section = '' } = useParams<{ section: string }>();
  const { data, error } = useAdminResource(() => adminApi.storage(), []);
  if (!(section in TITLES)) return <Navigate to={ROUTES.admin.storage} replace />;

  const purpose = STORAGE_PURPOSES.find((p) => p.id === section)?.id;
  return (
    <Page title={TITLES[section]} width="narrow" back={{ to: ROUTES.admin.storage, label: 'Stockage' }}>
      {error ? (
        <EmptyState title="Stockage indisponible" description={error} />
      ) : !data ? (
        <SkeletonRows rows={3} />
      ) : section === 'compte' ? (
        <AccountForm storage={data} />
      ) : purpose ? (
        <BucketForm storage={data} purpose={purpose} />
      ) : section === 'existants' ? (
        <Migration enabled={data.configured} />
      ) : (
        <Usage storage={data} />
      )}
    </Page>
  );
};
