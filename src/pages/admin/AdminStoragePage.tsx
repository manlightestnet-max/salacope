import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminStorage, StoragePurpose, adminApi, useAdminResource } from '@/features/admin';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { STORAGE } from '@/shared/config/platform';

/** One bucket per purpose: where each kind of file goes. */
const PURPOSES: { id: StoragePurpose; label: string; hint: string; publicAddress?: boolean }[] = [
  { id: 'image', label: 'Images', hint: 'Couvertures, galeries, photos de boutique, bannières. Les images doivent pouvoir se charger pour tout le monde : donnez l’adresse publique du bucket.', publicAddress: true },
  { id: 'product', label: 'Fichiers des produits', hint: 'Ce que l’acheteur reçoit après paiement (e-book, archive…). Privé : téléchargé par un lien de courte durée.' },
  { id: 'chat', label: 'Discussions et livraisons', hint: 'Photos et fichiers envoyés dans les commandes. Privé : visibles seulement par l’acheteur et le vendeur.' },
  { id: 'kyc', label: 'Pièces d’identité', hint: 'Documents de vérification des vendeurs. Privé : lus seulement par le serveur, pour l’administration.' },
];

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
const Migration: React.FC<{ enabled: boolean; onDone: () => void }> = ({ enabled, onDone }) => {
  const toast = useToast();
  const { data: left, reload } = useAdminResource(() => adminApi.storageMigration(), [enabled]);
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
      onDone();
    }
  };

  return (
    <Panel title="Fichiers existants" description="Ce qui est encore dans la base peut être déplacé vers le stockage, par petits lots. Un fichier n’est retiré de la base qu’une fois lu en retour depuis le stockage.">
      {!enabled ? (
        <p className="text-sm text-gray-500">Enregistrez d’abord le stockage.</p>
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

const mb = (bytes: number) => `${(Number(bytes) / 1024 / 1024).toFixed(1)} Mo`;

const Form: React.FC<{ storage: AdminStorage; onSaved: () => void }> = ({ storage, onSaved }) => {
  const toast = useToast();
  const [accountId, setAccountId] = useState(storage.accountId);
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [buckets, setBuckets] = useState<Record<string, { name: string; publicUrl: string }>>(() =>
    Object.fromEntries(PURPOSES.map((p) => [p.id, { name: storage.buckets[p.id]?.name ?? '', publicUrl: storage.buckets[p.id]?.publicUrl ?? '' }]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [results, setResults] = useState<{ purpose: StoragePurpose; ok: boolean; message: string }[]>();
  useEffect(() => setAccountId(storage.accountId), [storage.accountId]);

  const set = (id: string, field: 'name' | 'publicUrl', value: string) => setBuckets((b) => ({ ...b, [id]: { ...b[id], [field]: value } }));

  const run = async (work: () => Promise<void>, done?: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await work();
      if (done) toast.success(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      await adminApi.saveStorage({ accountId, accessKeyId, secretAccessKey, buckets });
      setAccessKeyId('');
      setSecretAccessKey('');
      setResults(undefined);
      onSaved();
    }, 'Stockage enregistré');

  const test = () =>
    run(async () => {
      setResults(await adminApi.testStorage());
    });

  return (
    <div className="space-y-4">
      {!storage.keyReady && (
        <p className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          La clé de chiffrement manque sur le serveur : ajoutez <code className="font-mono">SALACOPE_SETTINGS_KEY</code> (32 octets en base64) dans l’environnement, puis rechargez. Tant qu’elle manque, aucune clé ne peut être enregistrée.
        </p>
      )}

      <Panel
        title="Stockage R2 (fichiers et images)"
        description="Les clés d’accès sont chiffrées en base et ne s’affichent plus jamais. Tant que R2 n’est pas configuré, les fichiers restent dans la base."
        actions={<span className="text-xs font-mono text-gray-500">{storage.configured ? 'CONFIGURÉ' : 'NON CONFIGURÉ'}</span>}
      >
        <div className="space-y-4 max-w-2xl">
          <Field label="R2 : identifiant de compte Cloudflare">{(id) => <Input id={id} value={accountId} onChange={(e) => setAccountId(e.target.value)} autoComplete="off" />}</Field>
          <Field label="R2 : clé d’accès (Access Key ID)">
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
          <Field label="R2 : clé secrète (Secret Access Key)">
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
      </Panel>

      <Panel title="Buckets par usage" description="Un bucket par type de fichier, ou le même pour plusieurs : les fichiers sont rangés par dossier. Un usage sans bucket reste dans la base.">
        <div className="space-y-5">
          {PURPOSES.map((p) => (
            <div key={p.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-4 items-start">
              <div className="min-w-0 md:col-span-2">
                <p className="text-sm font-medium text-gray-900">{p.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.hint}</p>
              </div>
              <Field label="Nom du bucket">{(id) => <Input id={id} value={buckets[p.id].name} onChange={(e) => set(p.id, 'name', e.target.value)} placeholder="ex. salacope-images" autoComplete="off" />}</Field>
              {p.publicAddress && (
                <Field label="Adresse publique du bucket">
                  {(id) => <Input id={id} value={buckets[p.id].publicUrl} onChange={(e) => set(p.id, 'publicUrl', e.target.value)} placeholder="https://img.salacope.online" autoComplete="off" />}
                </Field>
              )}
              {results?.find((r) => r.purpose === p.id) && (
                <p className={`md:col-span-2 text-xs flex items-center gap-1.5 ${results.find((r) => r.purpose === p.id)!.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                  {results.find((r) => r.purpose === p.id)!.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {results.find((r) => r.purpose === p.id)!.message}
                </p>
              )}
            </div>
          ))}
        </div>
        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy || !storage.keyReady} onClick={save}>
            Enregistrer R2
          </Button>
          <Button disabled={busy || !storage.configured} onClick={test}>
            Tester la connexion
          </Button>
        </div>
      </Panel>

      <Migration enabled={storage.configured} onDone={onSaved} />

      <Panel title="Utilisation" description={`Chaque vendeur dispose de ${Math.round(STORAGE.quotaBytes / 1024 / 1024)} Mo, ${Math.round(STORAGE.maxFileBytes / 1024 / 1024)} Mo au maximum par fichier.`}>
        {storage.usage.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {storage.usage.map((u) => (
              <li key={u.purpose} className="flex items-center justify-between py-2">
                <span className="text-gray-700">{PURPOSES.find((p) => p.id === u.purpose)?.label ?? u.purpose}</span>
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
    </div>
  );
};

/** Where files are kept: the R2 account and one bucket per kind of file. */
export const AdminStoragePage: React.FC = () => {
  const { data, error, loading, reload } = useAdminResource(() => adminApi.storage(), []);
  return (
    <Page title="Stockage" help="Où sont gardés les fichiers : images, produits, pièces jointes et pièces d’identité. Les clés sont chiffrées et ne s’affichent plus après l’enregistrement.">
      {error ? <EmptyState title="Stockage indisponible" description={error} /> : !data || loading ? <SkeletonRows rows={4} /> : <Form storage={data} onSaved={reload} />}
    </Page>
  );
};
