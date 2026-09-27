# Salacope

Place de marché de produits numériques (e-books, formations, templates) et de services, pour la République du Congo.
Paiement MTN MoMo / Airtel Money, argent retenu jusqu'à la validation de l'acheteur.

## Lancer le projet

```powershell
npm install
npm run dev      # http://localhost:3001
npm run build    # dist/
```

Les données sont stockées dans le navigateur (démo). Comptes de démonstration sur `/connexion` :

| Compte | E-mail | Rôle |
|---|---|---|
| Jean-Paul Ngoma | `jeanpaul@demo.cg` | Acheteur |
| Grace Ntsiba | `grace@demo.cg` | Vendeuse (commandes dans tous les états) |

Paramètres → « Réinitialiser » restaure le jeu de démo.

## Modèle métier

- **Un compte = un acheteur.** Il devient vendeur en ouvrant sa boutique (`/vendre`) ; il n'y a pas de rôle à basculer.
- **Offre** : `digital` (livrée au paiement) ou `service` (livrée par le vendeur dans un délai en jours).
- **Commande** — machine d'états, droits vérifiés dans `features/orders/api.ts` :

```
paid ──accepter──▶ in_progress ──livrer──▶ delivered ──confirmer (acheteur)──▶ completed
  │                  │    ▲                    │          ou automatique après 7 jours
  │                  │    └──retouche (acheteur, dans la limite de l'offre)
  └──annuler─────────┴──▶ cancelled            └──signaler (acheteur)──▶ disputed
digital : paiement ⇒ delivered immédiatement
```

- **Paiement** (`features/checkout`) : chaque tentative Mobile Money reçoit un code unique `TX-XXXX-XXXX`, quelle que soit l'issue (confirmée, refusée, solde insuffisant, expirée après 60 s, annulée). La commande n'est créée qu'une fois le paiement confirmé. Pour un service, le client répond au **brief** défini par le vendeur au moment de payer.
- **En cours de service** : le vendeur peut demander un **délai** (le client accepte ou refuse) ; à la livraison, le client peut demander une **retouche** au lieu d'ouvrir un litige.
- **Support** (`features/support`) : tickets rattachés à un code de paiement ou à un n° de commande, avec une première réponse automatique qui résume ce que Salacope sait déjà.
- **Notifications** (`features/notifications`) : écrites dans la même mise à jour que l'événement qu'elles décrivent.
- **Avis** (`features/reviews`) : une note par commande terminée ; seuls les créateurs avec des ventes confirmées et au moins 4 étoiles sont mis en avant.

- **Argent** : une vente n'entre dans le solde disponible qu'une fois `completed`. Avant, elle est « en attente de validation » ; en litige, elle est bloquée. Les retraits partent du solde disponible vers le compte Mobile Money de la boutique.
- Règles plateforme (commission, durée du séquestre, minimums) : `src/shared/config/platform.ts`.

## Architecture

```
src/
├── app/          router, layouts (public, minimal, back-office, légal)
├── pages/        écrans routés : composition uniquement
├── features/     domaines métier — chacun expose api.ts (écritures), hooks.ts (lectures), composants
│   ├── session/      connexion, profil, ouverture de boutique
│   ├── catalog/      catalogue public, recherche, fiche offre
│   ├── library/      favoris, abonnements
│   ├── checkout/     paiement
│   ├── orders/       cycle de vie des commandes, activité, livraison, reçu
│   ├── listings/     gestion des offres du vendeur
│   └── wallet/       solde, séquestre, retraits
└── shared/
    ├── db/       schéma + base locale réactive + données de démo
    ├── ui/       design system (Button, Card, Table, Dialog, Toast, Tabs…)
    ├── config/   routes, plateforme, paiement, société
    ├── hooks/ lib/
```

Back-office (`app/layouts/AppLayout.tsx`) :
- Écran pleine hauteur : barre du haut (recherche catalogue) et menu de gauche fixes, **seul le panneau de droite défile**.
- Menu épinglable (déplié) ou réduit en rail d'icônes ; le choix est mémorisé. Tiroir sur mobile.
- Chaque écran utilise `Page` (`shared/ui/Pane.tsx`) : barre fixe avec retour, titre, actions et onglets, au-dessus du contenu défilant.
- Le catalogue est intégré (`/compte/explorer`) : fiches, dialogues et paiement s'ouvrent dans le panneau, le menu reste visible.

Règles :
- Toute écriture passe par un `features/*/api.ts`. C'est la seule couche à remplacer par des appels HTTP le jour où un backend existe.
- Les services lèvent `DomainError` avec un message affichable ; l'UI l'affiche via `useServiceAction`.
- Imports via l'alias `@/` ; entre features, uniquement par leur `index.ts`.

## Avant la production

- Renseigner l'entité juridique congolaise dans `src/shared/config/company.ts` (les pages légales affichent « À compléter »).
- Remplacer la connexion de démo (e-mail sans vérification) par une vraie authentification.
- Déplacer côté serveur : validation des codes promo, libération automatique du séquestre, paiements (API opérateurs MTN / Airtel à la place des boutons « Démo » du paiement), stockage des fichiers vendus et des couvertures (aujourd'hui en data URL dans le stockage local), réponses du support.
