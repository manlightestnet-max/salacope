import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const CreatorCTA: React.FC = () => {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <Container size="default">
        <div className="max-w-3xl mx-auto text-center">
          
          <div className="text-xs font-bold uppercase tracking-wider text-primary-700 font-heading mb-2">
            Espace Créateurs & Indépendants
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-gray-950 tracking-tight leading-snug">
            Vendez vos infoproduits et prestations au Congo.
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xl mx-auto">
            Auteurs, développeurs, formateurs et graphistes : créez votre vitrine et encaissez automatiquement par MTN MoMo et Airtel Money.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              Mise en ligne rapide
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              Règlement en Francs CFA
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              Retraits automatisés
            </span>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              to="/vendre"
              variant="outline"
              size="md"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              iconPosition="right"
              className="rounded-sm font-semibold"
            >
              Devenir créateur
            </Button>
          </div>

        </div>
      </Container>
    </section>
  );
};
