# Note de passage — ce que le web a changé et que l'app Android doit suivre

> **À l'agent qui continue sur le mobile (Opus)** : l'app Flutter de `mobile/` a été faite au niveau du web *avant* ces changements. Le web a avancé (lancement le 20 octobre 2026). Cette note liste, **dans l'ordre de priorité**, ce qu'il faut reporter dans `mobile/`. Source de vérité : le code web (`src/`) et le serveur (`server/`). **Ne jamais modifier `server/` ni `src/` depuis le mobile**, et suivre `PLAN_ANDROID.md` + les règles de `CLAUDE.md` (aucune interface admin dans l'APK, onglets mémorisés, pas de navigation récursive, couleurs par tokens, textes en français copiés du web mot pour mot).

Le serveur est déployé : tout ce qui suit est déjà en ligne côté API. Les anciens clients continuent de fonctionner, sauf là où c'est dit.

---

## 1. Les commandes de service se gèrent **dans la discussion** (priorité 1)

**Règle** : sur une commande, *tout* se fait dans le chat ; l'écran « commande » ne fait qu'afficher le détail.

Dans la salle de discussion d'une commande, le fil affiche dans l'ordre :
- les messages et les étapes (`order.events`) mélangés par date ;
- après l'étape `paid` : la **carte du brief** du client (`order.brief`, `BriefCard`) s'il y en a ;
- après la dernière étape `delivered` (service) : la **carte de livraison** (`order.delivery` : note + fichiers) ;
- les mots laissés avec une étape (`cancelled`, `disputed`, `revision_requested`, `extension_requested`, `extension_declined`) s'affichent **sous l'étape**, entre guillemets, sans toucher ;
- **en dernier, la carte de l'action du moment** (web : `NextStepCard`, `src/features/orders/components/NextStepCard.tsx`). C'est elle qui porte toutes les actions, selon `permissionsFor(order, perspective)` :
  - vendeur, commande `paid` : **Accepter la commande** / **Refuser** (raison obligatoire) ;
  - vendeur, `in_progress` : **Livrer** (note + fichiers), **Demander un délai** ; retouche en cours → la note du client est citée ;
  - acheteur, `paid` : « En attente d'acceptation » + **Annuler** ;
  - acheteur, délai demandé : **Accepter / Refuser** le délai ;
  - acheteur, `delivered` (service) : **Confirmer la réception**, **Demander une retouche** (si `revisionsLeft > 0`), **Signaler un problème** ;
  - `disputed`, `completed`, `cancelled` : carte d'état (annulation : phrase du vrai remboursement, voir §2).
- La carte est visible **avant tout message** (un vendeur qui ouvre une commande neuve la voit sans avoir écrit).
- **Tant que le vendeur n'a pas accepté** une commande de service (`status == paid`), **personne n'écrit** : `permissionsFor(...).message` est faux (zone de saisie masquée, le serveur répond 409 « La discussion s'ouvre dès que le vendeur a accepté la commande. »). Message vide : « La discussion s'ouvrira dès que le vendeur aura accepté votre commande. » (acheteur) / « La discussion s'ouvre quand vous acceptez la commande. » (vendeur). **Livrer n'est possible qu'après l'acceptation** (`in_progress`).

**Écran commande (détail seul)** : plus de carte d'action. En tête, la carte « Discussion » (`ChatPreviewCard`) mène à la salle. Onglets : Suivi (détail, paiement, horloge `DeadlineCard`), Brief et livraison, Historique.

**Notifications** : pour un **service**, le lien d'une notification de commande ouvre maintenant la **discussion** (`/ac/messages/:id`) et non la page commande (`orderHref(id, perspective, kind)` dans `server/orders.ts`). L'app doit router ce lien vers sa salle de chat. Pour un produit numérique, rien ne change.

**Liste des discussions** : une pastille **« À traiter »** (`Badge warning`) sur la ligne d'une conversation où une action attend la personne (`needsAction(order, perspective)`).

Fichiers web à lire : `OrderActivity.tsx` (fil), `NextStepCard.tsx`, `OrderDialogs.tsx` (dialogues : livrer, retouche, délai, raison, signalement), `ServiceDesk.tsx`, `chat/ConversationList.tsx`, `server/orders.ts` (`orderHref`).

---

## 2. Remboursement : ce que le client récupère vraiment (priorité 2)

Un client qui a payé par **mobile money** est remboursé **sur le même numéro, moins les frais de retrait** (opérateur + LightPay) ; payé par **wallet LightPay**, il est remboursé en totalité. Le remboursement part après un délai que l'administration règle (5 min par défaut).

- Nouveau champ `Order.refund?: { paid, sent, operatorFee, lightpayFee, via: 'wallet'|'mobile_money', at, releaseAt? }` (commande annulée). Phrase : `refundSentence()` dans `src/shared/domain/refund.ts` (à porter à l'identique, y compris le cas `paid === 0` « Commande annulée : elle était gratuite, rien n'est à rembourser. »).
- **Avant de payer** (écran d'achat) et **dans la commande** (onglet paiement) : bloc « Si la vente est annulée » (`RefundNotice.tsx`) : `GET /checkout/refund-preview?total=<FCFA>` → `{ total, sent, operatorFee, lightpayFee, varies }`. Texte de fin : « Ces frais font partie de la maintenance et des opérations du réseau (opérateur mobile et LightPay). » (`REFUND_FEES_WHY`). Ne pas appeler pour un total de 0.
- Une commande annulée affiche la carte « Remboursement » (payé / frais opérateur / frais LightPay / remboursé) à partir de `order.refund`.

---

## 3. Offres : prix minimum, promotions avec compte à rebours, offres gratuites (priorité 3)

**Paramètres de la plateforme** (déjà envoyés avec les données, `PlatformSettings`) : `minPriceXaf`, `minPriceDigitalXaf`, `minPriceServiceXaf` (null = le général), `promoMaxDays`, `freeOffers`. Prix minimum d'une offre = `minPriceFor(kind)` (`src/shared/config/platform.ts`). Plus aucune constante en dur côté mobile.

**Promotion** : modèle `Listing.promo?: { startsAt, endsAt }` (présent seulement tant qu'elle court). Pendant la promotion : `priceXaf` = prix promotionnel, `compareAtXaf` = prix normal ; à la fin, **le serveur remet le prix normal** (le catalogue change tout seul).
- **Fiche de l'offre, en haut** : horloge `PromoCountdown` (jours/heures/min/sec en temps réel + barre qui se vide, `share = restant / (endsAt - startsAt)`), libellé « Promotion −X % · se termine dans » ou « Gratuit · se termine dans ». À zéro : rafraîchir le catalogue.
- **Éditeur vendeur** : case « Activer une promotion » (prix barré), case « Compte à rebours » (fin = +24 h / 3 j / 7 j ou date précise ; `promoError()` dans `src/shared/domain/listings.ts`). **Envoyer `promoEndsAt: null`** quand il n'y a pas de compte à rebours ; **si le champ est absent, le serveur laisse la promotion en cours** (anciens clients).

**Offre gratuite** (`priceXaf == 0`) : affichage **« Gratuit »** (`formatPrice`), bouton **« Obtenir gratuitement »**. **`POST /checkout` ne renvoie PAS de `checkoutUrl`** pour une offre gratuite : réponse `{ free: true, orderId, guestKey?, patch }` → ouvrir la commande directement, ne pas lancer LightPay. Un invité laisse quand même son e-mail. Paiement de la commande : `order.payment.via == 'free'` (libellé « Offre gratuite »). Pas de litige sur une commande gratuite, pas de demande de paiement dans le chat pour une offre gratuite. Gratuit pendant une promotion : le prix normal (`compareAtXaf`) doit rester ≥ prix minimum.

---

## 4. Page d'une offre du vendeur : plus jamais l'assistant (priorité 4)

L'assistant pas à pas ne sert **qu'à créer**. Une offre qui existe s'ouvre sur sa page : **rubriques à gauche** (Informations, Description, Images, Prix et promotion, Livraison ou Fichier livré), chacune avec un résumé et « Configuré » / « À compléter » ; la rubrique choisie s'ouvre **à droite**, **un seul Enregistrer** pour tout (activé seulement s'il y a un changement, avec Annuler). Sur téléphone : la liste, puis la rubrique seule avec un retour « Rubriques ». Voir `src/pages/seller/ListingManagePage.tsx`, `src/features/listings/sections.ts`, `ListingFields.tsx`.

---

## 5. Tableau de bord vendeur (priorité 5)

Refait : barre de période (7/30/90 jours, cette année, depuis le début, dates exactes) + filtre par offre (point jaune quand actif) + pastilles **Résumé · Ventes · Visites · Clients · Taux de conversion**. Le Résumé = trois blocs gris (Ventes, Visites, Clients) de cartes blanches (grand chiffre, nom, ⓘ).
- Chiffres des ventes et des clients : calculés **côté app** depuis les commandes, avec `dashboardFigures()` (`src/shared/domain/analytics.ts`, à porter avec ses tests : revenu net, panier moyen, produits vendus, clients, nouveaux, fidèles, série par jour ou par mois au-delà de 92 jours).
- Visites : `GET /seller/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ stats: [{ listingId, day, views, clicks }], store: [{ day, views }] }`.
- Taux de conversion = ventes ÷ visites (« — » sans visite).

---

## 6. Comptage des visites (priorité 6)

Le serveur compte maintenant **une visite par visiteur, par page et par jour**, ignore le vendeur lui-même et les robots (agent utilisateur contenant bot/crawl/spider/preview/curl/wget…). Rien à changer pour la fiche (`POST /listings/:id/track`), **sauf** : ouvrir la **page d'une boutique** doit appeler `POST /stores/:id/track` (corps `{}`), une fois par ouverture (le serveur dédoublonne). L'app envoie bien un agent utilisateur (Dart) : ne pas le vider.

---

## 7. Stockage des images et pièces jointes

Tout passe par Cloudflare R2 (images : adresse publique du bucket ; fichiers et pièces jointes : adresses signées de courte durée). Les anciens cas « data URL » ne doivent plus être envoyés ni affichés en liste. Rien de nouveau côté contrat, mais **ne jamais mettre d'image en base64 dans une liste**.

---

## 8. Catalogue des notifications

Nouveaux événements (textes modifiables côté admin) : `sale.free`, `purchase.free`, `purchase.free_ready`. Les notifications de commande de service ont un `href` vers la discussion (voir §1).

---

## 9. Autre application : LightPay (wallet)

Un plan séparé existe pour l'app **LightPay** (`docs/lightpay-android-plan.md`, dépôt à part). **LightPay ne connaît pas Salacope** : aucun texte, logo ni logique d'une app précise dans l'app LightPay.

---

## 10. Produits numériques à plusieurs fichiers et aperçu gratuit (priorité 3 bis)

Un produit numérique peut livrer **plusieurs fichiers**. Le maximum est un réglage de l'administration : `PlatformSettings.maxProductFiles` (1 à 20, 5 par défaut, envoyé avec les données comme les autres réglages, jamais en dur).

- **Modèle** : `Listing.file` et `Order.item.file` gardent `name`, `format`, `fileId`, `size` (= le fichier principal : le premier qui n'est pas un aperçu) **et** ajoutent `files: [{ name, format, fileId?, size?, preview? }]`. Lire avec `filesOf(file)` (`src/shared/domain/listings.ts`) : si `files` est absent, c'est l'ancien fichier unique. Un ancien client continue de marcher (il voit le fichier principal).
- **Ce que voit un visiteur** (autre que le vendeur) : les noms, formats et tailles de tous les fichiers, mais le `fileId` **seulement des fichiers d'aperçu** (`preview: true`). Les fichiers payants n'ont jamais d'identifiant côté public.
- **Fiche de l'offre** : section « N fichiers inclus » (`ListingFilesSection`) ; un bouton « Aperçu gratuit » sur chaque fichier d'aperçu → `GET /listings/:id/preview?f=<fileId>` → `{ url, name }` (adresse signée de 2 minutes, sans connexion). Libellé de livraison : « N fichiers · accès immédiat ».
- **Après l'achat** : la commande liste tous les fichiers (`OrderFiles`), chacun avec son bouton → `GET /orders/:id/file?f=<fileId>` ; sans `f`, le serveur donne le fichier principal. Bouton « Tout télécharger (N) » : les téléchargements partent l'un après l'autre (≈ 1 s d'écart). La carte « Vos fichiers » existe aussi dans la salle de la commande.
- **Éditeur vendeur** (`ProductFilesField`) : zone d'ajout (toucher / glisser), envoi **un fichier à la fois** avec barre de progression par fichier, ligne par fichier (icône du type, nom, format · taille, retirer), interrupteur **« Aperçu gratuit »** par fichier dès qu'il y en a au moins deux. Règles : au moins un fichier réservé aux acheteurs ; pas de doublon ; maximum de l'admin. Un fichier retiré avant l'enregistrement est supprimé du stockage tout de suite : `DELETE /files/:id` (refusé tant qu'une offre ou une commande l'utilise). Envoyer `files: [...]` à `POST /listings` et `PATCH /listings/:id` ; les anciens champs `fileId/fileName/fileFormat/fileSize` sont encore acceptés (un seul fichier).
- **Brouillon ouvert par le premier fichier** (création d'une offre) : dès qu'un fichier est envoyé, le web crée un brouillon avec ce qui est déjà saisi (`POST /listings/draft` `{ listing: { kind, category, title, summary } }` → `{ listing }`), rattache le fichier à ce brouillon (`ref` = id du brouillon dans `POST /files/sign`) puis enregistre la liste à chaque changement (`PUT /listings/:id/files` `{ files: [...] }`, brouillons seulement, retire de R2 tout de suite un fichier ôté et non acheté). À la fin, l'éditeur fait `PATCH /listings/:id` puis, pour publier, `POST /listings/:id/status`. Supprimer le brouillon (`DELETE /listings/:id`, jamais vendu) supprime aussitôt ses fichiers et images de R2. Un brouillon incomplet (titre < 8 caractères, pas de résumé ni de couverture) ne peut pas être publié.
- **E-mail d'un invité** : un lien par fichier (jusqu'à 5). Le lien `GET /orders/:id/download?e=&t=` accepte `&f=<fileId>`.
- Les fichiers jamais rattachés à une offre sont supprimés au bout d'un jour (tâche quotidienne) : ne pas compter dessus pour garder un envoi en attente.

## 11. Produit numérique : jamais « à valider » (priorité 3 ter)

Un produit numérique (e-book…) est **instantané** : accès au fichier dès le paiement, **aucune validation de l'acheteur, aucune autorisation de Salacope**. La seule attente est le délai de garantie que l'admin règle (`PlatformSettings.digitalHoldDays`), au bout duquel le vendeur est payé **automatiquement** (sauf litige ouvert avant). À afficher ainsi :
- badge d'une commande numérique livrée : acheteur « **Fichier disponible** » (succès), vendeur « **Livré** » (jamais « À valider ») ; `statusDisplay()` dans `src/features/orders/model.ts` ;
- carte vendeur : « Fichier livré, paiement automatique » + « Accès immédiat pour le client. {montant} vous seront versés automatiquement le {date}, sans validation de personne, si aucun litige n'est ouvert d'ici là. » ;
- notification vendeur d'une vente numérique : événement **`sale.new_digital`** (nouveau), variables `commande`, `offre`, `montant`, `jours` ;
- le délai est dit **avant l'achat** (fiche : « Accès immédiat ; le vendeur est payé N jours plus tard si vous ne signalez aucun problème », page de paiement) et figure dans la politique (conditions § 4) ;
- politique de remboursement : le remboursement mobile money est versé **moins les frais de retrait** (voir §2), intégral sur un wallet LightPay.

## Ordre de travail conseillé

1. §1 (commandes dans la discussion) — c'est ce qui change le plus l'usage au quotidien.
2. §3 (offres gratuites : sans ça, « Obtenir » plante faute de `checkoutUrl`), puis §10 (plusieurs fichiers : la liste de l'achat et le bouton d'aperçu).
3. §2 (remboursement honnête), §4, §5, §6.
4. À chaque étape : `flutter analyze`, `flutter test`, `flutter build apk --debug`, l'utilisateur teste sur téléphone.
