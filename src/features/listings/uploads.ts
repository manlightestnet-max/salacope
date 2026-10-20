import { useEffect, useState } from 'react';
import { request } from '@/shared/api';
import { formatFileSize } from '@/shared/lib';

/** What storage offers this person: which kinds of file can be kept, and the room left. */
export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  maxFileBytes: number;
  product: boolean;
  chat: boolean;
  image: boolean;
}

let usageCache: StorageUsage | null = null;

/** Storage capabilities and the seller's space (the last known values at once, refreshed in the background). */
export function useStorageUsage(): { usage: StorageUsage | null; loaded: boolean; reload: () => void } {
  const [usage, setUsage] = useState<StorageUsage | null>(usageCache);
  const [loaded, setLoaded] = useState(Boolean(usageCache));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    request<StorageUsage>('GET', '/files/usage').then(
      (u) => {
        usageCache = u;
        if (live) {
          setUsage(u);
          setLoaded(true);
        }
      },
      () => live && setLoaded(true)
    );
    return () => {
      live = false;
    };
  }, [tick]);
  return { usage, loaded, reload: () => setTick((n) => n + 1) };
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

/**
 * Sends the file of a digital product straight to storage: the server hands out a short-lived address, the browser puts the
 * file there (with progress), then the server checks it arrived. A failure leaves nothing behind that counts.
 */
export async function uploadProductFile(file: File, onProgress: (fraction: number) => void, ref?: string): Promise<UploadedFile> {
  const type = file.type || 'application/octet-stream';
  const { id, uploadUrl } = await request<{ id: string; uploadUrl: string }>('POST', '/files/sign', { purpose: 'product', name: file.name, type, size: file.size, ref });
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', type);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('L’envoi a été refusé par le stockage. Réessayez.')));
      // The browser gives no detail when storage turns the request down (a site it does not allow yet looks like a lost connection).
      xhr.onerror = () => reject(new Error('L’envoi a échoué : connexion coupée, ou stockage pas encore prêt à recevoir les fichiers. Réessayez ; si cela continue, écrivez au support.'));
      xhr.send(file);
    });
  } catch (e) {
    // Nothing arrived: the reservation made for it is given back at once.
    void discardUpload(id);
    throw e;
  }
  await request('POST', `/files/${encodeURIComponent(id)}/complete`);
  usageCache = null;
  return { id, name: file.name, size: file.size };
}

/** The seller takes back a file they sent and did not keep (best effort: the server refuses one an offer still lists). */
export async function discardUpload(fileId: string): Promise<void> {
  await request('DELETE', `/files/${encodeURIComponent(fileId)}`).catch(() => undefined);
  usageCache = null;
}

export const formatBytes = formatFileSize;
