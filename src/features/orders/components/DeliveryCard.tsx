import React from 'react';
import { Download, FileText } from 'lucide-react';
import { Order } from '@/shared/db';
import { Button, Card, CardBody, CardHeader, useToast } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { Perspective } from '../model';

/** What was delivered: the file for digital products, the seller's delivery for services. */
export const DeliveryCard: React.FC<{ order: Order; perspective: Perspective; bare?: boolean }> = ({ order, perspective, bare }) => {
  const toast = useToast();
  const accessible = ['delivered', 'completed', 'disputed'].includes(order.status);
  if (!accessible) return null;

  if (order.item.kind === 'digital') {
    const file = order.item.file;
    return (
      <Card>
        <CardHeader title={perspective === 'buyer' ? 'Votre fichier' : 'Fichier livré'} />
        <CardBody>
          <div className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2.5">
            <FileText className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{file?.name ?? order.item.title}</div>
              <div className="text-xs text-gray-500">{file?.format ?? 'Fichier'} · livré automatiquement au paiement</div>
            </div>
            {perspective === 'buyer' && (
              <Button
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => toast.success("Démo : le fichier réel sera servi par le serveur de stockage.")}
              >
                Télécharger
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  const delivery = order.delivery;
  if (!delivery) return null;
  const content = (
    <>
        {delivery.note && <p className="text-sm text-gray-700 whitespace-pre-line">{delivery.note}</p>}
        {delivery.files.length > 0 && (
          <ul className="space-y-1.5">
            {delivery.files.map((f) => (
              <li key={f.id}>
                <a
                  href={f.dataUrl}
                  download={f.name}
                  className="flex items-center gap-2 text-sm rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-500">{f.size}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
    </>
  );
  return bare ? (
    <div className="px-5 py-5 space-y-3">
      <p className="text-xs text-gray-500">Livré le {formatDateTime(delivery.at)}</p>
      {content}
    </div>
  ) : (
    <Card>
      <CardHeader title="Livraison" description={formatDateTime(delivery.at)} />
      <CardBody className="space-y-3">{content}</CardBody>
    </Card>
  );
};
