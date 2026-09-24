import React, { useState } from 'react';
import { OrderItem } from '../../types';
import { FileText, Download, CheckCircle2, PackageCheck, Upload, AlertCircle } from 'lucide-react';
import { OrderDeliveryModal } from './OrderDeliveryModal';

interface OrderFreelancerDeliveryViewProps {
  order: OrderItem;
}

export const OrderFreelancerDeliveryView: React.FC<OrderFreelancerDeliveryViewProps> = ({
  order,
}) => {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const delivery = order.delivery;
  const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-heading flex items-center gap-2">
            <PackageCheck className="w-3.5 h-3.5 text-primary-600" />
            <span>Livraison & Livrables du Service</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Suivi des livraisons et des fichiers transmis au client.
          </p>
        </div>

        {/* Deliver button if not finished */}
        {order.status !== 'CANCELLED' && order.status !== 'DISPUTED' && (
          <button
            type="button"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isDelivered ? 'Soumettre une révision' : 'Livrer la commande'}</span>
          </button>
        )}
      </div>

      {/* Brief / Client Instructions if available */}
      {order.brief && (order.brief.instructions || order.brief.description) && (
        <div className="p-3 bg-gray-50 border border-gray-200/70 rounded-xs space-y-1.5">
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
            Brief & Instructions du client
          </div>
          {order.brief.description && (
            <p className="text-xs text-gray-800 whitespace-pre-wrap">{order.brief.description}</p>
          )}
          {order.brief.instructions && (
            <p className="text-[11px] text-gray-600 whitespace-pre-wrap italic">
              « {order.brief.instructions} »
            </p>
          )}
        </div>
      )}

      {/* Current Delivery details */}
      {delivery ? (
        <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dernière livraison effectuée {delivery.revisionNumber ? `(Version #${delivery.revisionNumber})` : ''}</span>
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {formatDate(delivery.deliveredAt)}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xs border border-emerald-100 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
            {delivery.note}
          </div>

          {delivery.files && delivery.files.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-gray-700">Fichiers livrés ({delivery.files.length}) :</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {delivery.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-xs text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                      <span className="truncate font-medium text-gray-800" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">({file.size})</span>
                    </div>
                    {file.dataUrl && (
                      <a
                        href={file.dataUrl}
                        download={file.name}
                        className="text-gray-400 hover:text-primary-600 p-1 transition-colors"
                        title="Télécharger le livrable"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-xs flex items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Aucune livraison n'a encore été effectuée pour cette prestation.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="text-xs font-semibold text-primary-700 hover:text-primary-800 underline cursor-pointer shrink-0"
          >
            Effectuer la livraison maintenant
          </button>
        </div>
      )}

      {/* Modal */}
      <OrderDeliveryModal
        order={order}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />
    </div>
  );
};
