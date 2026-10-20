import React from 'react';
import { Download } from 'lucide-react';
import { Listing } from '@/shared/db';
import { downloadSample } from '@/shared/api';
import { filesOf } from '@/shared/domain';
import { Button, FileRow } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatFileSize } from '@/shared/lib';

/**
 * What a digital product contains, on the offer page: each file with its kind and size, and a button on the ones the seller offers
 * as a free sample. Shown only when it says more than the rest of the page (several files, or at least one sample).
 */
export const ListingFilesSection: React.FC<{ listing: Listing }> = ({ listing }) => {
  const run = useServiceAction();
  const files = filesOf(listing.file);
  if (listing.kind !== 'digital' || !files.length || (files.length < 2 && !files.some((f) => f.preview))) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-2">{files.length > 1 ? `${files.length} fichiers inclus` : 'Fichier inclus'}</h2>
      <div className="space-y-2">
        {files.map((f, i) => (
          <FileRow
            key={f.fileId ?? i}
            name={f.name}
            meta={`${f.format}${f.size ? ` · ${formatFileSize(f.size)}` : ''}`}
            trailing={
              f.preview && f.fileId ? (
                <Button size="sm" pill variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={() => run(() => downloadSample(listing.id, f.fileId!))}>
                  Aperçu gratuit
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
};
