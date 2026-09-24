import React, { useState } from 'react';
import { X, Briefcase, Store, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: 'freelancer' | 'seller') => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, upgradeRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'freelancer' | 'seller'>('freelancer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmUpgrade = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      upgradeRole(selectedRole);
      setIsSubmitting(false);
      if (onSuccess) onSuccess(selectedRole);
      onClose();
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-gray-200 rounded-sm w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded-xs">
              Évolution de compte
            </span>
            <h2 className="text-base font-bold text-gray-950 font-heading mt-1">
              Passer au compte professionnel
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Activez instantanément votre espace de travail professionnel sur votre compte existant.
            Vous conservez l'accès intégral à vos favoris, achats et créateurs suivis.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Freelancer Option */}
            <div
              onClick={() => setSelectedRole('freelancer')}
              className={`p-4 rounded-sm border cursor-pointer transition-all ${
                selectedRole === 'freelancer'
                  ? 'border-primary-600 bg-primary-50/40 ring-1 ring-primary-600 shadow-2xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-xs flex items-center justify-center ${
                    selectedRole === 'freelancer'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                </div>
                {selectedRole === 'freelancer' && (
                  <div className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>

              <h3 className="text-xs font-bold text-gray-900 font-heading mb-1">
                Freelancer
              </h3>
              <p className="text-[11px] text-gray-500 leading-normal mb-3">
                Proposer vos services sur mesure (graphisme, vidéo, développement, rédaction).
              </p>

              <div className="space-y-1 text-[10px] text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary-600" />
                  <span>Publication de prestations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary-600" />
                  <span>Gestion des commandes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary-600" />
                  <span>Retraits MTN / Airtel MoMo</span>
                </div>
              </div>
            </div>

            {/* Seller Option */}
            <div
              onClick={() => setSelectedRole('seller')}
              className={`p-4 rounded-sm border cursor-pointer transition-all ${
                selectedRole === 'seller'
                  ? 'border-primary-600 bg-primary-50/40 ring-1 ring-primary-600 shadow-2xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-xs flex items-center justify-center ${
                    selectedRole === 'seller'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Store className="w-4 h-4" />
                </div>
                {selectedRole === 'seller' && (
                  <div className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>

              <h3 className="text-xs font-bold text-gray-900 font-heading mb-1">
                Seller
              </h3>
              <p className="text-[11px] text-gray-500 leading-normal mb-3">
                Vendre vos produits numériques téléchargeables (e-books, templates, documents).
              </p>

              <div className="space-y-1 text-[10px] text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary-600" />
                  <span>Vente de fichiers PDF / ZIP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary-600" />
                  <span>Suivi des téléchargements</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary-600" />
                  <span>Encaissement direct en FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantee / Notice */}
          <div className="p-3 bg-gray-50 rounded-sm border border-gray-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <strong>Un seul compte :</strong> Vos achats antérieurs, votre solde et vos créateurs suivis restent accessibles à tout moment depuis la barre latérale.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs rounded-sm"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmUpgrade}
            disabled={isSubmitting}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs rounded-sm font-semibold"
          >
            {isSubmitting ? 'Activation...' : `Activer le mode ${selectedRole === 'freelancer' ? 'Freelancer' : 'Seller'}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
