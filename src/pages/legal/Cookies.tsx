import React from 'react';

export const Cookies: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold font-heading text-gray-950">
          Politique de Cookies
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dernière mise à jour : 23 Septembre 2026
        </p>
      </div>

      {/* Content — Prose standard en 5 articles */}
      <div className="space-y-5 text-xs sm:text-sm text-gray-700 leading-relaxed">
        
        {/* Article 1 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">1.</span>
            <span>Qu'est-ce qu'un cookie ?</span>
          </h3>
          <p>
            Un cookie est un petit fichier texte déposé sur votre terminal lors de la consultation d'un site internet. Il permet notamment de reconnaître votre terminal lors de vos visites ultérieures, de mémoriser vos préférences de navigation et d'assurer le fonctionnement sécurisé de la plateforme.
          </p>
        </section>

        {/* Article 2 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">2.</span>
            <span>Cookies utilisés sur Salacope.online</span>
          </h3>
          <p className="mb-2">
            Le site Salacope.online utilise exclusivement les catégories de cookies suivantes :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600 mb-2">
            <li>
              <strong>Cookies strictement nécessaires :</strong> indispensables au fonctionnement technique de la plateforme (persistance du panier, filtres du catalogue, gestion de session).
            </li>
            <li>
              <strong>Cookies de mesure technique :</strong> permettent d'analyser anonymement la fréquentation et d'optimiser les performances de chargement.
            </li>
          </ul>
          <p>
            Salacope.online n'utilise aucun cookie publicitaire tiers ni traceur de profilage commercial.
          </p>
        </section>

        {/* Article 3 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">3.</span>
            <span>Durée de conservation</span>
          </h3>
          <p>
            Les cookies déposés sur le site ont une durée de vie maximale de <strong>13 mois</strong>, conformément aux recommandations en vigueur. Passé ce délai, votre consentement vous sera à nouveau demandé.
          </p>
        </section>

        {/* Article 4 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">4.</span>
            <span>Gestion de vos préférences</span>
          </h3>
          <p>
            Vous pouvez à tout moment configurer votre navigateur pour refuser le dépôt de cookies ou être averti avant leur enregistrement. La désactivation de certains cookies peut toutefois affecter le confort d'utilisation de la plateforme.
          </p>
        </section>

        {/* Article 5 */}
        <section className="pt-2 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 font-heading mb-1.5 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">5.</span>
            <span>Contact</span>
          </h3>
          <p>
            Pour toute question relative à cette politique de cookies :{' '}
            <a href="mailto:contact@salacope.online" className="text-primary-700 font-semibold underline">
              contact@salacope.online
            </a>.
          </p>
        </section>

      </div>
    </div>
  );
};
