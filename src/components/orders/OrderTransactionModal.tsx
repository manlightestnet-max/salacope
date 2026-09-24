import React, { useState } from 'react';
import { OrderItem } from '../../types';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  X,
  Copy,
  Check,
  Printer,
} from 'lucide-react';

interface OrderTransactionModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
  isScopedToMain?: boolean;
}

export const OrderTransactionModal: React.FC<OrderTransactionModalProps> = ({
  order,
  isOpen,
  onClose,
  isScopedToMain = true,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const isService = order.itemType === 'service';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

  const formattedPrice = `${order.priceXaf.toLocaleString('fr-FR')} FCFA`;

  return (
    <div
      className={
        isScopedToMain
          ? 'absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto'
          : 'fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto'
      }
    >
      {/* Deep Dark Overlay without blur (crisp transparent black matching ProductDialog) */}
      <div
        className={
          isScopedToMain
            ? 'absolute inset-0 bg-black/75 transition-opacity cursor-pointer'
            : 'fixed inset-0 bg-black/75 transition-opacity cursor-pointer'
        }
        onClick={onClose}
        aria-label="Fermer le reçu"
      />

      {/* Receipt Paper Card (Scaffolded cleanly within CRM command view) */}
      <div
        className="relative z-10 bg-white rounded-sm border border-gray-200 shadow-2xl w-full max-w-[480px] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between gap-3 bg-gray-50/60 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                Reçu de commande
              </span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <div className="text-sm font-bold font-mono text-gray-900 flex items-center gap-1.5">
              <span className="truncate">#{order.id}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(order.id, 'id')}
                className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 shrink-0 cursor-pointer"
                title="Copier la référence"
              >
                {copiedField === 'id' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              {formatDate(order.createdAt)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xs bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer border border-gray-200 shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto custom-scrollbar flex-1 bg-white">
          {/* Item description */}
          <div className="space-y-1 pb-3 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
              Article commandé
            </div>
            <div className="text-xs sm:text-sm font-semibold text-gray-950 font-heading leading-snug">
              {order.itemTitle}
            </div>
            <div className="text-[11px] text-gray-500">
              Type : {isService ? 'Prestation Freelance' : 'Produit Numérique'}
            </div>
          </div>

          {/* Buyer info */}
          <div className="space-y-2 pb-3 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
              Acheteur
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Nom :</span>
              <span className="font-semibold text-gray-900">{order.buyerName}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Téléphone :</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-gray-900">{order.buyerPhone}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.buyerPhone, 'phone')}
                  className="text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                  title="Copier le téléphone"
                >
                  {copiedField === 'phone' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Email :</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-gray-900 truncate max-w-[200px]" title={order.buyerEmail}>
                  {order.buyerEmail}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.buyerEmail, 'email')}
                  className="text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                  title="Copier l'email"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="space-y-2 pb-3 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
              Règlement
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Moyen :</span>
              <span className="font-medium text-gray-900">
                {order.paymentChannel === 'MTN_MOMO_COG' ? 'MTN Mobile Money Congo' : 'Airtel Money Congo'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Protocole :</span>
              <span className="font-medium text-emerald-700">Sécurisé & Consigné</span>
            </div>
          </div>

          {/* Brief client if provided */}
          {order.brief && (order.brief.description || order.brief.instructions) && (
            <div className="space-y-1 pb-3 border-b border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Consignes client
              </div>
              {order.brief.description && (
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {order.brief.description}
                </p>
              )}
              {order.brief.instructions && (
                <p className="text-xs text-amber-800 bg-amber-50/70 p-2 rounded-xs border border-amber-200/60 italic">
                  « {order.brief.instructions} »
                </p>
              )}
            </div>
          )}

          {/* Financial summary (receipt ticket style) */}
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-gray-500">
              <span>Montant total :</span>
              <span className="font-mono">{formattedPrice}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500 text-[11px]">
              <span>Frais Salacope :</span>
              <span className="font-mono">Inclus</span>
            </div>

            {/* Ticket dashed separator */}
            <div className="border-t-2 border-dashed border-gray-200 pt-2.5 flex items-baseline justify-between">
              <span className="text-xs sm:text-sm font-bold text-gray-900 font-heading">
                Net reversé
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-primary-700 font-heading">
                {formattedPrice}
              </span>
            </div>
          </div>
        </div>

        {/* Receipt Actions Footer */}
        <div className="p-3.5 sm:p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Imprimer</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xs bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
