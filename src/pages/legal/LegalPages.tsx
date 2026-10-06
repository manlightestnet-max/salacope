import React from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/shared/ui';
import { COMPANY, companyField } from '@/shared/config/company';
import { PLATFORM, RELEASE_RULE } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';

const UPDATED = '29 septembre 2026';
const DAYS = RELEASE_RULE;

const Doc: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
    <p className="text-sm text-gray-500 mt-1 mb-8">Mis à jour le {UPDATED}</p>
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:underline">
      {children}
    </div>
  </div>
);

const Contact = () => <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;

/** What may never be sold on Salacope (terms and AML/CFT policy, same list). */
const PROHIBITED = [
  'cartes-cadeaux, bons d’achat, cartes prépayées, recharges, monnaie électronique ou toute autre valeur stockée ;',
  'cryptoactifs, signaux de trading, placements, prêts, systèmes pyramidaux ou d’enrichissement rapide ;',
  'jeux d’argent, paris et loteries ;',
  'contenus piratés ou contrefaits, ou dont le vendeur ne détient pas les droits ;',
  'faux documents, piratage informatique, revente de comptes ou de données ;',
  'images ou vidéos générées par IA représentant une personne réelle sans son accord, ou à caractère sexuel, violent ou diffamatoire ;',
  'services pour adultes ou d’escorte, drogues, médicaments, armes.',
];

export const LegalNotice: React.FC = () => (
  <Doc title="Mentions légales">
    <section>
      <h2>Éditeur</h2>
      <ul>
        <li>Raison sociale : {COMPANY.legalName}</li>
        <li>Forme juridique : {COMPANY.legalForm}</li>
        <li>Registre du commerce : {COMPANY.registry}</li>
        <li>Identification fiscale : {COMPANY.taxId}</li>
        <li>Licence : {COMPANY.license}</li>
        <li>Siège : {COMPANY.address}</li>
        <li>Directeur de la publication : {companyField(COMPANY.director)}</li>
        <li>
          Contact : <Contact />
        </li>
      </ul>
    </section>
    <section>
      <h2>Salacope Online</h2>
      <p>
        Salacope Online est un produit de {COMPANY.legalName}. Son nom réunit le mot lingala « salacope », faire un travail
        pour être payé, et « online » : la plateforme où les freelances congolais travaillent et sont payés en ligne.
      </p>
    </section>
    <section>
      <h2>Hébergement</h2>
      <p>{COMPANY.host}</p>
    </section>
    <section>
      <h2>Activité</h2>
      <p>
        Salacope est une place de marché qui met en relation des vendeurs de produits numériques et de services avec des
        acheteurs en {PLATFORM.country}. Salacope n’est pas un établissement de paiement : les paiements sont traités par
        LightPay et ses partenaires de paiement agréés, par MTN Mobile Money et Airtel Money.
      </p>
    </section>
    <section>
      <h2>Propriété intellectuelle</h2>
      <p>
        La marque, l’interface et le code de Salacope sont protégés. Les contenus mis en vente restent la propriété de leurs
        vendeurs, qui garantissent en détenir les droits.
      </p>
    </section>
  </Doc>
);

export const Terms: React.FC = () => (
  <Doc title="Conditions générales">
    <section>
      <h2>1. Comptes</h2>
      <p>
        Un compte est identifié par une adresse e-mail. Tout utilisateur peut acheter, avec ou sans compte ; il peut aussi
        ouvrir une boutique pour vendre. Chacun est responsable de l’exactitude de ses informations.
      </p>
    </section>
    <section>
      <h2>2. Vérification des vendeurs</h2>
      <p>
        Avant la mise en ligne de sa première offre, chaque vendeur fait vérifier son identité : nom, date de naissance,
        nationalité, adresse, pièce d’identité valide (recto et verso) et selfie en la tenant. Tant que la vérification n’est
        pas validée par Salacope, aucune offre n’est visible ni ne peut être achetée. Salacope peut demander des documents
        complémentaires (justificatif de domicile, origine des revenus, preuves du travail réalisé), notamment pour les
        personnes exerçant une fonction publique importante. Les ventes ne sont versées que sur le wallet LightPay du vendeur
        vérifié.
      </p>
    </section>
    <section>
      <h2>3. Offres</h2>
      <p>Deux types d’offres existent :</p>
      <ul>
        <li>
          <strong>Produit numérique</strong> : fichier ou accès en ligne, livré automatiquement au paiement.
        </li>
        <li>
          <strong>Service</strong> : travail réalisé par le vendeur (création, image ou vidéo générée par IA sur demande,
          accompagnement…), livré dans le délai indiqué sur l’offre à compter de son acceptation.
        </li>
      </ul>
      <p className="mt-2">Sont interdits :</p>
      <ul>
        {PROHIBITED.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="mt-2">Une offre qui enfreint ces règles est retirée, et le vendeur en est informé.</p>
    </section>
    <section>
      <h2>4. Paiement, commission et versement</h2>
      <p>
        L’acheteur paie par MTN MoMo ou Airtel Money. Le montant est bloqué par LightPay et n’est versé au vendeur qu’une fois
        la commande terminée : quand l’acheteur confirme la réception, ou automatiquement après la livraison sans litige
        ({DAYS}).
        {' '}Une commission est alors retenue automatiquement sur chaque vente validée, au taux affiché au vendeur au moment de
        la vente. Ce taux peut être modifié selon les conditions de nos prestataires tiers ou notre politique interne ; le
        vendeur en est informé, et en acceptant les présentes conditions puis en continuant à vendre, il accepte le taux en
        vigueur. La commission apparaît ligne par ligne dans l’activité de son wallet.
      </p>
    </section>
    <section>
      <h2>5. Annulation et litiges</h2>
      <p>
        Un service peut être annulé par l’acheteur tant que le vendeur ne l’a pas accepté, et par le vendeur tant qu’il n’est pas
        livré ; l’acheteur est alors intégralement remboursé. Après livraison, l’acheteur dispose d’un délai ({DAYS}) pour signaler un
        problème. Les fonds sont bloqués pendant l’examen du litige. Voir la{' '}
        <Link to={ROUTES.legal.refund}>politique de remboursement</Link>.
      </p>
    </section>
    <section>
      <h2>6. Retraits</h2>
      <p>
        Les ventes validées sont versées sur le wallet LightPay du vendeur. Le vendeur retire ensuite depuis LightPay vers MTN
        MoMo ou Airtel Money (minimum {PLATFORM.minWithdrawalXaf} FCFA), aux frais affichés par LightPay avant chaque retrait.
      </p>
    </section>
    <section>
      <h2>7. Échanges entre acheteur et vendeur</h2>
      <p>
        Acheteur et vendeur échangent uniquement par la messagerie de la commande. Partager un numéro, une adresse e-mail ou
        proposer un paiement hors de Salacope est interdit.
      </p>
    </section>
    <section>
      <h2>8. Suspension et blocage</h2>
      <p>
        Salacope peut retirer une offre, suspendre une boutique ou bloquer un compte en cas de fraude, d’activité suspecte, de
        vérification d’identité impossible, de violation de droits ou de manquement répété aux délais. Les fonds en attente
        restent bloqués pendant l’examen. Salacope applique sa{' '}
        <Link to={ROUTES.legal.aml}>politique de lutte contre le blanchiment</Link> et coopère avec les autorités compétentes,
        conformément à la loi.
      </p>
    </section>
    <section>
      <h2>9. Contact</h2>
      <p>
        <Contact />
      </p>
    </section>
  </Doc>
);

export const RefundPolicy: React.FC = () => (
  <Doc title="Remboursements">
    <section>
      <h2>Quand êtes-vous remboursé ?</h2>
      <ul>
        <li>Le vendeur refuse ou annule votre commande avant de livrer.</li>
        <li>Vous annulez un service que le vendeur n’a pas encore accepté.</li>
        <li>Un litige ouvert dans le délai suivant la livraison ({DAYS}) est tranché en votre faveur (non-livraison, fichier défectueux ou non conforme).</li>
      </ul>
    </section>
    <section>
      <h2>Comment ?</h2>
      <p>
        Le remboursement est intégral et versé sur le compte Mobile Money qui a payé, jamais sur un autre numéro, sous 48 h
        ouvrées. Pour un litige, utilisez « Signaler un problème » sur la page de la commande.
      </p>
    </section>
    <section>
      <h2>Exclusions</h2>
      <p>Une commande dont vous avez confirmé la réception, ou dont le délai ({DAYS}) est écoulé, n’est plus remboursable.</p>
    </section>
  </Doc>
);

export const PrivacyPolicy: React.FC = () => (
  <Doc title="Confidentialité">
    <section>
      <h2>Responsable du traitement</h2>
      <p>
        {COMPANY.legalName}, {COMPANY.address}. Contact : <Contact />.
      </p>
    </section>
    <section>
      <h2>Données collectées</h2>
      <ul>
        <li>Compte : nom, e-mail, téléphone.</li>
        <li>Achat sans compte : numéro Mobile Money qui a payé.</li>
        <li>Boutique : nom, activité, ville et lien vers le wallet LightPay (aucun solde ni code secret stocké chez Salacope).</li>
        <li>
          Vérification des vendeurs : nom complet, date de naissance, nationalité, adresse, type et numéro de la pièce
          d’identité, photos de la pièce et selfie, réponse sur les fonctions publiques.
        </li>
        <li>Commandes : contenu, montants, référence de paiement, messages échangés avec l’autre partie.</li>
      </ul>
    </section>
    <section>
      <h2>Utilisation</h2>
      <p>
        Ces données servent à exécuter les commandes, verser les vendeurs, vérifier leur identité, prévenir la fraude et le
        blanchiment, et respecter nos obligations légales. Le vendeur voit seulement le nom de ses acheteurs : e-mail et
        téléphone ne sont jamais partagés entre acheteur et vendeur. Aucune donnée n’est vendue.
      </p>
    </section>
    <section>
      <h2>Documents d’identité</h2>
      <p>
        Les pièces et selfies des vendeurs ne sont visibles que par l’équipe de conformité de Salacope ; chaque consultation est
        enregistrée. Ils ne sont communiqués qu’aux autorités qui les demandent légalement.
      </p>
    </section>
    <section>
      <h2>Conservation</h2>
      <p>
        Les données de vérification et l’historique des transactions sont conservés au moins 10 ans après la fin de la relation,
        comme l’exige la lutte contre le blanchiment. Les autres données sont supprimées quand elles ne sont plus utiles.
      </p>
    </section>
    <section>
      <h2>Paiement</h2>
      <p>
        Les paiements sont traités par LightPay. Salacope ne voit ni ne stocke votre code secret Mobile Money, qui se saisit
        uniquement sur votre téléphone, ni votre mot de passe.
      </p>
    </section>
    <section>
      <h2>Vos droits</h2>
      <p>
        Accès, rectification et suppression, dans les limites des obligations de conservation : <Contact />.
      </p>
    </section>
  </Doc>
);

export const CookiePolicy: React.FC = () => (
  <Doc title="Cookies">
    <p>
      Salacope utilise uniquement le stockage nécessaire au fonctionnement du site (session, préférences). Aucun cookie
      publicitaire ni traceur tiers n’est utilisé ; aucun consentement n’est donc demandé.
    </p>
  </Doc>
);

/** Summary of the AML/CFT policy for users; the full policy (English) is downloadable. */
export const AmlPolicy: React.FC = () => (
  <Doc title="Lutte contre le blanchiment">
    <p>
      Salacope s’engage à ce que sa place de marché ne serve jamais au blanchiment d’argent, au financement du terrorisme ou
      à la fraude. Nous appliquons une approche fondée sur les risques, conforme aux recommandations du GAFI, au règlement
      CEMAC n° 01/16/CEMAC/UMAC/CM (République du Congo) et à la loi angolaise n° 5/20.
    </p>
    <Button href={ROUTES.legal.amlPolicyPdf} icon={<Download className="w-4 h-4" />}>
      Politique complète (PDF, en anglais)
    </Button>
    <section>
      <h2>Vendeurs vérifiés</h2>
      <p>
        Aucune offre n’est mise en ligne avant la vérification de l’identité du vendeur : pièce d’identité valide, selfie et
        informations personnelles. Chaque vendeur est contrôlé sur les listes de sanctions (ONU, OFAC, UE) et reçoit un niveau
        de risque, révisé chaque année, tous les 2 ans ou tous les 3 ans selon ce niveau.
      </p>
    </section>
    <section>
      <h2>Paiements encadrés</h2>
      <ul>
        <li>Paiement uniquement par MTN Mobile Money et Airtel Money, via un partenaire agréé : ni espèces, ni carte, ni cryptoactifs.</li>
        <li>Chaque paiement est bloqué jusqu’à la validation de la commande par l’acheteur.</li>
        <li>Les remboursements repartent toujours vers le numéro qui a payé.</li>
        <li>Les ventes ne sont versées qu’au vendeur vérifié.</li>
        <li>Acheteur et vendeur échangent uniquement par la messagerie Salacope, qui bloque les coordonnées.</li>
      </ul>
    </section>
    <section>
      <h2>Produits interdits</h2>
      <ul>
        {PROHIBITED.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </section>
    <section>
      <h2>Surveillance et signalement</h2>
      <p>
        Les transactions sont surveillées : volumes inhabituels, achats répétés entre les mêmes personnes, liens entre acheteur
        et vendeur, taux élevé de litiges. En cas de doute, les fonds restent bloqués, des justificatifs peuvent être demandés,
        la boutique ou le compte peut être suspendu, et les opérations suspectes sont déclarées à l’ANIF (République du Congo)
        ou à l’UIF (Angola).
      </p>
    </section>
    <section>
      <h2>Conservation</h2>
      <p>Les données d’identification et l’historique des transactions sont conservés au moins 10 ans.</p>
    </section>
    <section>
      <h2>Contact</h2>
      <p>
        Pour signaler une activité suspecte : <Contact />.
      </p>
    </section>
  </Doc>
);
