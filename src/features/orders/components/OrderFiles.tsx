import React from 'react';
import { Download } from 'lucide-react';
import { Order } from '@/shared/db';
import { downloadOrderFile, downloadOrderFiles } from '@/shared/api';
import { filesOf } from '@/shared/domain';
import { Button, FileRow } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatFileSize } from '@/shared/lib';

/**
 * Every file of a digital product, each with its own download, and one button to take them all. The same list for the buyer and for
 * the seller's own copy; the server decides who may download and when.
 */
export const OrderFiles: React.FC<{ order: Order; available: boolean }> = ({ order, available }) => {
  const run = useServiceAction();
  const files = filesOf(order.item.file);
  const rows = files.length ? files : [{ name: order.item.title, format: 'Fichier', fileId: undefined, size: undefined }];
  const ids = files.flatMap((f) => (f.fileId ? [f.fileId] : []));
  return (
    <div className="space-y-2">
      {rows.map((f, i) => (
        <FileRow
          key={f.fileId ?? i}
          name={f.name}
          meta={`${f.format}${f.size ? ` · ${formatFileSize(f.size)}` : ''}`}
          trailing={
            <Button size="sm" pill variant={rows.length > 1 ? 'secondary' : 'primary'} disabled={!available} icon={<Download className="w-3.5 h-3.5" />} onClick={() => run(() => downloadOrderFile(order.id, f.fileId))}>
              Télécharger
            </Button>
          }
        />
      ))}
      {ids.length > 1 && (
        <Button block pill variant="primary" disabled={!available} icon={<Download className="w-4 h-4" />} onClick={() => run(() => downloadOrderFiles(order.id, ids))}>
          Tout télécharger ({ids.length})
        </Button>
      )}
    </div>
  );
};
