import React from 'react';
import { Container } from '../layout/Container';
import { Smartphone } from 'lucide-react';

export const PaymentPartners: React.FC = () => {
  return (
    <section className="bg-gray-50/60 border-t border-gray-100 py-8">
      <Container size="default">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-1.5 text-primary-700 text-xs font-bold uppercase tracking-wider font-heading">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Réseaux Mobile Money Agréés</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Paiement instantané en Francs CFA (XAF) sur smartphone avec les opérateurs autorisés en République du Congo.
            </p>
          </div>

          {/* Badges without heavy borders */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              <span className="w-5 h-5 rounded-xs bg-yellow-400 text-gray-950 font-black text-[9px] flex items-center justify-center">
                M
              </span>
              <span>MTN MoMo Congo</span>
            </div>

            <span className="text-gray-300">·</span>

            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              <span className="w-5 h-5 rounded-xs bg-red-600 text-white font-black text-[9px] flex items-center justify-center">
                A
              </span>
              <span>Airtel Money Congo</span>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
};
