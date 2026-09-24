import React from 'react';
import { ShieldCheck, Lock, FileCheck } from 'lucide-react';
import { OrderItem } from '../../types';

interface OrderSecurityCardProps {
  order: OrderItem;
}

export const OrderSecurityCard: React.FC<OrderSecurityCardProps> = ({ order }) => {
  return (
    <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-sm p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800">
        <ShieldCheck className="w-4 h-4 text-emerald-700" />
        <h4 className="text-xs font-bold font-heading">
          Garanties et Sécurité Salacope
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-gray-700">
        <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xs border border-emerald-100">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-gray-900">Paiement sous séquestre</div>
            <div className="text-[10px] text-gray-500">
              Fonds consignés via {order.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'} jusqu'à livraison.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xs border border-emerald-100">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-gray-900">Preuve opposable</div>
            <div className="text-[10px] text-gray-500">
              Journal horodaté et traçabilité inviolable des fichiers livrés.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xs border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-gray-900">Canal certifié</div>
            <div className="text-[10px] text-gray-500">
              Échanges internes enregistrés, protégeant acheteur et prestataire.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
