# Salacope — consignes pour Claude

Marketplace de produits numériques et de services pour la République du Congo : prix en FCFA (XAF), paiement MTN MoMo et Airtel Money, téléphones en +242. Un seul compte par personne : acheteur, puis vendeur une fois sa boutique ouverte. Pas encore de backend : base locale de démo cohérente dans `src/shared/db` (seed + migrations).

## Architecture

- `app/` : router et layouts. `pages/` : composition uniquement, aucune logique métier.
- `features/*` : `api.ts` pour les écritures (règles métier, `DomainError`), `hooks.ts` pour les lectures, `components`. Entre features, on importe uniquement via leur `index.ts`.
- `shared/` : `ui`, `db`, `config`, `hooks`, `lib`. Alias `@/`.
- Pas de widget ni de vue monolithique : un composant = une responsabilité, réutilisable.

## Scaffold du back-office (CRM)

- Coque pleine hauteur (`AppLayout`) : **seul le panneau de droite défile**, jamais la page entière.
- Menu de gauche **épinglable** (état mémorisé), replié en rail sinon ; tiroir sur mobile.
- En-tête du panneau (bouton retour, titre, actions, barre d'outils) **fixe, il ne défile jamais** : toujours passer par le composant `Page`.
- Le catalogue est **incrusté dans le dashboard** (Explorer, aperçu, paiement) : on ne renvoie pas l'utilisateur connecté vers le site public. Les dialogues s'ouvrent dans le panneau.

## Catégories toujours épinglées

- La barre de catégories (`CategoryTabs`, pastilles avec compteur) reste **collée sous le header pendant le défilement** : toolbar sticky de `CatalogBrowser` sur la vitrine et la recherche, barre d'outils de `Page` dans le back-office.
- Catégorie autre que « Tout », « Voir tout » ou recherche → **grille seule** avec défilement infini. On retire tout ce qui distrait (hero, créateurs, encarts) et le footer reste caché tant que tout n'est pas chargé.

## Minimalisme

- Sobre, façon Stripe / Linear / Kubeta : peu d'éléments, textes courts, pas de décoration gratuite (ni dégradé, ni emoji, ni bordure colorée sur le côté).
- Une information utile par bloc ; la hiérarchie passe par la taille et la graisse, pas par la couleur.
- Couvertures selon le type : livres en portrait, formations en 16:9, services en paysage, templates et coaching en carré. Un bloc = une seule forme (grille en colonnes décalées pour les résultats mélangés).
- Thème nuit par défaut, clair disponible. Couleurs **uniquement via les tokens** (`src/styles/tokens.css`), jamais de hex en dur dans un composant (seule exception : les logos des opérateurs).
- Vitrine : pastilles et boutons arrondis, animations douces et discrètes (apparition au défilement), toujours désactivées avec `prefers-reduced-motion`.
- Données honnêtes : aucun chiffre, avis ou note inventé ; tout vient de la base.

## Aucun contact hors plateforme

- Le vendeur ne voit **jamais** l'e-mail ni le téléphone du client (ni l'inverse) : pas de bouton appeler / WhatsApp / e-mail, pas d'affichage dans les fiches, reçus, listes ou recherches.
- Toute saisie libre entre les parties (messages, livraison, retouche, brief) refuse les coordonnées : `containsContact` / `CONTACT_BLOCKED` dans `features/orders/model.ts`. On échange uniquement via le chat Salacope.

## Façon de travailler

- **Ne pas vérifier le site dans le navigateur** : l'utilisateur teste lui-même. Vérifier avec `npx tsc --noEmit -p . --noUnusedLocals` et `npm run build` (sous Git Bash : `export PATH="/c/Program Files/nodejs:$PATH"`).
- Pas de workflow de revue multi-agents : trop coûteux en tokens, l'utilisateur fait la revue.
- Après une modification de `tailwind.config.js`, redémarrer le serveur de dev (`salacope-dev`, port 3011, voir `.claude/launch.json`).
- Ne jamais commiter ni ouvrir de PR sans demande explicite.
- Réponses en français, courtes.
