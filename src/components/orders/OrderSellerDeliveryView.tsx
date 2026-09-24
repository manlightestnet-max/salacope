import React from 'react';
import { OrderItem } from '../../types';
import { FileText, Download, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

interface OrderSellerDeliveryViewProps {
  order: OrderItem;
}

export const OrderSellerDeliveryView: React.FC<OrderSellerDeliveryViewProps> = ({ order }) => {
  const delivery = order.digitalDelivery;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Immédiate';
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
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-heading flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-primary-600" />
            <span>Livraison Numérique Automatisée</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Pour les produits numériques, la délivrance des accès est automatique dès confirmation du paiement Mobile Money.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Accès Délivré</span>
        </span>
      </div>

      {/* Product & File info */}
      <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xs bg-white border border-gray-200 text-primary-600 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-950 font-heading">
              {delivery?.fileName || `${order.itemTitle}.pdf`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-2">
              <span>Format : {delivery?.fileType || 'PDF'}</span>
              <span>•</span>
              <span>Taille : {delivery?.fileSize || '12.4 Mo'}</span>
              <span>•</span>
              <span>Téléchargements : {delivery?.downloadCount ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="text-[10px] text-gray-400">Date de mise à disposition</div>
          <div className="text-xs font-semibold text-gray-800 font-mono">
            {formatDate(delivery?.deliveredAt || order.createdAt)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Protection acheteur 7 jours active</span>
        </div>
        <div className="text-[10px] text-gray-400">
          Lien de téléchargement unique et sécurisé transmis au client
        </div>
      </div>
    </div>
  );
};
