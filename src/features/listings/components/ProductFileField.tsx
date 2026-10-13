import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { Button, Field, Skeleton } from '@/shared/ui';
import { ListingInput } from '../api';
import { formatBytes, uploadProductFile, useStorageUsage } from '../uploads';

const FORMAT_BY_EXTENSION: Record<string, string> = { pdf: 'PDF', epub: 'EPUB', zip: 'ZIP', docx: 'DOCX', xlsx: 'XLSX', pptx: 'PPTX', mp4: 'Vidéo', mp3: 'Audio' };
const formatFromFileName = (name: string) => FORMAT_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''];

/**
 * The file a buyer receives: the seller picks it, it is sent straight to storage (Cloudflare R2) with a progress bar, and the
 * buyer later downloads exactly that file. Nothing is ever kept in the database.
 */
export const ProductFileField: React.FC<{ form: ListingInput; setForm: React.Dispatch<React.SetStateAction<ListingInput>>; listingId?: string }> = ({
  form,
  setForm,
  listingId,
}) => {
  const { usage, loaded, reload } = useStorageUsage();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();

  if (!loaded) return <Skeleton className="h-16 w-full rounded-lg" />;

  if (!usage?.product) {
    // Files only ever go to storage (never into the database): until Salacope has set it up, nothing can be sent.
    return (
      <Field label="Fichier livré">
        {() => (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500">
            L’envoi de fichiers n’est pas encore ouvert sur Salacope. Revenez dans un moment pour créer ce produit.
          </p>
        )}
      </Field>
    );
  }

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    if (file.size > usage.maxFileBytes) return setError(`Fichier trop lourd : ${formatBytes(usage.maxFileBytes)} au maximum.`);
    if (usage.usedBytes + file.size > usage.quotaBytes) {
      return setError(`Espace insuffisant : il vous reste ${formatBytes(Math.max(0, usage.quotaBytes - usage.usedBytes))} sur ${formatBytes(usage.quotaBytes)}.`);
    }
    setProgress(0);
    try {
      const uploaded = await uploadProductFile(file, setProgress, listingId);
      setForm((f) => ({ ...f, fileId: uploaded.id, fileSize: uploaded.size, fileName: uploaded.name, fileFormat: formatFromFileName(uploaded.name) ?? f.fileFormat }));
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const used = Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100));
  const uploading = progress !== null;

  return (
    <Field label="Fichier livré" hint={`Envoyé sur notre stockage sécurisé, téléchargé par le client après paiement. ${formatBytes(usage.maxFileBytes)} au maximum.`} error={error}>
      {() => (
        <div className="space-y-2.5">
          {form.fileId && !uploading ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface px-3 h-12">
              <FileText className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 text-sm text-gray-900 truncate">{form.fileName}</span>
              <span className="shrink-0 text-xs text-gray-500 tabular-nums">{form.fileSize ? formatBytes(form.fileSize) : ''}</span>
              <button
                type="button"
                aria-label="Retirer le fichier"
                onClick={() => setForm((f) => ({ ...f, fileId: undefined, fileSize: undefined, fileName: '' }))}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {uploading ? (
            <div className="rounded-lg border border-gray-200 bg-surface px-3 py-3" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Envoi en cours…</span>
                <span className="tabular-nums">{Math.round(progress * 100)} %</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-accent transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          ) : (
            <Button type="button" icon={<UploadCloud className="w-4 h-4" />} onClick={() => input.current?.click()}>
              {form.fileId ? 'Remplacer le fichier' : 'Choisir le fichier'}
            </Button>
          )}
          <input
            ref={input}
            type="file"
            className="hidden"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

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
