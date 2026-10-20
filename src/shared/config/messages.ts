/**
 * Every automatic message of Salacope (in the app's notifications, as a push on the phone, and by e-mail for guests) is a
 * template the administration can rewrite (Admin → Paramètres → Messages), switch its push on or off, or turn off.
 * The texts below are the originals ("Rétablir le texte d'origine" brings them back). Shared by the server (sending) and
 * the admin screen (editing, preview).
 *
 * Variables are written {nom}; only the variables listed for a message are accepted (a typo is refused).
 */
export interface MessageTemplate {
  title: string;
  body: string;
  /** Sent as a push notification to the person's phones. */
  push: boolean;
  /** Off: nothing at all is sent for this event (neither in the app nor on the phone). */
  enabled: boolean;
}

export interface MessageDef extends MessageTemplate {
  event: string;
  group: string;
  /** When it is sent, in the administration's words. */
  label: string;
  vars: string[];
}

const def = (event: string, group: string, label: string, vars: string[], title: string, body: string, push = true): MessageDef => ({
  event,
  group,
  label,
  vars,
  title,
  body,
  push,
  enabled: true,
});

/** Example values for the preview in the administration. */
export const SAMPLE_VARS: Record<string, string> = {
  commande: 'SC-10024',
  offre: 'Guide complet de la fiscalité au Congo',
  montant: '9 000 FCFA',
  date: '18 oct. 2026',
  client: 'Awa K.',
  boutique: 'Light Studio',
  extrait: 'Bonjour, le fichier est-il en PDF ?',
  raison: 'Le fichier ne s’ouvre pas.',
  note: 'Corriger les couleurs du logo.',
  jours: '3 jours',
  minutes: '5',
  remboursement: '9 000 FCFA remboursés sur votre wallet LightPay.',
  code: 'PAY-7KQ2',
  litige: 'Litige 04',
  sujet: 'Contenu copié',
  message: 'Merci d’envoyer une capture du problème.',
  texte: 'Décision : le vendeur est payé.',
  ticket: 'SUP-1042',
  motif: 'Paiement non reçu',
  etoiles: '5 étoiles',
  titre: 'Salacope vous demande une précision · SC-10024',
};

/** The originals, in the order the administration sees them. */
export const MESSAGE_DEFS: MessageDef[] = [
  // ------------------------------------------------------------ purchases (buyer)
  def('purchase.ready', 'Achats', 'Produit numérique payé : le fichier est prêt', ['commande', 'offre'], 'Votre achat est prêt · {commande}', '{offre} : téléchargez votre fichier.'),
  def('purchase.paid', 'Achats', 'Service payé', ['commande', 'offre'], 'Commande {commande} payée', '{offre} · le vendeur va accepter votre commande.'),
  def('purchase.free_ready', 'Achats', 'Produit numérique gratuit : le fichier est prêt', ['commande', 'offre'], 'Votre produit gratuit est prêt · {commande}', '{offre} : téléchargez votre fichier.'),
  def('purchase.free', 'Achats', 'Service gratuit commandé', ['commande', 'offre'], 'Commande {commande} enregistrée', '{offre} · gratuite, le vendeur va accepter votre commande.'),
  def('purchase.accepted', 'Achats', 'Le vendeur accepte la commande', ['commande', 'offre', 'date'], 'Commande acceptée', 'Livraison prévue le {date}'),
  def('purchase.delivered', 'Achats', 'Le vendeur livre le service', ['commande', 'offre'], 'Commande {commande} livrée', 'Vérifiez la livraison puis validez-la.'),
  def('purchase.cancelled', 'Achats', 'Le vendeur annule (client remboursé)', ['commande', 'offre', 'remboursement'], 'Commande {commande} annulée', '{remboursement}'),
  def('purchase.extension', 'Achats', 'Le vendeur demande plus de temps', ['commande', 'jours', 'raison'], 'Le vendeur demande {jours} de plus', '{raison}'),
  def('purchase.payment_request', 'Achats', 'Demande de paiement dans la discussion', ['commande', 'offre', 'montant', 'minutes'], 'Demande de paiement · {commande}', '{offre} · {montant} (valable {minutes} min après ouverture)'),
  def('purchase.message', 'Achats', 'Message du vendeur', ['commande', 'extrait'], 'Message du vendeur · {commande}', '{extrait}'),
  def('purchase.payment_expired', 'Achats', 'Paiement non abouti (délai dépassé)', ['code'], 'Paiement non abouti', '{code} · délai dépassé, aucun débit'),

  // ------------------------------------------------------------ sales (seller)
  def('sale.new', 'Ventes', 'Nouvelle commande (argent bloqué)', ['commande', 'offre', 'montant'], 'Nouvelle commande {commande}', '{offre} · {montant} (bloqués jusqu’à validation)'),
  def('sale.free', 'Ventes', 'Nouvelle commande gratuite', ['commande', 'offre'], 'Nouvelle commande gratuite {commande}', '{offre} · offre gratuite, aucun paiement.'),
  def('sale.released', 'Ventes', 'Le client valide : paiement versé', ['commande', 'montant'], 'Paiement libéré · {commande}', '+{montant} sur votre wallet LightPay'),
  def('sale.released_auto', 'Ventes', 'Paiement versé à la fin du délai', ['commande', 'montant'], 'Paiement libéré · {commande}', '+{montant} sur votre wallet LightPay (validation automatique)'),
  def('sale.cancelled', 'Ventes', 'Le client annule', ['commande', 'offre'], 'Commande {commande} annulée par le client', '{offre}'),
  def('sale.revision', 'Ventes', 'Le client demande une retouche', ['commande', 'note'], 'Retouche demandée · {commande}', '{note}'),
  def('sale.extension_accepted', 'Ventes', 'Le client accepte le délai', ['commande', 'date'], 'Délai accepté · {commande}', 'Nouvelle date de livraison : {date}'),
  def('sale.extension_declined', 'Ventes', 'Le client refuse le délai', ['commande', 'date'], 'Délai refusé · {commande}', 'Livraison attendue le {date}'),
  def('sale.message', 'Ventes', 'Message du client', ['commande', 'client', 'extrait'], 'Message de {client} · {commande}', '{extrait}'),
  def('sale.review', 'Ventes', 'Nouvel avis', ['etoiles', 'offre', 'extrait'], 'Nouvel avis {etoiles}', '{extrait}'),

  // ------------------------------------------------------------ disputes
  def('dispute.opened', 'Litiges', 'Le client ouvre un litige (au vendeur)', ['litige', 'commande', 'raison'], '{litige} · {commande}', '{raison}'),
  def('dispute.message', 'Litiges', 'Nouveau message de l’autre partie', ['litige', 'extrait'], '{litige} · nouveau message', '{extrait}'),
  def('dispute.salacope', 'Litiges', 'Message de Salacope dans un litige', ['litige', 'extrait'], '{litige} · message de Salacope', '{extrait}'),
  def('dispute.conduct', 'Litiges', 'Litige de conduite ouvert par Salacope', ['litige', 'sujet', 'message'], '{litige} · {sujet}', '{message}'),
  def('dispute.warning', 'Litiges', 'Avertissement', ['litige', 'raison'], 'Avertissement · {litige}', '{raison}'),
  def('dispute.closed', 'Litiges', 'Litige de conduite clos', ['litige', 'texte'], '{litige} clos', '{texte}'),

  // ------------------------------------------------------------ Salacope's decisions on held money
  def('decision.paid_seller', 'Décisions', 'Fonds versés : au vendeur', ['commande', 'montant', 'raison'], 'Paiement libéré · {commande}', '+{montant} sur votre wallet LightPay. {raison}'),
  def('decision.paid_buyer', 'Décisions', 'Fonds versés : à l’acheteur', ['commande', 'raison'], 'Décision sur {commande}', 'Les fonds sont versés au vendeur. {raison}'),
  def('decision.refunded_buyer', 'Décisions', 'Remboursement : à l’acheteur', ['commande', 'remboursement', 'raison'], 'Remboursement · {commande}', '{remboursement} {raison}'),
  def('decision.refunded_seller', 'Décisions', 'Remboursement : au vendeur', ['commande', 'raison'], 'Commande {commande} remboursée au client', '{raison}'),
  def('decision.ask', 'Décisions', 'Salacope demande une précision', ['commande', 'message'], 'Salacope vous demande une précision · {commande}', '{message}'),

  // ------------------------------------------------------------ store and account
  def('store.kyc_approved', 'Boutique', 'Identité vérifiée', [], 'Identité vérifiée', 'Vous pouvez maintenant publier vos offres.'),
  def('store.kyc_rejected', 'Boutique', 'Vérification d’identité refusée', ['raison'], 'Vérification d’identité refusée', '{raison}'),
  def('store.suspended', 'Boutique', 'Boutique suspendue', ['raison'], 'Boutique suspendue', '{raison}'),
  def('store.restored', 'Boutique', 'Boutique réactivée', [], 'Boutique réactivée', 'Vos offres sont de nouveau visibles.'),
  def('store.listing_hidden', 'Boutique', 'Offre masquée par Salacope', ['offre', 'raison'], 'Offre masquée par Salacope : {offre}', '{raison}'),
  def('store.listing_restored', 'Boutique', 'Offre rétablie', ['offre'], 'Offre rétablie : {offre}', 'Vous pouvez la publier de nouveau.'),
  def('follow.new_listing', 'Boutique', 'Nouvelle offre d’une boutique suivie', ['boutique', 'offre'], 'Nouvelle offre de {boutique}', '{offre}'),

  // ------------------------------------------------------------ support
  def('support.created', 'Support', 'Demande au support enregistrée', ['ticket', 'motif'], 'Demande {ticket} enregistrée', '{motif}', false),
  def('support.answered', 'Support', 'Le support a répondu', ['ticket', 'message'], 'Le support a répondu · {ticket}', '{message}'),
];

export const messageDef = (event: string) => MESSAGE_DEFS.find((d) => d.event === event);

/** Puts the values in: {var} becomes its value (an empty value leaves nothing), spaces are tidied. */
export const fillTemplate = (text: string, vars: Record<string, string | number | undefined | null>) =>
  text
    .replace(/\{([a-z_]+)\}/g, (_, k: string) => String(vars[k] ?? ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([.,])/g, '$1')
    .trim();

/** The variables a text uses that the message does not have (a typo): refused when saving. */
export const unknownVars = (text: string, allowed: string[]) => [...text.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).filter((v) => !allowed.includes(v));
