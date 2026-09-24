// Note de conformité : Les prestataires techniques de paiement (PSP / passerelle) ne sont
// volontairement pas nommés publiquement dans les textes légaux de la plateforme,
// conformément aux directives internes et aux accords de distribution.
import React from 'react';

export const Kyb: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold font-heading text-gray-950">
          Fiche d’Entreprise (KYB)
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dossier d'identification corporative et de conformité réglementaire.
        </p>
      </div>

      {/* Main Content — Prose standard */}
      <div className="space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
        
        {/* Section 1 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">1.</span>
            <span>Entité juridique titulaire de la plateforme</span>
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li><strong>Raison Sociale Officielle :</strong> LÍDIA &amp; MARIANA - COMÉRCIO GERAL E PRESTAÇÃO DE SERVIÇOS, LDA</li>
            <li><strong>Forme Juridique :</strong> Société à responsabilité limitée (Sociedade por Quotas – LDA de droit angolais)</li>
            <li><strong>Numéro d’Identification Fiscale (NIF) :</strong> 5001873490</li>
            <li><strong>Immatriculation Commerciale (Matrícula) :</strong> 12988-24/240321 (Conservatória do Registo Comercial de Luanda)</li>
            <li><strong>Gérance Légale :</strong> Lídia Clemencia Luemba Chivango</li>
            <li><strong>Siège Social :</strong> Luanda, République d'Angola</li>
            <li><strong>Établissement Bancaire Corporatif :</strong> Banco de Fomento Angola (BFA)</li>
            <li><strong>IBAN de l’Entité :</strong> AO0600060007718585130130</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">2.</span>
            <span>Déploiement opérationnel en République du Congo</span>
          </h3>
          <p className="mb-2">
            Salacope.online déploie son catalogue de services et produits numériques à destination des résidents et professionnels en République du Congo (Brazzaville, Pointe-Noire et ensemble du territoire national).
          </p>
          <p className="mb-1.5">
            Les paiements électroniques en Francs CFA (XAF) sont acheminés par les infrastructures agréées des opérateurs de télécommunications officiels :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li><strong>MTN Mobile Money Congo</strong> (Code réseau : MTN_MOMO_COG)</li>
            <li><strong>Airtel Money Congo</strong> (Code réseau : AIRTEL_COG)</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">3.</span>
            <span>Attestation de non-distribution de vouchers ou cartes-cadeaux</span>
          </h3>
          <p className="mb-1.5">
            Nous attestons formellement que la société LÍDIA &amp; MARIANA LDA et la plateforme Salacope.online <strong>ne vendent, ne revendent et ne distribuent aucun bon d’achat ou carte-cadeau fermée</strong> (ex : cartes PlayStation, Steam, Apple ou Xbox).
          </p>
          <p>
            L’intégralité de l’activité est exclusivement consacrée à la commercialisation de publications numériques éducatives, de formations et de prestations de services freelances délivrées par des créateurs indépendants.
          </p>
        </section>

      </div>
    </div>
  );
};
