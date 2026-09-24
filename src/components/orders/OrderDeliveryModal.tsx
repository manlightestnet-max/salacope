import React, { useState, useRef } from 'react';
import { OrderItem, OrderAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface OrderDeliveryModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDeliveryModal: React.FC<OrderDeliveryModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { deliverOrder } = useAuth();
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<OrderAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const revisionCount = (order.delivery?.revisionNumber || 0) + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = Number(sizeMb) < 1
        ? `${Math.round(file.size / 1024)} Ko`
        : `${sizeMb} Mo`;

      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: OrderAttachment = {
          id: `del_file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: sizeStr,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result as string,
        };
        setFiles((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Veuillez ajouter une note explicative pour votre client.');
      return;
    }

    setIsSubmitting(true);
    deliverOrder(order.id, {
      note: note.trim(),
      files,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-sm border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-sm font-bold text-gray-950 font-heading flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Livrer la commande {revisionCount > 1 ? `(Révision #${revisionCount})` : ''}</span>
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Client : {order.buyerName} • Commande #{order.id.slice(0, 8)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Note to client */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Message et explications au client <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Expliquez ce qui a été réalisé, comment utiliser les livrables, ou ajoutez des instructions spécifiques..."
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:border-primary-600 focus:bg-white text-gray-900 transition-colors"
            />
          </div>

          {/* Deliverables Files */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Fichiers livrés (Livrables, maquettes, exports, archives)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 hover:border-primary-500 hover:bg-primary-50/20 rounded-sm p-4 text-center transition-colors cursor-pointer"
            >
              <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-primary-700 block">
                + Sélectionner les fichiers à livrer
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Formats acceptés : PDF, PNG, JPG, ZIP, MP4, etc.
              </span>
            </button>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-xs text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                      <span className="truncate font-medium text-gray-800">{file.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">({file.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Retirer ce fichier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 leading-relaxed">
              La livraison sera immédiatement consignée dans la timeline. Le statut passera à <strong>LIVRÉE</strong> et votre client pourra examiner le travail.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer shadow-2xs ${
                note.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Confirmer la livraison
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
