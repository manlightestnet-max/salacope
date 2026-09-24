import React from 'react';

export const Reembolso: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold font-heading text-gray-950">
          Politique de Remboursement
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dernière mise à jour : 23 Septembre 2026
        </p>
      </div>

      {/* Content — Prose standard en 4 articles */}
      <div className="space-y-5 text-xs sm:text-sm text-gray-700 leading-relaxed">
        
        {/* Article 1 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">1.</span>
            <span>Séquestre protecteur et garantie de 7 jours (infoproduits)</span>
          </h3>
          <p className="mb-2">
            Les fonds versés lors d’une commande sont consignés en séquestre technique. Ils ne sont libérés au créateur qu’après confirmation de conformité ou expiration du délai de garantie.
          </p>
          <p>
            Pour tous les e-books, templates et formations en ligne, l'acheteur bénéficie d'une période de garantie légale de <strong>7 (sept) jours calendaires</strong> à compter de la commande. Si le fichier est corrompu, incomplet ou non conforme au descriptif, l'acheteur est éligible à un remboursement intégral.
          </p>
        </section>

        {/* Article 2 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">2.</span>
            <span>Prestations de services freelance</span>
          </h3>
          <p>
            Pour les prestations sur mesure (design, développement web, mentorat), le versement au freelance est conditionné à la livraison conforme validée par l'acheteur. En cas de non-respect manifeste du délai convenu ou d'abandon de la mission, la commande est annulée et remboursée à 100%.
          </p>
        </section>

        {/* Article 3 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">3.</span>
            <span>Procédure de remboursement</span>
          </h3>
          <p>
            Toute demande s'effectue par e-mail à :{' '}
            <a href="mailto:contact@salacope.online" className="text-primary-700 font-semibold underline">
              contact@salacope.online
            </a>. Les remboursements validés sont traités sous <strong>24 à 48 heures ouvrées</strong> par reversement automatique sur le compte Mobile Money d’origine (MTN MoMo ou Airtel Money).
          </p>
        </section>

        {/* Article 4 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">4.</span>
            <span>Exclusions</span>
          </h3>
          <p>
            Ne sont pas éligibles au remboursement les prestations ayant fait l'objet d'une validation expresse sans réserve par l'acheteur, ou les demandes formulées au-delà du délai réglementaire de 7 jours sans motif valable de défaillance technique.
          </p>
        </section>

      </div>
    </div>
  );
};
