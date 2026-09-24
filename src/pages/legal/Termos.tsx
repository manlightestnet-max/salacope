// Note de conformité : Les prestataires techniques de paiement (PSP / passerelle) ne sont
// volontairement pas nommés publiquement dans les textes légaux de la plateforme,
// conformément aux directives internes et aux accords de distribution.
import React from 'react';
import { Link } from 'react-router-dom';

export const Termos: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold font-heading text-gray-950">
          Conditions Générales d'Utilisation (CGU)
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dernière mise à jour : 23 Septembre 2026
        </p>
      </div>

      {/* Content — Prose standard en 10 articles */}
      <div className="space-y-5 text-xs sm:text-sm text-gray-700 leading-relaxed">

        {/* 1. Objet */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">1.</span>
            <span>Objet</span>
          </h3>
          <p>
            Les présentes CGU régissent l'accès et l'usage de la marketplace <strong>Salacope.online</strong> (« la Plateforme »), éditée par <strong>LÍDIA &amp; MARIANA LDA</strong>, permettant à des créateurs indépendants (« les Créateurs » ou « Vendeurs ») de commercialiser des infoproduits et des services auprès d'acheteurs (« les Clients »).
          </p>
        </section>

        {/* 2. Nature du service */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">2.</span>
            <span>Nature du service — intermédiaire technique</span>
          </h3>
          <p className="mb-2">
            Salacope.online fournit exclusivement une plateforme technique de mise en relation et de commande facilitant la connexion avec les réseaux de paiement officiels (<strong>MTN MoMo, Airtel Money</strong>). Salacope.online :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>n'est pas un établissement de paiement ni un établissement de monnaie électronique ;</li>
            <li>n'est pas un agrégateur financier au sens réglementaire ;</li>
            <li>ne détient, ne conserve ni ne gère les fonds des utilisateurs sous forme de dépôts bancaires ;</li>
            <li>n'intervient pas dans la conception intellectuelle des contenus créés par les vendeurs tiers.</li>
          </ul>
        </section>

        {/* 3. KYC Créateurs */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">3.</span>
            <span>Création de compte et vérification d'identité (KYC)</span>
          </h3>
          <p>
            L'ouverture d'un compte Créateur nécessite la fourniture d'une pièce d'identité valide, d'un numéro Mobile Money enregistré au même nom et de justificatifs d'activité. Salacope.online se réserve le droit de refuser ou suspendre tout compte non conforme.
          </p>
        </section>

        {/* 4. Obligations & Interdictions */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">4.</span>
            <span>Obligations du Créateur &amp; Activités formellement interdites</span>
          </h3>
          <p className="mb-2">Le Créateur s'engage à :</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 mb-2">
            <li>Détenir l'intégralité des droits d'auteur sur les produits mis en vente ;</li>
            <li>Livrer des contenus conformes aux descriptifs et respecter les délais convenus ;</li>
            <li>Préserver la confidentialité de ses identifiants.</li>
          </ul>
          <p className="mb-1 text-xs text-gray-800 font-semibold">
            Interdiction formelle de bons d'achat et cartes-cadeaux fermées :
          </p>
          <p className="text-xs text-gray-600">
            Il est strictement prohibé de proposer sur Salacope.online : des cartes-cadeaux prépayées ou vouchers fermés (PlayStation, Steam, Apple, Google Play, etc.), des services de change de monnaies, des jeux de hasard, des cryptomonnaies ou des schémas pyramidaux. Tout manquement entraîne la clôture immédiate du compte.
          </p>
        </section>

        {/* 5. Tarification */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">5.</span>
            <span>Tarification &amp; Commissions</span>
          </h3>
          <p>
            L'inscription est gratuite, sans abonnement mensuel. Une commission de service transparente est déduite sur chaque vente réussie pour couvrir les frais de réseau Mobile Money et le séquestre. Le Créateur perçoit le montant net affiché sur son compte.
          </p>
        </section>

        {/* 6. Séquestre & Garantie */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">6.</span>
            <span>Séquestre protecteur &amp; Déblocage des fonds</span>
          </h3>
          <p>
            Les paiements sont sécurisés en séquestre technique pendant 7 jours (infoproduits) ou jusqu'à validation de livraison (services freelances). En cas de non-livraison ou de fichier défectueux, l'acheteur est remboursé selon notre <Link to="/legal/reembolso" className="text-primary-700 underline">Politique de Remboursement</Link>.
          </p>
        </section>

        {/* 7. Disponibilité */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">7.</span>
            <span>Disponibilité du service</span>
          </h3>
          <p>
            Salacope.online s'efforce d'assurer une disponibilité continue de la plateforme, hors périodes de maintenance programmée ou d'indisponibilités imprévues des réseaux télécoms.
          </p>
        </section>

        {/* 8. Responsabilité */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">8.</span>
            <span>Limitation de responsabilité</span>
          </h3>
          <p>
            Salacope.online ne peut être tenue responsable des interruptions de service ou retards imputables aux opérateurs de télécommunication (MTN, Airtel) ou à des cas de force majeure.
          </p>
        </section>

        {/* 9. Suspension & Résiliation */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">9.</span>
            <span>Suspension et résiliation</span>
          </h3>
          <p>
            Tout manquement aux présentes CGU, tentative de fraude ou violation des droits d'auteur entraîne la suspension immédiate du compte par Salacope.online.
          </p>
        </section>

        {/* 10. Droit applicable */}
        <section className="pt-2 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">10.</span>
            <span>Droit applicable et juridiction</span>
          </h3>
          <p>
            Les présentes CGU sont régies par le droit applicable à <strong>LÍDIA &amp; MARIANA LDA</strong> et aux transactions électroniques au Congo. Les litiges relèvent des juridictions compétentes.
          </p>
        </section>

      </div>
    </div>
  );
};
