import React, { useState } from 'react';
import { OrderItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, AlertTriangle } from 'lucide-react';

interface OrderCancellationModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderCancellationModal: React.FC<OrderCancellationModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { cancelOrder } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Veuillez préciser le motif de l\'annulation.');
      return;
    }

    setIsSubmitting(true);
    cancelOrder(order.id, reason.trim());
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-sm border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-gray-950 font-heading">
              Annuler la commande
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xs text-[11px] text-rose-800 leading-relaxed">
            Attention : L'annulation de la commande interrompt le traitement et sera consignée de façon permanente dans la timeline d'audit de la commande.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Motif de l'annulation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez la raison exacte (ex: indisponibilité technique, accord mutuel de désistement, etc.)..."
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:border-rose-500 focus:bg-white text-gray-900 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Garder la commande
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer shadow-2xs ${
                reason.trim()
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Confirmer l'annulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
