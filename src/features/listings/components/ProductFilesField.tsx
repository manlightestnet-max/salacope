import React, { useRef, useState } from 'react';
import { Eye, UploadCloud, X } from 'lucide-react';
import clsx from 'clsx';
import { Field, FileRow, Skeleton, Switch } from '@/shared/ui';
import { PLATFORM } from '@/shared/config/platform';
import { fileFormat } from '@/shared/lib';
import { ListingInput } from '../api';
import { discardUpload, formatBytes, uploadProductFile, useStorageUsage } from '../uploads';

/** A file being sent (or that failed): shown under the ones already kept. */
interface Sending {
  key: number;
  name: string;
  size: number;
  progress: number;
  error?: string;
}

let counter = 0;

const closeButton = 'w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700';

/**
 * The files a buyer receives. The seller drops or picks as many as the administration allows; each one goes straight to storage
 * (Cloudflare R2) with its own progress, and can be marked as a free sample that anyone may download from the offer page. Nothing is
 * ever kept in the database.
 */
export const ProductFilesField: React.FC<{ form: ListingInput; setForm: React.Dispatch<React.SetStateAction<ListingInput>>; listingId?: string }> = ({
  form,
  setForm,
  listingId,
}) => {
  const { usage, loaded, reload } = useStorageUsage();
  const picker = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState<Sending[]>([]);
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string>();
  const files = form.files ?? [];
  const max = PLATFORM.maxProductFiles;
  const room = max - files.length - sending.length;

  if (!loaded) return <Skeleton className="h-28 w-full rounded-2xl" />;

  if (!usage?.product) {
    // Files only ever go to storage (never into the database): until Salacope has set it up, nothing can be sent.
    return (
      <Field label="Fichiers livrés">
        {() => (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500">
            L’envoi de fichiers n’est pas encore ouvert sur Salacope. Revenez dans un moment pour créer ce produit.
          </p>
        )}
      </Field>
    );
  }

  const patch = (key: number, change: Partial<Sending>) => setSending((all) => all.map((u) => (u.key === key ? { ...u, ...change } : u)));

  const send = async (file: File) => {
    const key = (counter += 1);
    setSending((all) => [...all, { key, name: file.name, size: file.size, progress: 0 }]);
    try {
      const up = await uploadProductFile(file, (progress) => patch(key, { progress }), listingId);
      setForm((f) => ({ ...f, files: [...(f.files ?? []), { name: up.name, format: fileFormat(up.name), fileId: up.id, size: up.size }] }));
      setSending((all) => all.filter((u) => u.key !== key));
      reload();
    } catch (e) {
      patch(key, { error: (e as Error).message });
    }
  };

  const add = async (picked: FileList | null) => {
    if (!picked?.length) return;
    const problems: string[] = [];
    const accepted: File[] = [];
    let slots = room;
    let used = usage.usedBytes + sending.reduce((n, u) => n + (u.error ? 0 : u.size), 0);
    for (const file of Array.from(picked)) {
      if (slots <= 0) {
        problems.push(`${max} fichiers au maximum : « ${file.name} » n’a pas été ajouté.`);
      } else if (file.size > usage.maxFileBytes) {
        problems.push(`« ${file.name} » est trop lourd : ${formatBytes(usage.maxFileBytes)} au maximum.`);
      } else if (used + file.size > usage.quotaBytes) {
        problems.push(`Espace insuffisant pour « ${file.name} » : il vous reste ${formatBytes(Math.max(0, usage.quotaBytes - used))} sur ${formatBytes(usage.quotaBytes)}.`);
      } else {
        accepted.push(file);
        slots -= 1;
        used += file.size;
      }
    }
    setNotice(problems.join(' ') || undefined);
    // One after the other: a phone on a mobile network sends one file faster than three at once.
    for (const file of accepted) await send(file);
  };

  const remove = (fileId: string) => {
    setNotice(undefined);
    setForm((f) => ({ ...f, files: (f.files ?? []).filter((x) => x.fileId !== fileId) }));
    // A file sent today and not kept frees its space at once; one the offer already lists is dropped when the offer is saved.
    void discardUpload(fileId).then(reload);
  };

  const toggleSample = (fileId: string, preview: boolean) =>
    setForm((f) => ({ ...f, files: (f.files ?? []).map((x) => (x.fileId === fileId ? { ...x, preview } : x)) }));

  const used = Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100));
  const samples = files.filter((f) => f.preview).length;
  const tooMany = files.length > max;
  const count = files.length + sending.length;

  return (
    <Field
      label="Fichiers livrés"
      hint="Le client reçoit tous ces fichiers après paiement. Un aperçu gratuit peut être téléchargé par tout le monde depuis la page de l’offre."
      error={tooMany ? `Cette offre a ${files.length} fichiers et le maximum est ${max} : retirez-en ${files.length - max}.` : notice}
      action={
        <span className="text-xs text-gray-500 tabular-nums">
          {count} / {max}
        </span>
      }
    >
      {() => (
        <div className="space-y-2">
          {files.map((file) => (
            <FileRow
              key={file.fileId}
              name={file.name}
              meta={`${file.format}${file.size ? ` · ${formatBytes(file.size)}` : ''}${file.preview ? ' · aperçu gratuit' : ''}`}
              trailing={
                <button type="button" aria-label={`Retirer ${file.name}`} onClick={() => file.fileId && remove(file.fileId)} className={closeButton}>
                  <X className="w-4 h-4" />
                </button>
              }
              below={
                files.length > 1 || file.preview ? (
                  <Switch
                    checked={Boolean(file.preview)}
                    onChange={(on) => file.fileId && toggleSample(file.fileId, on)}
                    icon={<Eye className="w-4 h-4" />}
                    label="Aperçu gratuit"
                    description={file.preview ? 'Téléchargeable sans acheter' : 'Réservé aux acheteurs'}
                  />
                ) : undefined
              }
            />
          ))}

          {sending.map((u) => (
            <FileRow
              key={u.key}
              name={u.name}
              meta={u.error ? formatBytes(u.size) : `Envoi en cours · ${Math.round(u.progress * 100)} %`}
              trailing={
                u.error ? (
                  <button type="button" aria-label={`Fermer ${u.name}`} onClick={() => setSending((all) => all.filter((x) => x.key !== u.key))} className={closeButton}>
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
              below={
                u.error ? (
                  <p className="text-xs text-red-600" role="alert">
                    {u.error}
                  </p>
                ) : (
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={Math.round(u.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-accent transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </div>
                )
              }
            />
          ))}

          {room > 0 ? (
            <button
              type="button"
              onClick={() => picker.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                void add(e.dataTransfer.files);
              }}
              className={clsx(
                'w-full rounded-2xl border-2 border-dashed px-4 text-center transition-colors motion-reduce:transition-none',
                count === 0 ? 'py-8' : 'py-4',
                over ? 'border-accent bg-accent/5' : 'border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400'
              )}
            >
              <span className="mx-auto mb-2 w-11 h-11 rounded-full bg-surface border border-gray-200 text-gray-500 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </span>
              <span className="block text-sm font-medium text-gray-900">{count === 0 ? 'Ajoutez vos fichiers' : 'Ajouter un fichier'}</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                <span className="sm:hidden">Touchez pour choisir</span>
                <span className="hidden sm:inline">Glissez-déposez ou parcourez</span> · {formatBytes(usage.maxFileBytes)} au plus par fichier
              </span>
            </button>
          ) : (
            <p className="rounded-2xl bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
              {max > 1 ? `Vous avez atteint le maximum de ${max} fichiers pour un produit.` : 'Un seul fichier par produit.'}
            </p>
          )}
          <input
            ref={picker}
            type="file"
            multiple={max > 1}
            className="hidden"
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = '';
            }}
          />

          {samples > 0 && files.length > samples && (
            <p className="text-xs text-gray-500">
              {samples} aperçu{samples > 1 ? 's' : ''} gratuit{samples > 1 ? 's' : ''} sur la page de l’offre, {files.length - samples} fichier{files.length - samples > 1 ? 's' : ''} réservé{files.length - samples > 1 ? 's' : ''} aux acheteurs.
            </p>
          )}

          <div>
            <div className="h-1 rounded-full bg-gray-100 overflow-hidden" aria-hidden>
              <div className={used > 90 ? 'h-full bg-red-500' : 'h-full bg-gray-400'} style={{ width: `${used}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-gray-500 tabular-nums">
              Espace utilisé : {formatBytes(usage.usedBytes)} sur {formatBytes(usage.quotaBytes)}
            </p>
          </div>
        </div>
      )}
    </Field>
  );
};
