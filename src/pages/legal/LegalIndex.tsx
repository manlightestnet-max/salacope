import React from 'react';
import { Link } from 'react-router-dom';

export const LegalIndex: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold font-heading text-gray-950">
          Mentions Légales
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dernière mise à jour : 23 Septembre 2026
        </p>
      </div>

      {/* Main Content — Prose standard en 10 articles */}
      <div className="space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
        
        {/* Article 1 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">1.</span>
            <span>Éditeur du site et du service</span>
          </h3>
          <p className="mb-2">
            Le site et le service <strong>Salacope.online</strong> sont édités et exploités par la société <strong>LÍDIA &amp; MARIANA - COMÉRCIO GERAL E PRESTAÇÃO DE SERVIÇOS, LDA</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li><strong>Dénomination sociale :</strong> LÍDIA &amp; MARIANA - COMÉRCIO GERAL E PRESTAÇÃO DE SERVIÇOS, LDA</li>
            <li><strong>Forme juridique :</strong> Société à responsabilité limitée (Sociedade por Quotas – LDA de droit angolais)</li>
            <li><strong>Numéro d'Identification Fiscale (NIF) :</strong> 5001873490</li>
            <li><strong>Immatriculation Commerciale (Matrícula) :</strong> 12988-24/240321 (Conservatória do Registo Comercial de Luanda)</li>
            <li><strong>Gérance Légale :</strong> Lídia Clemencia Luemba Chivango</li>
            <li><strong>Siège social :</strong> Luanda, République d'Angola</li>
            <li><strong>Établissement bancaire :</strong> Banco de Fomento Angola (BFA) — IBAN : AO0600060007718585130130</li>
            <li><strong>Marché et opérations :</strong> République du Congo (Brazzaville, Pointe-Noire)</li>
            <li><strong>Contact :</strong> contact@salacope.online</li>
          </ul>
        </section>

        {/* Article 2 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">2.</span>
            <span>Nature du service — Salacope.online n'est pas un établissement de paiement</span>
          </h3>
          <p className="mb-2">
            Salacope.online est une place de marché numérique d'intermédiation technique et de mise en relation commerciale pour infoproduits et services digitaux.
          </p>
          <p className="mb-2">
            Statut réglementaire : Salacope.online n'est ni un établissement de paiement, ni un établissement de crédit, ni un agrégateur financier, ni un PSP (prestataire de services de paiement), ni une banque, ni un émetteur de monnaie électronique. Salacope.online facilite uniquement l'exposition des catalogues numériques et l'intégration des API techniques fournies par des prestataires de paiement officiels agréés.
          </p>
          <p>
            L'encaissement, le traitement, le transit et la conservation des fonds sont assurés exclusivement par les opérateurs de télécommunications officiels en République du Congo (<strong>MTN Congo - MTN MoMo</strong> et <strong>Airtel Congo - Airtel Money</strong>) — et non par Salacope.online. Salacope.online n'exerce aucune activité soumise à agrément d'établissement de paiement.
          </p>
        </section>

        {/* Article 3 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">3.</span>
            <span>Objet du service</span>
          </h3>
          <p>
            Salacope.online fournit aux créateurs indépendants, formateurs, auteurs et freelances une plateforme technique permettant d'exposer, de commercialiser et de délivrer des infoproduits (e-books, formations, templates, fichiers graphiques) et des prestations de services, et aux acquéreurs d'acheter ces produits en réglant directement en Franc CFA (FCFA / XAF) par Mobile Money.
          </p>
          <p className="mt-1.5">
            L'utilisation du service est soumise aux <Link to="/legal/termos" className="text-primary-700 underline">Conditions Générales d'Utilisation</Link>, à la <Link to="/legal/privacidade" className="text-primary-700 underline">Politique de Confidentialité</Link>, à la <Link to="/legal/reembolso" className="text-primary-700 underline">Politique de Remboursement</Link> et à la <Link to="/legal/cookies" className="text-primary-700 underline">Politique de Cookies</Link>.
          </p>
        </section>

        {/* Article 4 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">4.</span>
            <span>Propriété intellectuelle</span>
          </h3>
          <p>
            L'ensemble des éléments composant le site et le service Salacope.online — incluant, sans s'y limiter, la marque « Salacope », les logos, les textes, l'interface graphique, le code et les bases de données — sont la propriété exclusive de <strong>LÍDIA &amp; MARIANA LDA</strong> ou font l'objet d'une autorisation d'utilisation.
          </p>
          <p className="mt-1.5">
            Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie de ces éléments sans l'autorisation écrite préalable de LÍDIA &amp; MARIANA LDA est strictement interdite. Les infoproduits, formations et créations mis en vente demeurent la propriété intellectuelle exclusive de leurs créateurs respectifs.
          </p>
        </section>

        {/* Article 5 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">5.</span>
            <span>Protection des données personnelles</span>
          </h3>
          <p>
            LÍDIA &amp; MARIANA LDA accorde une importance particulière à la protection des données personnelles de ses utilisateurs. Les données collectées sont traitées conformément à notre <Link to="/legal/privacidade" className="text-primary-700 underline">Politique de Confidentialité</Link>.
          </p>
          <p className="mt-1.5">
            L'utilisateur dispose de droits sur ses données personnelles (accès, rectification, effacement, opposition, portabilité), qu'il peut exercer en écrivant à :{' '}
            <a href="mailto:contact@salacope.online" className="text-primary-700 underline">
              contact@salacope.online
            </a>.
          </p>
        </section>

        {/* Article 6 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">6.</span>
            <span>Cookies</span>
          </h3>
          <p>
            Le site Salacope.online utilise des cookies strictement nécessaires et des outils de mesure technique anonymisés afin d'assurer son fonctionnement et d'améliorer l'expérience utilisateur. Salacope.online n'utilise aucun traceur publicitaire tiers. Voir notre <Link to="/legal/cookies" className="text-primary-700 underline">Politique de cookies</Link>.
          </p>
        </section>

        {/* Article 7 — Conservé strictly tel quel */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">7.</span>
            <span>Limitation de responsabilité</span>
          </h3>
          <p className="mb-1.5">
            LÍDIA &amp; MARIANA LDA s'efforce d'assurer avec la plus grande diligence l'exactitude des informations diffusées sur le site ainsi que la disponibilité du service. Toutefois, la société ne saurait être tenue pour responsable :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>des erreurs ou inexactitudes matérielles figurant dans les fiches produits rédigées sous la seule responsabilité des créateurs indépendants ;</li>
            <li>d'une indisponibilité temporaire du service pour des motifs de maintenance technique ou de force majeure ;</li>
            <li>des dysfonctionnements, retards de livraison de messages USSD ou pannes de réseau imputables aux opérateurs de télécommunication (MTN, Airtel) ou aux serveurs de la passerelle partenaire ;</li>
            <li>des dommages résultant d'une utilisation non conforme ou frauduleuse du service par l'utilisateur ;</li>
            <li>du contenu des sites internet externes accessibles via des liens hypertextes présents sur la plateforme.</li>
          </ul>
        </section>

        {/* Article 8 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">8.</span>
            <span>Liens hypertextes</span>
          </h3>
          <p>
            Le site Salacope.online peut contenir des liens vers des sites tiers. LÍDIA &amp; MARIANA LDA n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou à leur politique de protection des données.
          </p>
        </section>

        {/* Article 9 */}
        <section>
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">9.</span>
            <span>Droit applicable et juridiction</span>
          </h3>
          <p>
            Les présentes mentions légales sont régies par le droit applicable au lieu d'établissement de <strong>LÍDIA &amp; MARIANA LDA</strong>, ainsi que par les réglementations commerciales applicables en République du Congo. Tout litige relatif à l'utilisation du site sera soumis aux juridictions compétentes.
          </p>
        </section>

        {/* Article 10 */}
        <section className="pt-2 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 font-heading mb-2 text-sm flex items-center gap-1.5">
            <span className="text-primary-700">10.</span>
            <span>Contact</span>
          </h3>
          <p>
            Pour toute question relative aux présentes mentions légales ou au service Salacope.online :{' '}
            <a href="mailto:contact@salacope.online" className="text-primary-700 font-bold underline">
              contact@salacope.online
            </a>.
          </p>
        </section>

      </div>
    </div>
  );
};
