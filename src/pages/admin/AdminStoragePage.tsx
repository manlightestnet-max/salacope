import React, { useState } from 'react';
import { AlertTriangle, Database, FolderInput, HardDrive, KeyRound } from 'lucide-react';
import { StoragePurpose, adminApi, useAdminResource } from '@/features/admin';
import { Badge, Button, EmptyState, List, ListRow, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';

/** One bucket per purpose: where each kind of file goes. */
export const STORAGE_PURPOSES: { id: StoragePurpose; label: string; hint: string; publicAddress?: boolean }[] = [
  { id: 'image', label: 'Images', hint: 'Couvertures, galeries, photos de boutique, bannières. Les images doivent pouvoir se charger pour tout le monde : donnez l’adresse publique du bucket.', publicAddress: true },
  { id: 'product', label: 'Fichiers des produits', hint: 'Ce que l’acheteur reçoit après paiement (e-book, archive…). Privé : téléchargé par un lien de courte durée.' },
  { id: 'chat', label: 'Discussions et livraisons', hint: 'Photos et fichiers envoyés dans les commandes. Privé : visibles seulement par l’acheteur et le vendeur.' },
  { id: 'kyc', label: 'Pièces d’identité', hint: 'Documents de vérification des vendeurs. Privé : lus seulement par le serveur, pour l’administration.' },
];

export const mb = (bytes: number) => `${(Number(bytes) / 1024 / 1024).toFixed(1)} Mo`;

const Status: React.FC<{ done: boolean; doneLabel?: string }> = ({ done, doneLabel = 'Configuré' }) =>
  done ? (
    <Badge tone="success" dot>
      {doneLabel}
    </Badge>
  ) : (
    <Badge>À configurer</Badge>
  );

const icon = (Icon: React.ElementType) => (
  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
);

/** Where files are kept: each part opens in its own screen and comes back marked as configured. */
export const AdminStoragePage: React.FC = () => {
  const toast = useToast();
  const { data, error } = useAdminResource(() => adminApi.storage(), []);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{ purpose: StoragePurpose; ok: boolean; message: string }[]>();
  const left = useAdminResource(() => (data?.configured ? adminApi.storageMigration() : Promise.resolve(undefined)), [data?.configured]).data;
  const pending = Object.values(left ?? {}).reduce((a, b) => a + b, 0);

  const test = async () => {
    setTesting(true);
    try {
      setResults(await adminApi.testStorage());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const section = (id: string) => ROUTES.admin.storageSection(id);
  const files = data?.usage.reduce((n, u) => n + u.files, 0) ?? 0;
  const bytes = data?.usage.reduce((n, u) => n + Number(u.bytes), 0) ?? 0;

  return (
    <Page
      title="Stockage"
      width="narrow"
      help="Où sont gardés les fichiers : images, produits, pièces jointes et pièces d’identité. Les clés sont chiffrées et ne s’affichent plus après l’enregistrement."
      actions={
        <Button disabled={testing || !data?.configured} loading={testing} onClick={test}>
          Tester la connexion
        </Button>
      }
    >
      {error ? (
        <EmptyState title="Stockage indisponible" description={error} />
      ) : !data ? (
        <SkeletonRows rows={4} />
      ) : (
        <div className="space-y-4">
          {!data.keyReady && (
            <p className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                La clé de chiffrement manque sur le serveur : ajoutez <code className="font-mono">SALACOPE_SETTINGS_KEY</code> (32 octets en base64) dans l’environnement, puis rechargez. Tant qu’elle manque, aucune clé ne peut être enregistrée.
              </span>
            </p>
          )}

          <Panel title="Compte" flush>
            <List>
              <ListRow
                to={section('compte')}
                leading={icon(KeyRound)}
                title="Compte Cloudflare R2"
                subtitle={data.configured ? `Clé ${data.accessKey ?? ''}` : 'Identifiant de compte et clés d’accès'}
                meta={<Status done={data.configured} />}
              />
            </List>
          </Panel>

          <Panel title="Buckets par usage" description="Un usage sans bucket reste dans la base." flush>
            <List>
              {STORAGE_PURPOSES.map((p) => {
                const bucket = data.buckets[p.id];
                const result = results?.find((r) => r.purpose === p.id);
                return (
                  <ListRow
                    key={p.id}
                    to={section(p.id)}
                    leading={icon(Database)}
                    title={p.label}
                    subtitle={result && !result.ok ? result.message : bucket ? bucket.name : 'Aucun bucket'}
                    meta={
                      result ? (
                        <Badge tone={result.ok ? 'success' : 'danger'} dot>
                          {result.ok ? 'Connexion réussie' : 'Échec'}
                        </Badge>
                      ) : (
                        <Status done={Boolean(bucket)} />
                      )
                    }
                  />
                );
              })}
            </List>
          </Panel>

          <Panel title="Fichiers" flush>
            <List>
              <ListRow
                to={section('existants')}
                leading={icon(FolderInput)}
                title="Fichiers existants"
                subtitle="Déplacer ce qui est encore dans la base"
                meta={data.configured ? pending ? <Badge tone="warning">{pending} à déplacer</Badge> : left ? <Badge tone="success" dot>Tout déplacé</Badge> : undefined : undefined}
              />
              <ListRow
                to={section('utilisation')}
                leading={icon(HardDrive)}
                title="Utilisation"
                subtitle={files ? `${files} fichier${files > 1 ? 's' : ''} · ${mb(bytes)}` : 'Aucun fichier stocké sur R2'}
              />
            </List>
          </Panel>
        </div>
      )}
    </Page>
  );
};
