import React from 'react';
import { OrderItem } from '../../types';
import { ShieldCheck, Lock, FileCheck, X, Shield } from 'lucide-react';

interface OrderSecurityModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderSecurityModal: React.FC<OrderSecurityModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      {/* Subtle click-outside backdrop */}
      <div className="absolute inset-0 bg-black/15 backdrop-blur-2xs" />

      {/* Mini dialog anchored strictly in the right toolbar section */}
      <div
        className="absolute top-14 sm:top-16 right-3 sm:right-6 w-[340px] sm:w-[410px] max-w-[calc(100vw-24px)] bg-white rounded-md border border-gray-200 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950 font-heading">
                Garanties et Sécurité Salacope
              </h3>
              <p className="text-[10px] sm:text-[11px] text-emerald-700 font-medium">
                Protocole de protection acheteur et prestataire
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-emerald-100/60 rounded-xs transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: 3 Guarantees */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs text-gray-700">
          <div className="flex items-start gap-3 p-3 rounded-xs bg-emerald-50/30 border border-emerald-100/80">
            <div className="w-7 h-7 rounded-xs bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-gray-900 text-xs">
                Paiement sous séquestre Mobile Money
              </div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                Les fonds versés via{' '}
                <strong className="text-emerald-800">
                  {order.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money Congo'}
                </strong>{' '}
                sont consignés sous séquestre. Le prestataire est garanti d'être payé dès validation de la commande, et le client est protégé contre toute non-délivrance.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xs bg-emerald-50/30 border border-emerald-100/80">
            <div className="w-7 h-7 rounded-xs bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-gray-900 text-xs">
                Preuve opposable & Traçabilité inviolable
              </div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                Chaque étape d'avancement, chaque livrable transmis et chaque action fait l'objet d'un journal d'audit horodaté certifié, juridiquement opposable lors d'un arbitrage.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xs bg-emerald-50/30 border border-emerald-100/80">
            <div className="w-7 h-7 rounded-xs bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-gray-900 text-xs">
                Canal certifié et modéré
              </div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                La messagerie directe intégrée et les fichiers échangés au sein de la plateforme constituent le seul canal officiel reconnu pour l'exécution et la médiation des litiges.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-gray-100 px-4 sm:px-5 py-3 bg-gray-50/80">
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Sécurité active 24/7 sur cette commande</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold text-gray-700 hover:text-gray-950 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
