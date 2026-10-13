import { useRef, useState } from 'react';
import { Attachment } from '@/shared/db';
import { createId, formatFileSize } from '@/shared/lib';
import { useToast } from '@/shared/ui';
import { isImageType } from '@/shared/domain';

const MAX_BYTES = 2 * 1024 * 1024;
/** What the server takes in one send (3 Mo once encoded): checked here so the person knows before sending. */
const MAX_TOTAL_BYTES = 2.1 * 1024 * 1024;

const read = (file: File): Promise<Attachment> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: createId('att', 4),
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
      });
    reader.readAsDataURL(file);
  });

/**
 * Hidden file input + selected attachments (2 Mo max per file).
 * `maxImages`: images allowed in one send (chat: 3); the extra ones are left out, with a word why.
 */
export function useAttachments({ maxImages }: { maxImages?: number } = {}) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) toast.error(`${tooBig[0].name} dépasse 2 Mo.`);
    let accepted = picked.filter((f) => f.size <= MAX_BYTES);
    let total = files.reduce((n, f) => n + Math.round(((f.dataUrl?.length ?? 0) * 3) / 4), 0);
    const fits = accepted.filter((f) => {
      if (total + f.size > MAX_TOTAL_BYTES) return false;
      total += f.size;
      return true;
    });
    if (fits.length < accepted.length) toast.error('2 Mo au total par envoi : envoyez les autres fichiers dans le message suivant.');
    accepted = fits;
    if (maxImages !== undefined) {
      let room = maxImages - files.filter((f) => isImageType(f.type)).length;
      const kept = accepted.filter((f) => !isImageType(f.type) || room-- > 0);
      if (kept.length < accepted.length) toast.error(`${maxImages} images par message : envoyez les autres dans le message suivant.`);
      accepted = kept;
    }
    const read_ = await Promise.all(accepted.map(read));
    setFiles((prev) => [...prev, ...read_]);
  };

  return {
    files,
    inputRef,
    onChange,
    open: () => inputRef.current?.click(),
    remove: (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)),
    clear: () => setFiles([]),
  };
}
