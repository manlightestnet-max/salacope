import React from 'react';
import { Link } from 'react-router-dom';
import { Callout } from '@/shared/ui';
import { COMPANY, companyField } from '@/shared/config/company';
import { PLATFORM } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';

const UPDATED = '26 septembre 2026';
const DAYS = PLATFORM.escrowDays;

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

export const LegalNotice: React.FC = () => (
  <Doc title="Mentions légales">
    {!COMPANY.legalName && (
      <Callout tone="warning" title="Informations à compléter">
        L'entité juridique exploitant Salacope en République du Congo doit être renseignée avant la mise en production.
      </Callout>
    )}
    <section>
      <h2>Éditeur</h2>
      <ul>
        <li>Raison sociale : {companyField(COMPANY.legalName)}</li>
        <li>Forme juridique : {companyField(COMPANY.legalForm)}</li>
        <li>RCCM : {companyField(COMPANY.rccm)}</li>
        <li>NIU : {companyField(COMPANY.niu)}</li>
        <li>Siège : {companyField(COMPANY.address)}</li>
        <li>Directeur de la publication : {companyField(COMPANY.director)}</li>
        <li>
          Contact : <Contact />
        </li>
      </ul>
    </section>
    <section>
      <h2>Activité</h2>
      <p>
        Salacope est une place de marché qui met en relation des vendeurs de produits numériques et de services avec des
        acheteurs en {PLATFORM.country}. Salacope n'est pas un établissement de paiement : les paiements sont traités par les
        opérateurs MTN Mobile Money et Airtel Money.
      </p>
    </section>
    <section>
      <h2>Propriété intellectuelle</h2>
      <p>
        La marque, l'interface et le code de Salacope sont protégés. Les contenus mis en vente restent la propriété de leurs
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
        Un compte est identifié par une adresse e-mail. Tout utilisateur peut acheter ; il peut aussi ouvrir une boutique pour
        vendre. Chacun est responsable de l'exactitude de ses informations.
      </p>
    </section>
    <section>
      <h2>2. Offres</h2>
      <p>Deux types d'offres existent :</p>
      <ul>
        <li>
          <strong>Produit numérique</strong> : fichier ou accès en ligne, livré automatiquement au paiement.
        </li>
        <li>
          <strong>Service</strong> : travail réalisé par le vendeur, livré dans le délai indiqué sur l'offre à compter de son
          acceptation.
        </li>
      </ul>
      <p className="mt-2">
        Sont interdits : cartes-cadeaux et bons d'achat, change de devises, jeux d'argent, cryptoactifs et tout contenu dont le
        vendeur ne détient pas les droits.
      </p>
    </section>
    <section>
      <h2>3. Paiement et versement au vendeur</h2>
      <p>
        L'acheteur paie par MTN MoMo ou Airtel Money. Le montant n'est versé au vendeur qu'une fois la commande terminée : quand
        l'acheteur confirme la réception, ou automatiquement {DAYS} jours après la livraison sans litige.
        {PLATFORM.feeRate > 0 ? ` Une commission de ${PLATFORM.feeRate * 100} % est déduite.` : ' Aucune commission n\'est prélevée pendant la période de lancement.'}
      </p>
    </section>
    <section>
      <h2>4. Annulation et litiges</h2>
      <p>
        Un service peut être annulé par l'acheteur tant que le vendeur ne l'a pas accepté, et par le vendeur tant qu'il n'est pas
        livré ; l'acheteur est alors intégralement remboursé. Après livraison, l'acheteur dispose de {DAYS} jours pour signaler un
        problème. Les fonds sont bloqués pendant l'examen du litige. Voir la{' '}
        <Link to={ROUTES.legal.refund}>politique de remboursement</Link>.
      </p>
    </section>
    <section>
      <h2>5. Retraits</h2>
      <p>
        Les paiements sont encaissés et bloqués par LightPay jusqu'à la validation de la commande, puis versés sur le wallet
        LightPay du vendeur. Le vendeur retire ensuite depuis LightPay vers MTN MoMo ou Airtel Money (minimum{' '}
        {PLATFORM.minWithdrawalXaf} FCFA), aux frais affichés par LightPay avant chaque retrait.
      </p>
    </section>
    <section>
      <h2>6. Suspension</h2>
      <p>Salacope peut suspendre un compte en cas de fraude, de violation de droits ou de manquement répété aux délais.</p>
    </section>
    <section>
      <h2>7. Contact</h2>
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
        <li>Vous annulez un service que le vendeur n'a pas encore accepté.</li>
        <li>Un litige ouvert dans les {DAYS} jours suivant la livraison est tranché en votre faveur (non-livraison, fichier défectueux ou non conforme).</li>
      </ul>
    </section>
    <section>
      <h2>Comment ?</h2>
      <p>
        Le remboursement est intégral et versé sur le compte Mobile Money utilisé pour le paiement, sous 48 h ouvrées. Pour un
        litige, utilisez « Signaler un problème » sur la page de la commande.
      </p>
    </section>
    <section>
      <h2>Exclusions</h2>
      <p>Une commande dont vous avez confirmé la réception, ou dont le délai de {DAYS} jours est écoulé, n'est plus remboursable.</p>
    </section>
  </Doc>
);

export const PrivacyPolicy: React.FC = () => (
  <Doc title="Confidentialité">
    <section>
      <h2>Données collectées</h2>
      <ul>
        <li>Compte : nom, e-mail, téléphone.</li>
        <li>Boutique : nom, activité, ville et lien vers le wallet LightPay (aucun solde ni numéro stocké chez Salacope).</li>
        <li>Commandes : contenu, montants, référence de paiement, messages échangés avec l'autre partie.</li>
      </ul>
    </section>
    <section>
      <h2>Utilisation</h2>
      <p>
        Ces données servent à exécuter les commandes, verser les vendeurs, prévenir la fraude et respecter nos obligations
        comptables. Le vendeur voit seulement le nom de ses acheteurs : e-mail et téléphone ne sont jamais partagés entre acheteur
        et vendeur, qui échangent par la messagerie de la commande. Aucune donnée n'est vendue.
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
        Accès, rectification et suppression : <Contact />.
      </p>
    </section>
  </Doc>
);

export const CookiePolicy: React.FC = () => (
  <Doc title="Cookies">
    <p>
      Salacope utilise uniquement le stockage nécessaire au fonctionnement du site (session, préférences). Aucun cookie
      publicitaire ni traceur tiers n'est utilisé ; aucun consentement n'est donc demandé.
    </p>
  </Doc>
);
