import React from 'react';

export const Privacidade: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold font-heading text-gray-950">
          Politique de Confidentialité
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dernière mise à jour : 23 Septembre 2026
        </p>
      </div>

      {/* Content — Prose standard en 8 articles */}
      <div className="space-y-5 text-xs sm:text-sm text-gray-700 leading-relaxed">
        
        {/* 1. Introduction */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">1.</span>
            <span>Introduction</span>
          </h3>
          <p>
            La société <strong>LÍDIA &amp; MARIANA LDA</strong>, opératrice de <strong>Salacope.online</strong>, veille à la protection des données personnelles de ses Créateurs et Acheteurs. Cette politique résume la collecte, l'usage et vos droits relatifs à vos données.
          </p>
        </section>

        {/* 2. Données collectées */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">2.</span>
            <span>Données collectées</span>
          </h3>
          <p className="mb-2">Selon votre utilisation de Salacope.online, nous collectons les données suivantes :</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li><strong>Compte Créateur :</strong> nom, e-mail, numéro Mobile Money (MTN MoMo ou Airtel Money) et pièce d'identité pour la conformité KYC.</li>
            <li><strong>Clients et Acheteurs :</strong> nom, e-mail de réception des liens et factures, et numéro Mobile Money servant au règlement.</li>
            <li><strong>Données de transaction :</strong> montant en FCFA (XAF), référence de transaction Mobile Money, date et statut du séquestre.</li>
            <li><strong>Données techniques de sécurité :</strong> adresse IP et journaux de connexion sécurisés aux fins exclusives de prévention anti-fraude.</li>
          </ul>
        </section>

        {/* 3. Finalités du traitement */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">3.</span>
            <span>Finalités du traitement</span>
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>Création et gestion des comptes utilisateurs et vérification d'identité KYC.</li>
            <li>Traitement technique des commandes et déclenchement des demandes de débit Mobile Money.</li>
            <li>Délivrance immédiate des infoproduits achetés et gestion du séquestre protecteur.</li>
            <li>Prévention de la fraude et respect des obligations légales et comptables.</li>
          </ul>
        </section>

        {/* 4. Partage des données */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">4.</span>
            <span>Partage des données et absence de revente</span>
          </h3>
          <p className="mb-2">
            Les données sont transmises exclusivement aux opérateurs de télécommunication concernés (<strong>MTN Congo</strong> et <strong>Airtel Congo</strong>) pour valider l'opération de paiement.
          </p>
          <p>
            Salacope.online ne vend, ne loue, ni ne cède aucune donnée personnelle à des tiers à des fins publicitaires ou commerciales.
          </p>
        </section>

        {/* 5. Durée de conservation */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">5.</span>
            <span>Durée de conservation</span>
          </h3>
          <p>
            Les données sont conservées pendant la durée de la relation contractuelle, puis archivées selon les obligations légales applicables avant suppression définitive.
          </p>
        </section>

        {/* 6. Sécurité des données */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">6.</span>
            <span>Sécurité des données et authentification USSD</span>
          </h3>
          <p>
            Toutes les connexions sont chiffrées en SSL/TLS (HTTPS). Salacope.online ne demande et ne stocke <strong>jamais votre code PIN Mobile Money</strong>. La saisie du code secret se fait exclusivement sur le menu USSD sécurisé de votre propre opérateur téléphonique.
          </p>
        </section>

        {/* 7. Vos droits */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">7.</span>
            <span>Vos droits</span>
          </h3>
          <p>
            Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données en écrivant à :{' '}
            <a href="mailto:contact@salacope.online" className="text-primary-700 font-semibold underline">
              contact@salacope.online
            </a>.
          </p>
        </section>

        {/* 8. Modifications */}
        <section className="pt-2 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">8.</span>
            <span>Modifications</span>
          </h3>
          <p className="text-xs text-gray-500">
            Cette politique peut être mise à jour pour s'adapter aux évolutions légales. Consultez-la régulièrement.
          </p>
        </section>

      </div>
    </div>
  );
};
