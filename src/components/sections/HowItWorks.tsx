import React from 'react';
import { Container } from '../layout/Container';
import { ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <section id="comment-ca-marche" className="py-16 bg-gray-50/50 border-t border-gray-100">
      <Container size="default">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-primary-700 font-heading mb-1.5">
            Sécurité & Séquestre
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950 font-heading">
            Comment fonctionne le paiement sécurisé ?
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Les fonds restent consignés par Salacope.online jusqu'à la livraison effective du produit ou du service.
          </p>
        </div>

        {/* 3 Steps: Minimal, breathable, no heavy box borders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-xs font-bold text-primary-700 font-heading mb-2">
              01 · Commande
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 font-heading mb-1.5">
              Choisissez votre produit
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Consultez les e-books, formations ou services de créateurs congolais vérifiés. Accédez aux détails et avis clients.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold text-primary-700 font-heading mb-2">
              02 · Séquestre
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 font-heading mb-1.5">
              Paiement Mobile Money
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Réglez par MTN MoMo ou Airtel Money. Vos fonds sont sécurisés en séquestre et ne sont pas versés directement au vendeur.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold text-primary-700 font-heading mb-2">
              03 · Garantie
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 font-heading mb-1.5">
              Livraison ou remboursement
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Téléchargez votre fichier immédiatement ou validez le service. Vous bénéficiez d'une garantie de remboursement de 7 jours.
            </p>
          </div>
        </div>

        {/* Minimal text assurance row */}
        <div className="mt-12 pt-6 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
            <span>Protection acheteur sous 7 jours</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-primary-600" />
            <span>Paiement direct MTN MoMo & Airtel Money</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-primary-600" />
            <span>Remboursement garanti en cas de non-livraison</span>
          </div>
        </div>
      </Container>
    </section>
  );
};
