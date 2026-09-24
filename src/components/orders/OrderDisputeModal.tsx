import React, { useState } from 'react';
import { OrderItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, ShieldAlert } from 'lucide-react';

interface OrderDisputeModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDisputeModal: React.FC<OrderDisputeModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { disputeOrder } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Veuillez préciser l\'objet de votre signalement.');
      return;
    }

    setIsSubmitting(true);
    disputeOrder(order.id, reason.trim());
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-sm border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-gray-950 font-heading">
              Signaler un problème / Litige
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
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xs text-[11px] text-amber-900 leading-relaxed">
            L'ouverture d'un litige gèle la commande et préserve l'intégralité des messages, fichiers et transactions pour examen par le support Salacope.online.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Description détaillée du problème <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Décrivez avec précision la situation rencontrée (délai dépassé, exigence non conforme au brief, etc.)..."
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:border-amber-500 focus:bg-white text-gray-900 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer shadow-2xs ${
                reason.trim()
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Déclarer le litige
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
