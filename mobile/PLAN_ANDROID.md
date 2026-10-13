# Salacope Android — plan d'implémentation (Flutter)

> **À l'agent qui implémente (Gemini)** : lis ce document en entier avant d'écrire une ligne.
> Suis les phases **dans l'ordre**. Chaque phase a des critères de fin : ne passe pas à la suivante tant qu'ils ne sont pas tous remplis.
> En cas de doute sur un comportement, **la source de vérité est le code web** (`src/`) et le serveur (`server/`). Ouvre le fichier cité et reproduis-le, ne devine pas.

---

## 0. Ce qu'on construit (et ce qu'on ne construit pas)

| | Décision |
|---|---|
| **App** | Application Android native en **Flutter** (Dart), dossier `mobile/` à la racine du repo. |
| **Backend** | **Aucun nouveau backend.** L'app consomme l'API existante `https://salacope.online/api` (Node + Postgres sur Vercel, dossier `server/`). |
| **Auth** | Comptes Firebase du projet LightPay (`lightpay-a5f01`), via l'**API REST Identity Toolkit**, exactement comme le web (`src/shared/api/auth.ts`). Pas de SDK `firebase_auth`, pas de `google-services.json`. |
| **Paiement** | LightPay (page de paiement hébergée) ouverte dans un **Chrome Custom Tab**, retour via **Android App Links** sur `https://salacope.online/paiement/retour`. |
| **Périmètre** | Parité fonctionnelle avec le web : vitrine, recherche, fiche offre, boutique publique, achat (compte ou invité), achats, messages, favoris, abonnements, support, paramètres, espace vendeur complet (offres, ventes, clients, paiements, KYC, LightPay). Admin en dernière phase (optionnelle). |
| **Hors périmètre v1** | Notifications push (le serveur n'a pas de FCM), iOS (le code reste compatible mais on ne le teste pas), pages légales natives (on ouvre le web). |

> [!IMPORTANT]
> **Interdit de modifier `server/` et `src/`.** Seule exception côté web : ajouter `public/.well-known/assetlinks.json` (phase 6). Ne jamais commiter ni ouvrir de PR sans demande explicite.

---

## 1. Règles non négociables (copiées de `CLAUDE.md`, adaptées au mobile)

1. **Minimalisme façon Stripe / Linear** : peu d'éléments, textes courts, **ni dégradé, ni emoji, ni bordure colorée sur le côté**. Hiérarchie par la **taille et la graisse**, pas par la couleur.
2. **Couleurs uniquement via les tokens** (`SalacopeColors`, section 3). **Aucun `Color(0x…)` dans un widget.** Seule exception : logos MTN / Airtel (ce sont des PNG).
3. **Thème nuit par défaut**, clair disponible, choix mémorisé.
4. **Données honnêtes** : aucun chiffre, avis, note ou badge inventé. Tout vient de l'API. Pas de « Best-seller », « Populaire » s'ils ne sont pas calculés depuis `stats`.
5. **Aucun contact hors plateforme** : jamais de bouton appeler / WhatsApp / e-mail, jamais d'affichage de l'e-mail ou du téléphone de l'autre partie. Toute saisie libre (message, livraison, retouche, brief, délai) passe par `containsContact()` côté app (retour immédiat) — le serveur refuse de toute façon.
6. **Textes de l'interface en français, recopiés du web mot pour mot.** Ne reformule pas les libellés, statuts, messages d'erreur : ouvre le composant web correspondant et copie.
7. **Couvertures selon la catégorie** : e-book portrait 3:4, formation 16:9, service paysage 4:3, template et coaching carré 1:1. Une rangée/grille = une seule forme.
8. **Animations douces**, toujours coupées si `MediaQuery.of(context).disableAnimations` est vrai.
9. **Un widget = une responsabilité.** Pas d'écran monolithique de 800 lignes. Les écrans composent, ils ne contiennent pas de logique métier.
10. **Barre de catégories toujours épinglée** sous l'en-tête pendant le défilement. Catégorie ≠ « Tout » ou recherche → **grille seule** avec défilement infini, sans hero ni encarts.

---

## 2. Stack technique

Créer le projet :

```powershell
flutter create --org online.salacope --project-name salacope --platforms android mobile
```

- **Flutter stable** récent, Dart 3.
- `minSdkVersion 24`, `targetSdkVersion` = dernier stable. `applicationId` : `online.salacope.app`.
- Ajouter les paquets avec `flutter pub add <nom>` (dernières versions stables, ne pas inventer de numéros) :

| Besoin | Paquet |
|---|---|
| État | `flutter_riverpod` (+ `riverpod_annotation`, `riverpod_generator` en dev) |
| Navigation | `go_router` |
| HTTP | `dio` |
| Modèles JSON | `freezed_annotation`, `json_annotation` (+ `freezed`, `json_serializable`, `build_runner` en dev) |
| Stockage sûr (jetons) | `flutter_secure_storage` |
| Préférences (thème, clé invité) | `shared_preferences` |
| Formats FR | `intl` |
| Icônes (même jeu que le web) | `lucide_icons_flutter` (repli : `lucide_icons`) |
| Paiement / LightPay | `flutter_custom_tabs`, `app_links` |
| Images | `image_picker`, `image_cropper`, `flutter_image_compress` |
| Fichiers | `file_picker`, `path_provider`, `open_filex`, `share_plus` |
| Reçu PDF | `pdf`, `printing` |
| Liens externes (légal, LightPay compte) | `url_launcher` |
| Cycle de vie / connectivité | `connectivity_plus` |
| Splash / icône | `flutter_native_splash`, `flutter_launcher_icons` (dev) |
| Tests | `flutter_test`, `mocktail` |

- Polices **embarquées** (pas de téléchargement à l'exécution, réseau lent au Congo) : **Geist** (400/500/600/700) et **Instrument Serif** (regular + italic) dans `mobile/assets/fonts/`, déclarées dans `pubspec.yaml`.
- Images de marque : copier `src/shared/assets/{salacope-mark,lightpay-mark,mtn-momo,airtel-money}.png` vers `mobile/assets/images/`.

### Configuration par environnement

```powershell
flutter run --dart-define=API_BASE_URL=https://salacope.online/api --dart-define=PUBLIC_URL=https://salacope.online
```

`lib/core/config/env.dart` lit `String.fromEnvironment` avec ces valeurs par défaut. La clé Firebase web (`AIzaSyAyOdD8qSUfx8wvHhb5F4EJ4zKjavwnpeI`, publique par conception, voir `src/shared/api/auth.ts:7`) va dans `FIREBASE_API_KEY` avec la même valeur par défaut.

---

## 3. Design system — la base

> [!IMPORTANT]
> Le design est **la** priorité. L'app doit être reconnaissable comme Salacope au premier coup d'œil : fond charbon quasi noir, texte blanc cassé, **un seul accent vert** (le vert du logo) pour les prix, l'onglet actif et l'action principale. Rien d'autre n'est coloré.

### 3.1 Couleurs — `lib/core/design/colors.dart`

Traduction **exacte** de `src/styles/tokens.css`. Implémenter une `ThemeExtension<SalacopeColors>` avec `dark` et `light`. Les valeurs RGB ci-dessous sont celles du CSS, ne pas les arrondir.

| Token | Nuit (défaut) | Clair | Usage |
|---|---|---|---|
| `canvas` | `11 11 12` | `244 244 246` | fond d'écran |
| `surface` | `19 19 20` | `255 255 255` | cartes, panneaux, barres |
| `gray50` | `22 22 23` | `250 250 250` | fond de menu, survol léger |
| `gray100` | `28 28 30` | `244 244 245` | fond d'image vide, badge neutre |
| `gray200` | `42 42 45` | `228 228 231` | **bordures** |
| `gray300` | `58 58 62` | `212 212 216` | bordure de bouton secondaire |
| `gray400` | `110 110 117` | `161 161 170` | texte tertiaire, icônes inactives |
| `gray500` | `155 155 162` | `113 113 122` | **texte secondaire** |
| `gray600` | `184 184 190` | `82 82 91` | texte de menu inactif |
| `gray700` | `212 212 216` | `63 63 70` | texte de badge neutre |
| `gray800` | `232 232 234` | `39 39 42` | texte de bouton secondaire |
| `gray900` | `244 244 245` | `24 24 27` | **texte principal** |
| `gray950` | `250 250 250` | `9 9 11` | texte le plus fort |
| `primary50` | `10 42 31` | `236 253 245` | fond de badge marque |
| `primary600` | `5 150 105` | `5 150 105` | vert du logo (identique) |
| `primary700` | `52 211 153` | `4 120 87` | **prix**, liens, texte marque |
| `accent` | `52 211 153` | `4 120 87` | bouton principal, onglet actif |
| `onAccent` | `4 19 13` | `255 255 255` | texte sur accent |
| `emerald50/500/700` | `8 42 31` / `16 185 129` / `74 222 159` | `236 253 245` / `16 185 129` / `4 120 87` | succès |
| `amber50/500/800` | `42 31 7` / `245 158 11` / `252 211 77` | `255 251 235` / `245 158 11` / `146 64 14` | attention |
| `red50/500/600/700` | `46 16 16` / `239 68 68` / `248 113 113` / `252 165 165` | `254 242 242` / `239 68 68` / `220 38 38` / `185 28 28` | danger, erreurs |
| `blue50/500/700` | `12 29 56` / `96 165 250` / `147 197 253` | `239 246 255` / `59 130 246` / `29 78 216` | info |

Compléter avec **toutes** les nuances listées dans `tokens.css` (primary 100→950, amber 200/600/900, red 200/400, emerald 400) pour ne jamais devoir inventer une teinte.

Accès dans un widget : `final c = context.colors;` (extension sur `BuildContext`). Opacité : `c.gray200.withValues(alpha: .7)` (équivalent de `border-gray-200/70`).

### 3.2 Typographie — `lib/core/design/typography.dart`

- Famille par défaut **Geist**, `fontFeatures: [FontFeature.tabularFigures()]` sur tous les montants et compteurs.
- Titres : `letterSpacing: -0.011em` → en Flutter `fontSize * -0.011`.
- Échelle (reprise de Tailwind) :

| Nom | Taille | Graisse | Usage web d'origine |
|---|---|---|---|
| `display` | 38 (hauteur 1.03, espacement -0.035em) | 600 | titre hero vitrine |
| `title` | 20 | 600 | titre d'écran |
| `headline` | 18 | 600 | titre de fiche, prix mis en avant |
| `panelTitle` | 15 | 600 | titre de `Panel` |
| `body` | 14 | 400 | texte courant |
| `bodyStrong` | 14 | 600 | titre de carte |
| `caption` | 12.5 | 400 | vendeur sous une carte |
| `small` | 12 | 500 | badges, fil d'Ariane de carte |
| `overline` | 11 | 600, MAJUSCULES, espacement +0.06em | en-têtes de colonnes de liste |

- **Instrument Serif italique** : réservé à l'accent du hero (« créateurs du Congo » en `primary700`, `StorefrontHero.tsx:161`). Nulle part ailleurs.

### 3.3 Formes, espaces, ombres — `lib/core/design/tokens.dart`

- Rayons : `sm 4`, `md 6`, `lg 8`, `xl 12`, `2xl 16` (panneaux), `3xl 24` (carte de commande), `hero 26`, `full 9999`.
- Espacement en multiples de 4. Marge latérale d'écran : **16**.
- Ombres (utilisées avec parcimonie, surtout en clair) : reprendre `--shadow-xs/sm/md/lg` de `tokens.css` en `BoxShadow`. En thème nuit, préférer la bordure `gray200` à l'ombre.
- **Pas de barre de défilement visible** (le web les masque partout).

### 3.4 Mouvement — `lib/core/design/motion.dart`

- Courbe maison : `Cubic(.2, .7, .2, 1)`.
- `fadeUp` : opacité 0→1 + translation Y 8→0, **450 ms** (`tailwind.config.js` `fade-up`). Utilisé par `Reveal` à l'apparition des cartes au défilement, décalage `(index % 4) * 60 ms`.
- Appui sur une carte : léger `scale 0.98` (remplace le `-translate-y-1` du survol web).
- Transitions de page : `FadeThrough` / glissement court (≤ 250 ms). Couverture partagée liste → fiche via `Hero`.
- Tout est désactivé si `disableAnimations`.

### 3.5 Composants de base — `lib/core/ui/`

Chaque composant = un fichier, reproduit le composant web cité. **Lire le fichier web avant de coder.**

| Widget Flutter | Source web | Points clés |
|---|---|---|
| `SButton` | `shared/ui/Button.tsx` | variantes `primary` (fond `accent`, texte `onAccent`), `secondary` (fond `surface`, bordure `gray300`, texte `gray800`), `ghost`, `danger` (texte `red600`). Tailles mobiles : `sm 36`, `md 44`, `lg 48`, `xl 52` (cible tactile ≥ 44). Option `pill` (vitrine) sinon rayon `md`. `onPressed` peut renvoyer un `Future` → spinner + clics ignorés jusqu'à la fin (comme le web). |
| `SBadge` | `shared/ui/Badge.tsx` | hauteur 20, rayon full, `small`. Tons `neutral/success/warning/danger/info/brand` avec la table `TONES`. Option point coloré 6×6. |
| `SPanel` | `shared/ui/Panel.tsx` | rayon 16, bordure `gray200 @70%`, fond `surface`. En-tête : titre `panelTitle` + compteur `gray400` + aide ⓘ + actions à droite. Modes `flush` (listes bord à bord) et barre d'actions en pied. |
| `SPage` | `shared/ui/Pane.tsx` (`Page`) | **En-tête fixe qui ne défile jamais** : retour, titre, méta (badge), actions, et une `toolbar` optionnelle (onglets) épinglée dessous. Contenu en `CustomScrollView`. Tous les écrans internes passent par `SPage`. |
| `SStatGrid` / `SStat` | `shared/ui/Stat.tsx` | grille 2 colonnes sur mobile, libellé `overline`, valeur `headline` tabulaire. |
| `SList` / `SListSection` | `shared/ui/List.tsx` | lignes séparées par `gray200`, en-têtes de colonnes en `overline`. |
| `SSegmented` | `shared/ui/Segmented.tsx` | filtres à 2–5 options. |
| `CategoryTabs` | `features/catalog/components/CatalogFilters.tsx` + vitrine | pastilles arrondies défilables horizontalement, compteur à droite du libellé, active = fond `accent`. **Épinglées** (`SliverPersistentHeader pinned`). |
| `SField` / `SSearchField` | `shared/ui/Field.tsx` | fond `surface`, bordure `gray200`, focus = contour `primary600` 2 px. Erreur sous le champ en `red600`. |
| `SEmptyState` | `shared/ui/EmptyState.tsx` | icône `gray400`, titre, description, action. |
| `SToast` | `shared/ui/Toast.tsx` | `SnackBar` flottante sombre, succès/erreur. |
| `SSheet` / `SConfirm` | `shared/ui/Dialog.tsx` | sur mobile, **les dialogues de formulaire deviennent des bottom sheets** ; la confirmation reste un dialogue centré. |
| `SAvatar` | `shared/ui/misc.tsx` | initiales (`getInitials`) ou logo de boutique. |
| `Handoff` | `shared/ui/Handoff.tsx` + `global.css` (`handoff-dot`) | logos Salacope ↔ LightPay, un point voyage de l'un à l'autre en 1,4 s en boucle. Affiché pendant l'ouverture et le retour de LightPay. |
| `OperatorLogo` | `shared/ui/OperatorLogo.tsx` | PNG MTN / Airtel. |
| `SImageViewer` | `shared/ui/ImageViewer.tsx` | plein écran, zoom (`InteractiveViewer`), glisser pour fermer. |
| `HelpTip` | `shared/ui/HelpTip.tsx` | ⓘ → petite bulle / sheet. |
| `UpdatedAt` | `shared/ui/UpdatedAt.tsx` | « Données à jour à 16:51 » en pied de panneau (`useLastSync`). |

### 3.6 Composants métier visuels — `lib/features/catalog/widgets/`

- `ListingCover` (`ListingCover.tsx`) : rapport selon `COVER_FORMAT` (`catalog/model.ts:44`), rayon 12 sans cadre (`bare`) + liseré intérieur `gray950 @6%`, fond `gray100`.
- `ListingThumb` : vignette de liste, hauteur fixe 40/56, largeur selon le format (table `THUMB_SIZE`).
- `ListingCard` (`ListingCard.tsx`) : couverture sans cadre + bouton favori en haut à droite, puis **« Type › détail »** (`cardBreadcrumb`) en `small gray500`, titre `bodyStrong` 2 lignes max, nom du vendeur `caption gray500`, prix `bodyStrong primary700`. **Rien d'autre** (pas de note, pas de description).
- `ListingGrid` : colonnes selon le format (portrait/carré : 2 colonnes, paysage/vidéo : 1 colonne pleine largeur ou 2 sur tablette), espacement 16 × 32.
- `ListingMasonry` : résultats mélangés en colonnes décalées (`ListingMasonry.tsx`).
- `ListingRail` : rangée horizontale d'une catégorie avec « Voir tout ».
- `ListingPrice` : prix + prix barré (`compareAtXaf`) en `gray400` barré.
- `KindBadge`, `SellerCard`, `CreatorStrip`, `SellerProfile` : reprendre les fichiers du même nom.

### 3.7 Rendu des images (piège)

Les couvertures et logos sont souvent des **data URL base64** (`data:image/jpeg;base64,…`), parfois des URL `https`. Créer `SImage` (`lib/core/ui/s_image.dart`) qui :
- détecte `data:` → décode **une seule fois** (cache mémoire LRU par hash de la chaîne, décodage dans un `Isolate` via `compute`) → `Image.memory` avec `cacheWidth` adapté ;
- sinon → `Image.network` avec cache ;
- affiche `gray100` pendant le chargement, jamais de flash blanc.

---

## 4. Architecture du code Flutter

Miroir de l'architecture web (`features/*` avec `api` / `hooks` / composants).

```
mobile/lib/
├── main.dart                     bootstrap, ProviderScope, thème, router
├── app/
│   ├── router.dart               go_router : toutes les routes (section 5)
│   ├── shell.dart                barre de navigation du bas + badges
│   └── deep_links.dart           App Links + mapping des liens web → routes app
├── core/
│   ├── config/  env.dart, platform.dart (PLATFORM), payment.dart (PAYMENT_CHANNELS)
│   ├── design/  colors, typography, tokens, motion, theme.dart
│   ├── ui/      composants de base (section 3.5)
│   ├── api/     api_client.dart, auth.dart, guest.dart, sync.dart, domain_error.dart
│   ├── db/      models/*.dart (freezed), store.dart (base réactive en mémoire), patch.dart
│   ├── domain/  contact.dart, orders.dart, listings.dart, kyc.dart, pricing.dart, reviews.dart
│   └── lib/     format.dart, image.dart, async.dart
└── features/
    ├── session/        connexion, inscription, profil, ouverture de boutique, LightPay Connect
    ├── catalog/        vitrine, recherche, fiche, boutique publique
    ├── library/        favoris, abonnements
    ├── checkout/       paiement LightPay, retour, code de paiement
    ├── orders/         achats, ventes, commande, chat, livraison, retouche, délai, reçu
    ├── reviews/        avis
    ├── listings/       éditeur d'offre du vendeur
    ├── wallet/         solde, séquestre, historique
    ├── verification/   KYC
    ├── support/        tickets
    ├── notifications/  cloche + liste
    └── admin/          (phase 10)
```

Chaque feature : `data/<feature>_api.dart` (écritures, = `api.ts`), `providers.dart` (lectures dérivées du store, = `hooks.ts`), `model.dart` (règles pures, = `model.ts`), `widgets/`, `screens/`. **Entre features, on importe uniquement le fichier `<feature>.dart` d'export** (équivalent des `index.ts`).

### 4.1 Portage du domaine (`core/domain`, `features/*/model.dart`)

Porter **fonction par fonction**, avec les mêmes noms en camelCase, et un test unitaire par fonction :

| Source TS | Cible Dart | À porter |
|---|---|---|
| `shared/domain/contact.ts` | `core/domain/contact.dart` | `containsContact`, `contactBlocked` (mêmes 3 regex) |
| `shared/domain/orders.ts` | `core/domain/orders.dart` | `perspectiveOf`, `revisionsLeft`, `hasPendingExtension`, `permissionsFor`, `cleanSellerTags`, constantes `MAX_MESSAGE_IMAGES=3`, `PAYMENT_REQUEST_MINUTES=5`, `MAX_SELLER_TAGS=5` |
| `shared/domain/listings.ts` | `core/domain/listings.dart` | `validateListing`, `featuresError`, `featureLines`, `LISTING_LIMITS`, `MAX_BRIEF_QUESTIONS`, `CATEGORY_IDS` |
| `shared/domain/kyc.ts` | `core/domain/kyc.dart` | `validateKyc`, `KYC_DOCUMENTS`, `KYC_ID_TYPES`, `KYC_STATUS_LABEL`, `KYC_MAX_BYTES` |
| `shared/domain/pricing.ts` + `config/platform.ts` | `core/domain/pricing.dart`, `core/config/platform.dart` | `priceOrder`, `computeFee`, `releaseDays`, `RELEASE_RULE`, tout `PLATFORM` |
| `features/orders/model.ts` | `features/orders/model.dart` | `statusDisplay`, `EVENT_LABEL`, `needsAction`, `buyerFollowUp`, `fundsState`, `SELLER_LANES`, `sellerLane`, `isLate`, `isRevising`, filtres et périodes |
| `features/catalog/model.ts` | `features/catalog/model.dart` | `CATEGORIES`, `cardBreadcrumb`, `COVER_FORMAT`, `COVER_SIZE`, `COVER_HINT`, `KIND_LABEL`, `deliveryLabel`, `SORT_OPTIONS`, `queryListings` |
| `features/wallet/model.ts` | `features/wallet/model.dart` | `computeBalance`, `buildLedger`, `upcomingReleases` |
| `features/checkout/model.ts`, `support/model.ts`, `reviews/model.ts`, `orders/chat.ts` | idem | tout |
| `shared/lib/format.ts` | `core/lib/format.dart` | `formatXaf` (« 12 500 FCFA », séparateur fr), `formatNumber`, `formatDate`, `formatDateTime`, `formatMonthYear`, `formatRelative` (« à l'instant », « il y a 3 heures »…), `getInitials`, `formatFileSize`, `plural` — `intl` locale `fr_FR` |

### 4.2 Modèles (`core/db/models/`)

Une classe `freezed` par interface de `src/shared/db/schema.ts` : `User`, `Merchant`, `Listing`, `ListingFile`, `BriefQuestion`, `Order` (+ `OrderItem`, `OrderAmounts`, `OrderPayment`, `OrderDelivery`, `OrderEvent`, `OrderMessage`, `OrderChat`, `Attachment`, `PaymentRequest`, `DeadlineExtension`, `SellerMeta`), `PaymentAttempt`, `Ticket`, `TicketMessage`, `Notification`, `Favorite`, `Follow`, `Review`, `Stats`, `Database`.
- Les unions TS deviennent des `enum` avec `@JsonValue('in_progress')` etc. + une valeur `unknown` de repli (`@JsonKey(unknownEnumValue: …)`) pour ne jamais planter sur une valeur nouvelle.
- **Tous les champs optionnels du TS sont nullables** en Dart. Dates : `String` ISO dans le modèle + getters `DateTime` (le web compare des chaînes ISO, garder ce comportement pour les tris).

### 4.3 Client API (`core/api/api_client.dart`) — miroir de `client.ts`

```dart
/// Appelle l'API Salacope comme la personne connectée (ou l'invité de cet appareil).
Future<Map<String, dynamic>> request(String method, String path, {Object? body}) async {
  final token = await auth.idToken();          // rafraîchi 5 min avant expiration
  final guestKey = guest.key();
  try {
    final res = await dio.request(
      '${Env.apiBaseUrl}$path',
      data: body == null ? null : jsonEncode(body),
      options: Options(method: method, headers: {
        if (body != null) 'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
        if (guestKey != null) 'X-Salacope-Guest': guestKey,
      }, validateStatus: (_) => true),
    );
    final data = (res.data is Map) ? res.data as Map<String, dynamic> : <String, dynamic>{};
    if (res.statusCode! >= 400) {
      throw DomainError(data['error'] ?? 'Erreur du serveur. Réessayez dans un instant.', res.statusCode);
    }
    return data;
  } on DioException {
    throw DomainError('Pas de connexion internet. Réessayez.');
  }
}

/// Écriture : le serveur renvoie les lignes modifiées, appliquées au store local.
Future<Map<String, dynamic>> mutate(String method, String path, {Object? body}) async {
  final r = await request(method, path, body: body);
  if (r['patch'] != null || r['removed'] != null) store.apply(r['patch'], r['removed']);
  return r;
}
```

`DomainError(message, status)` : le message est **toujours affichable tel quel** (le serveur l'écrit en français).

### 4.4 Store réactif (`core/db/store.dart`) — miroir de `store.ts`

- `StateNotifier<Database>` (ou `Notifier`) exposé par `storeProvider`.
- `load(Database)` remplace tout ; `apply(patch, removed)` **fusionne par clé** avec exactement la table `keyOf` du web (`favorites` par `listingId`, `follows` par `sellerId`, le reste par `id`) puis retrie avec `ORDER_BY` (commandes, notifications, tentatives, avis par `createdAt` desc ; tickets par `updatedAt` desc). `stats` remplacé s'il est présent.
- Les écrans lisent via des providers dérivés (`select`) pour ne reconstruire que ce qui change.
- **Cache disque** du dernier bootstrap (fichier JSON dans `getApplicationSupportDirectory`) : au démarrage, afficher le cache immédiatement puis rafraîchir. Indispensable avec un réseau lent.

### 4.5 Synchronisation (`core/api/sync.dart`) — miroir de `sync.ts`

- `boot()` : `GET /bootstrap`. Si `needsAccount` → `POST /session {}` puis vider la clé invité puis re-`GET /bootstrap`. Si `401` → déconnexion puis `boot()` à nouveau. Mémoriser `serverTime` comme `lastSync`. États : `loading | ready | offline`.
- `syncNow()` : `GET /sync?since=<lastSync>` → `store.apply(patch)`.
- Rythme : **toutes les 30 s** quand l'app est au premier plan, **toutes les 4 s** quand une conversation est ouverte (`useLiveSync(fast: true)`), et **immédiatement au retour au premier plan** (`AppLifecycleState.resumed`). Rien en arrière-plan.

### 4.6 Authentification (`core/api/auth.dart`) — miroir de `auth.ts`

- `signIn(email, password)` → `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=…`
- `signUp(email, password)` → `accounts:signUp`, puis `POST /session { name, phone }` (le nom vient du formulaire).
- `resetPassword(email)` → `accounts:sendOobCode` `{ requestType: 'PASSWORD_RESET' }`.
- `idToken()` → si expiration dans < 5 min : `POST https://securetoken.googleapis.com/v1/token?key=…` (form-urlencoded `grant_type=refresh_token`). Sur 400 → déconnexion.
- Identifiants (`uid, email, idToken, refreshToken, expiresAt`) dans **`flutter_secure_storage`** (jamais en clair).
- Table `MESSAGES` des codes Firebase → recopier les traductions françaises de `auth.ts:39-51`.
- Après connexion ou déconnexion : `boot()`.

### 4.7 Invité (`core/api/guest.dart`)

Clé `salacope.guest` dans `shared_preferences`. Enregistrée quand `POST /checkout` renvoie `guestKey`. Envoyée dans chaque requête. Effacée quand un compte la reprend.

---

## 5. Navigation et écrans

### 5.1 Coquille : barre de navigation du bas (`app/shell.dart`)

Le web a une coquille « back-office » avec menu latéral. Sur Android : **`NavigationBar` en bas à 5 onglets**, fond `surface`, bordure haute `gray200`, icône + libellé, actif en `accent`. Badges = mêmes compteurs que `AppLayout.tsx:115-124`.

| Onglet | Icône (lucide) | Contenu | Badge |
|---|---|---|---|
| **Accueil** | `Compass` | vitrine / catalogue | — |
| **Messages** | `MessagesSquare` | conversations | `useUnreadCount` |
| **Achats** | `ShoppingBag` | Mes achats · Favoris · Abonnements (onglets épinglés) | à valider + nouveautés d'abonnements |
| **Boutique** | `Store` | espace vendeur si boutique ouverte, sinon page « Vendre » + ouvrir ma boutique ; masqué pour un invité | ventes à traiter (+1 si KYC à faire) |
| **Compte** | `UserRound` | profil, paramètres, support, thème, légal, déconnexion, admin si `user.admin` | tickets répondus |

Visiteur non connecté : Messages / Achats / Boutique / Compte affichent l'invite de connexion (`features/session/components/GuestPrompt.tsx`). L'**achat reste possible sans compte** (invité).

En-tête de l'onglet Accueil : logo Salacope, champ de recherche (ouvre l'écran Recherche), cloche de notifications (`NotificationBell.tsx`).

### 5.2 Table des routes (`app/router.dart`)

Chemins **identiques au web** (`src/shared/config/routes.ts`) pour que les App Links et les `href` des notifications tombent juste.

| Route app | Écran Flutter | Source web à reproduire |
|---|---|---|
| `/` | `HomeScreen` | `pages/public/HomePage.tsx`, `CatalogBrowser`, `StorefrontHero`, `ListingSections`, `CreatorStrip` |
| `/recherche?q=&categorie=&tri=` | `SearchScreen` | `pages/public/SearchPage.tsx`, `CatalogFilters` |
| `/produit/:id` | `ListingScreen` | `ListingDetail.tsx`, `ListingQuickView.tsx`, avis `features/reviews/components.tsx` |
| `/boutique/:id` | `StoreScreen` | `SellerProfile.tsx`, `pages/public/StorePage.tsx` |
| `/checkout/:id` | `CheckoutScreen` | `pages/shared/CheckoutPage.tsx`, `CheckoutForm.tsx`, `PaymentChannelPicker.tsx` |
| `/paiement/retour?tentative=&annule=` | `PaymentReturnScreen` | `PaymentReturn.tsx` |
| `/connexion?creer=1` | `SignInScreen` | `SignInForm.tsx` |
| `/vendre` | `SellScreen` | `pages/public/SellPage.tsx`, `SellerInvite.tsx` |
| `/compte/messages`, `/compte/messages/:id` | `MessagesScreen`, `ChatScreen` | `MessagesPage.tsx`, `orders/components/chat/*`, `ChatHeader.tsx` |
| `/compte/achats`, `/compte/achats/:id` | `OrdersScreen`, `OrderScreen(buyer)` | `OrdersPage.tsx`, `OrderPage.tsx`, `DigitalPurchaseView.tsx`, `ServiceDesk.tsx`, `OrderWorkspace.tsx` |
| `/compte/favoris` | `FavoritesScreen` | `FavoritesPage.tsx` |
| `/compte/abonnements` | `FollowingScreen` | `FollowingPage.tsx` |
| `/compte/parametres` | `SettingsScreen` | `SettingsPage.tsx` |
| `/compte/boutique` | `OpenStoreScreen` | `OpenStorePage.tsx`, `MerchantForm.tsx`, `StoreLogoField.tsx` |
| `/compte/support`, `/compte/support/nouveau`, `/compte/support/:id` | `SupportScreen`, `NewTicketScreen`, `TicketScreen` | `features/support/components.tsx` |
| `/dashboard` | `DashboardScreen` | `pages/seller/DashboardPage.tsx`, `BarChart.tsx` |
| `/dashboard/ventes`, `/dashboard/ventes/:id` | `SalesScreen`, `OrderScreen(seller)` | `SalesPage.tsx`, `SellerOrderTools.tsx`, `NextStepCard.tsx` |
| `/dashboard/offres`, `/nouvelle`, `/:id` | `ListingsScreen`, `ListingEditorScreen` | `ListingsPage.tsx`, `ListingEditor.tsx` |
| `/dashboard/clients` | `CustomersScreen` | `CustomersPage.tsx` |
| `/dashboard/paiements` | `PayoutsScreen` | `PayoutsPage.tsx`, `LightPayConnect.tsx` |
| `/dashboard/verification` | `VerificationScreen` | `VerificationPage.tsx`, `KycForm.tsx`, `VerificationNotice.tsx` |
| `/lightpay/callback?code=&state=&error=` | `LightPayCallbackScreen` | `LightPayCallbackPage.tsx` |
| `/admin/**` | phase 10 | `pages/admin/*` |
| `/legal/**` | ouvre `PUBLIC_URL + chemin` via `url_launcher` (Custom Tab) | — |

Gardes (= `features/session/guards.tsx`) : `requireAuth` (compte **ou** invité), `requireMerchant`, `requireAdmin` via `redirect` de go_router.

### 5.3 Liens web → routes app (`app/deep_links.dart`)

Les notifications contiennent un `href` web (ex. `/compte/achats/ord_123`, `/compte/abonnements?boutique=usr_9`). Comme les chemins sont identiques, `context.go(href)` suffit ; prévoir un repli vers `/` si la route est inconnue. Même logique pour les App Links entrants.

### 5.4 Détails des écrans clés (spécifications design)

**Accueil (`HomeScreen`)** — `CustomScrollView` :
1. En-tête (logo, recherche, cloche) qui se replie au défilement.
2. Hero compact : pastilles de promesses repliables (`StorePromises`), titre `display` avec « créateurs du Congo » en Instrument Serif italique `primary700`, sous-titre `gray500`, **un** bouton `primary xl pill` « Explorer le catalogue » et un `secondary xl pill` « Vendre sur Salacope » / « Ma boutique ». Puis la carte « À la une » (`FeaturedListing`, rayon 26, badge flou « À la une »).
3. `CategoryTabs` **épinglées** : « Tout » + 5 catégories avec compteurs.
4. « Tout » : une `ListingRail` par catégorie (ordre de `CATEGORIES`), `CreatorStrip` (créateurs avec ventes confirmées et ≥ 4 étoiles uniquement), invitation vendeur.
5. Autre catégorie : **grille seule** de la catégorie, défilement infini (`useInfiniteList` : pages de 24), plus aucun hero ni encart.
6. Tirer pour rafraîchir → `syncNow()` + `boot()`.

**Fiche offre (`ListingScreen`)** : couverture plein largeur (Hero), fil « Type › détail », titre `title`, vendeur (avatar + nom → boutique, bouton Suivre), prix `headline primary700` + prix barré, ligne de promesse (`deliveryLabel`), « Ce qui est inclus » (liste à puces sobre), description, avis (réels uniquement). **Barre d'action fixe en bas** : prix à gauche, `SButton primary lg pill` « Acheter » à droite, favori. Partage via `share_plus` (lien `PUBLIC_URL/produit/:id`).

**Achat (`CheckoutScreen`)** : récapitulatif (vignette, titre, total `formatXaf`), questions du brief si service (requises marquées, `containsContact` en direct), facture optionnelle (raison sociale, NIF), choix MTN / Airtel (`PaymentChannelPicker` avec `OperatorLogo`), bouton « Payer » → flux section 6.

**Commande (`OrderScreen`)** : en-tête `SPage` (numéro `SC-10482` + `OrderStatusBadge`), puis selon le cas :
- produit numérique acheteur → `DigitalPurchaseView` (produit + téléchargement d'abord, puces d'options « Détails / Activité / Reçu / Signaler », avis discret en bas) ;
- service → `NextStepCard` (la prochaine action en gros, selon `permissionsFor`), `OrderProgress`, `BriefCard`, `DeadlineCard`, `DeliveryCard`, `OrderActivity` ;
- vendeur → `SellerOrderTools` (étiquettes, épingle).
Les actions (accepter, livrer, confirmer, annuler, litige, retouche, délai, réponse au délai) ouvrent des **bottom sheets** (`OrderDialogs.tsx`) avec texte requis et `containsContact`.

**Chat (`ChatScreen`)** : style messagerie moderne et sobre — bulles `surface`/`gray100` (pas de vert plein sauf ses propres messages en `primary50` + texte `gray900`), coches ✓ / ✓✓ / ✓✓ colorées (`MessageTicks.tsx`, d'après `chat.seen` / `chat.read`), cartes spéciales : `PaymentRequestCard` (compte à rebours 5 min après ouverture → bouton payer), `ValidationCard`. Saisie : texte + jusqu'à **3 images par message** + fichiers (3 Mo au total, en data URL). Menu : messages éphémères (acheteur), bloquer (acheteur), fiche de l'autre partie (`CounterpartSheet`, **sans coordonnées**). Appel `POST /orders/:id/read` à l'ouverture et à chaque nouveau message reçu.

**Tableau de bord vendeur (`DashboardScreen`)** : sous-navigation épinglée en pastilles (Vue d'ensemble · Ventes · Offres · Clients · Paiements · Vérification si non approuvée). Vue d'ensemble : `SStatGrid` (chiffres réels), graphique de ventes (`BarChart.tsx`, barres `accent`, sans grille décorative), file de travail par `SELLER_LANES`, `VerificationNotice` / `LightPayConnect` si requis.

**Éditeur d'offre (`ListingEditorScreen`)** : formulaire en étapes dans des `SPanel` : type & catégorie → titre / résumé / description (compteurs de caractères depuis `LISTING_LIMITS`) → « Ce qui est inclus » → prix (+ prix barré) → couverture (**recadrage au rapport de la catégorie** avec `image_cropper`, puis redimensionnement à `COVER_SIZE` et JPEG qualité 0,82, ≤ 400 000 caractères) → service : délai, retouches, questions du brief / numérique : fichier livré → aperçu de la carte → Publier / Enregistrer le brouillon. Validation locale = `validateListing` avant envoi.

**Paiements (`PayoutsScreen`)** : `GET /lightpay/balance` (disponible, bloqué), `computeBalance` (séquestre, gelé, versé, commission), `upcomingReleases`, `buildLedger`. Boutons « Retirer » / « Mon compte LightPay » → `withdrawUrl` / `accountUrl` dans un Custom Tab.

**KYC (`VerificationScreen`)** : formulaire de `KycForm.tsx`, 3 photos (recto, verso, selfie) via appareil photo ou galerie, compressées (côté le plus long ≤ 1600 px, ≤ 700 Ko, cf. `shrinkImageFile`), validation `validateKyc` avant `POST /kyc`.

**Reçu** : `OrderReceipt.tsx` → PDF généré avec `pdf` (toujours sur fond blanc, comme l'impression web), partage / impression via `printing`.

**Téléchargement d'un fichier livré** : les fichiers de livraison sont des `Attachment` avec `dataUrl` → décoder, écrire dans le dossier de l'app, ouvrir avec `open_filex` ou partager.

---

## 6. Paiement LightPay et retours dans l'app

### 6.1 Achat

1. `POST /checkout { listingId, brief: {questionId: réponse}, invoice? }` → `{ attempt, checkoutUrl, guestKey?, patch }`. Enregistrer `guestKey` s'il est présent. Appliquer `patch`.
2. Afficher `Handoff` (Salacope → LightPay) ~700 ms, puis ouvrir `checkoutUrl` dans un **Chrome Custom Tab** (`flutter_custom_tabs`, barre d'outils couleur `canvas` du thème).
3. LightPay renvoie vers `https://salacope.online/paiement/retour?tentative=<id>` (ou `&annule=1`). Grâce à l'App Link (6.3), **Android rouvre l'app** sur `/paiement/retour`.
4. `PaymentReturnScreen` = `PaymentReturn.tsx` : `POST /checkout/:id/refresh` toutes les **3 s**, **20 fois max**, puis :
   - `succeeded` → toast « Paiement confirmé » → `/compte/achats/:orderId` ;
   - `pending` → « Paiement pas encore reçu », code `TX-XXXX-XXXX` (`PaymentCode`), « Reprendre le paiement » / « Abandonner » (`POST /checkout/:id/cancel`) ;
   - échec → libellé `attemptOutcome`, code, « Réessayer » / « Contacter le support ».
5. **Filet de sécurité** : si l'utilisateur ferme le Custom Tab sans passer par le lien (retour arrière), au `resumed` de l'app, s'il existe une tentative `pending` récente → ouvrir `PaymentReturnScreen` pour elle.

### 6.2 Connexion du wallet LightPay (vendeur)

`POST /lightpay/connect` → `{ url }` → Custom Tab avec `Handoff`. LightPay revient sur `https://salacope.online/lightpay/callback?code=…&state=…` → App Link → `LightPayCallbackScreen` → `POST /lightpay/callback { code, state, error? }` → patch utilisateur → retour à Paiements.

> [!NOTE]
> Sur le web, `LightPay.pay()` reçoit l'`idToken` pour éviter une seconde connexion au wallet. Dans un Custom Tab ce n'est pas transmis : l'acheteur qui paie **par wallet** LightPay peut devoir s'y connecter. Le paiement **Mobile Money** n'est pas concerné. Accepté pour la v1.

### 6.3 App Links (Android)

- `AndroidManifest.xml`, activité principale : `intent-filter android:autoVerify="true"`, `scheme https`, `host salacope.online` (et `www.salacope.online`), chemins : `/paiement/retour`, `/lightpay/callback`, préfixes `/produit/`, `/boutique/`, `/compte/`, `/dashboard/`.
- Lire les liens avec `app_links` (lien initial + flux) et les passer à go_router.
- **Seul changement côté web** : créer `public/.well-known/assetlinks.json` avec le `package_name` `online.salacope.app` et les empreintes SHA-256 des clés **debug et release** (`keytool -list -v -keystore …`). Vercel sert les fichiers statiques avant les rewrites ; vérifier après déploiement : `curl https://salacope.online/.well-known/assetlinks.json` doit renvoyer le JSON (pas `index.html`).

---

## 7. Carte des appels API (contrat à respecter)

Toutes relatives à `API_BASE_URL`. Les écritures renvoient `{ patch, removed? }` à appliquer au store. Vérifier la liste complète avec : `rg -n "route\('(GET|POST|PUT|PATCH|DELETE)'" server/routes`.

| Domaine | Appels |
|---|---|
| Démarrage | `GET /bootstrap`, `GET /sync?since=` |
| Session / profil | `POST /session {name?, phone?}`, `PATCH /me {name, phone}` |
| Boutique | `POST /merchant`, `PATCH /merchant {storeName, headline, city}`, `PUT /merchant/logo {logo: dataUrl\|null}` (≤ 80 Ko, carré) |
| KYC | `POST /kyc {fullName, birthDate, nationality, idType, idNumber, idExpires?, address, pep, documents:{front,back,selfie}}` |
| Offres | `POST /listings`, `PATCH /listings/:id`, `POST /listings/:id/status`, `DELETE /listings/:id` |
| Bibliothèque | `POST`/`DELETE /favorites/:listingId`, `POST`/`DELETE /follows/:sellerId`, `POST /follows/:sellerId/seen`, `POST /notifications/read` |
| Paiement | `POST /checkout`, `POST /checkout/:attemptId/refresh`, `POST /checkout/:attemptId/cancel` |
| Commande | `POST /orders/:id/{accept, deliver{note,files}, confirm, cancel{reason}, dispute{reason}, revise{note}, extend{days,reason}, extension{accept}}`, `POST /orders/:id/report {reason, detail}`, `POST /orders/:id/review` |
| Chat | `POST /orders/:id/messages {body, attachments}`, `POST /orders/:id/read`, `POST /orders/:id/ephemeral`, `POST /blocks`, `POST /orders/:id/payment-requests`, `POST /orders/:id/messages/:messageId/open`, `PATCH /orders/:id/seller-meta {tags, pinned}` |
| Support | `POST /tickets`, `POST /tickets/:id/messages`, `POST /tickets/:id/resolve` |
| LightPay | `POST /lightpay/connect`, `POST /lightpay/callback`, `GET /lightpay/balance` |
| Admin | `GET /admin/overview`, `GET /admin/sellers[/:id]`, `GET /admin/kyc/:submissionId/:kind`, `POST /admin/sellers/:id/{kyc,suspend,unsuspend}`, `PATCH /admin/sellers/:id`, `POST /admin/listings/:id/unpublish`, `GET /admin/users`, `POST /admin/users/:id/{block,unblock}`, `GET /admin/audit` |

> Pour le corps exact de chaque appel, **ouvrir le `features/*/api.ts` web correspondant** et la route serveur : c'est le contrat.

---

## 8. Phases

Chaque phase se termine par : `flutter analyze` sans erreur ni avertissement, `flutter test` vert, `flutter build apk --debug` réussi. L'utilisateur teste lui-même sur téléphone.

### Phase 1 — Socle et design system
- Créer `mobile/`, paquets, polices, images, `env.dart`.
- `colors.dart`, `typography.dart`, `tokens.dart`, `motion.dart`, `theme.dart` (deux `ThemeData` Material 3 bâtis **depuis les tokens**, barres système assorties, edge-to-edge géré avec `SafeArea`).
- Tous les composants de la section 3.5 + `SImage`.
- Écran caché `/_design` (debug uniquement) qui affiche chaque composant dans les deux thèmes.
- Icône d'app et splash (fond `canvas` nuit `#0B0B0C` — seule couleur codée en dur autorisée, dans la config du splash, pas dans un widget — et `salacope-mark.png`).
- **Fini quand** : la galerie `/_design` reproduit fidèlement le web dans les deux thèmes ; bascule de thème mémorisée.

### Phase 2 — Données, domaine, API
- Modèles `freezed`, `build_runner`.
- Portage complet du domaine (section 4.1) **avec tests unitaires** reprenant les cas limites du TS (prix décimal refusé, coordonnées détectées malgré les espaces, permissions par statut et par partie, `formatXaf(12500) == '12 500 FCFA'`…).
- `api_client`, `store` (+ tests de `apply` : upsert, suppression, tri), `sync`, `auth`, `guest`, cache disque.
- **Fini quand** : au lancement, le catalogue réel est chargé (log du nombre d'offres), le cache permet un démarrage hors ligne.

### Phase 3 — Coquille, navigation, vitrine
- `router.dart`, `shell.dart`, gardes, `deep_links.dart` (sans App Links encore).
- Accueil complet, Recherche (texte, catégorie, prix min/max, tri), Fiche offre, Boutique publique, favoris et suivre (optimistes puis confirmés).
- **Fini quand** : on parcourt tout le catalogue, catégories épinglées, grille seule hors « Tout », animations coupées avec « Supprimer les animations ».

### Phase 4 — Connexion et compte
- Connexion, inscription (nom, téléphone `+242`), mot de passe oublié, déconnexion.
- Paramètres (profil, thème), Compte, notifications (cloche, liste, lecture, navigation par `href`).
- **Fini quand** : connexion avec un vrai compte, `needsAccount` géré, session conservée après redémarrage.

### Phase 5 — Achats acheteur
- Mes achats (filtres `ORDER_STATUS_FILTERS` + périodes), commande numérique et service côté acheteur, toutes les actions acheteur, signalement, avis, reçu PDF, téléchargement des livraisons, favoris, abonnements (nouveautés + `seen`).
- **Fini quand** : chaque statut de `OrderStatus` s'affiche avec le bon libellé et la bonne prochaine action pour l'acheteur.

### Phase 6 — Paiement
- Checkout (brief, facture, opérateur), Custom Tab, App Links, `PaymentReturnScreen`, filet au retour au premier plan, achat invité.
- `public/.well-known/assetlinks.json` (seule modification web).
- **Fini quand** : un paiement réel aboutit et ouvre la commande ; un abandon affiche le code `TX-…` ; un invité retrouve son achat.

### Phase 7 — Messagerie
- Liste des conversations, chat temps quasi réel (4 s), pièces jointes et images, coches, éphémère, blocage, cartes de demande de paiement, fiche de l'autre partie.
- **Fini quand** : deux comptes échangent sans recharger ; une coordonnée tapée est refusée immédiatement avec `CONTACT_BLOCKED`.

### Phase 8 — Espace vendeur [TERMINÉ]
- Ouvrir ma boutique (nom, accroche, ville, logo carré ≤ 80 Ko), Vérification KYC, Connexion LightPay (App Link callback).
- Tableau de bord, Ventes (files `SELLER_LANES`, étiquettes, épingle), commande côté vendeur (accepter, livrer avec fichiers, délai, annuler), Offres (liste, statut, suppression), Éditeur d'offre complet, Clients, Paiements.
- **Statut** : 100% implémenté et validé (`flutter analyze` 0 issue).

### Phase 9 — Support et finitions [TERMINÉ]
- Support (liste, nouveau ticket lié à un code de paiement ou n° de commande, fil, résolution).
- Bandeau hors-ligne discret (`SOfflineBanner`), états vides, squelettes de chargement, configuration de release et Proguard.
- **Statut** : 100% implémenté et validé, compilé et exécuté avec succès sur Motorola moto g24 (`ZT322THT4D`).

### Phase 10 — Administration (optionnelle, si l'utilisateur la demande)
- Section « Administration » dans Compte pour `user.admin` : aperçu, vendeurs (détail + KYC, `SellerDetail.tsx`, `ReasonDialog.tsx`), comptes (bloquer/débloquer), journal.

---

## 9. Pièges connus

1. **Images en data URL lourdes** : le bootstrap contient toutes les couvertures en base64. Ne jamais décoder dans `build()` ; cache LRU + isolate (section 3.7). Garder le cache disque du bootstrap.
2. **Enums inconnus** : toujours une valeur de repli, sinon un nouveau statut serveur fait planter l'app.
3. **Fuseau et formats** : afficher en heure locale, formats `fr_FR`. Les tris se font sur les chaînes ISO comme le web.
4. **Retour arrière Android** : `PopScope` sur les formulaires modifiés (confirmer l'abandon), et le bouton retour ferme d'abord la bottom sheet ouverte.
5. **Clavier** : `resizeToAvoidBottomInset` + barre de saisie du chat collée au clavier.
6. **Montants** : entiers FCFA uniquement (`int`), jamais de `double` pour un prix.
7. **Pas de logique serveur dans l'app** : l'app vérifie pour le confort (`permissionsFor`, `validateListing`, `containsContact`) mais affiche toujours l'erreur du serveur si elle arrive.
8. **401 pendant une session** : déconnexion propre + `boot()` en visiteur, jamais d'écran bloqué.
9. **Compte bloqué (403)** : afficher le message serveur (« Votre compte est bloqué… ») sur un écran dédié.

---

## 10. Vérification

- Après chaque phase : `flutter analyze`, `flutter test`, `flutter build apk --debug` dans `mobile/`.
- Tests unitaires obligatoires : tout `core/domain`, `core/lib/format.dart`, `features/*/model.dart`, `store.apply`.
- Tests de widgets : `SButton` (état chargement), `ListingCard` (format de couverture par catégorie), `OrderStatusBadge` (libellé selon la partie), `CategoryTabs` (épinglage).
- Facultatif, si un émulateur est disponible : `android emulator start`, `android run`, puis `android layout --pretty` pour inspecter l'arbre d'interface plutôt que des captures.
- Le web ne doit pas être cassé : depuis la racine, `npx tsc --noEmit -p . --noUnusedLocals` et `npm run build` (le dossier `mobile/` ne doit pas être inclus par `tsconfig.json` ; l'exclure si besoin).

---

## Questions ouvertes pour l'utilisateur

1. **Identifiant d'application** : `online.salacope.app` convient-il ? (il ne pourra plus changer après publication sur le Play Store)
2. **Logo** : `salacope-mark.png` fait 17 Ko ; pour l'icône Android il faut idéalement un PNG 1024×1024 (ou SVG). En avez-vous un ?
3. **Administration** : à inclure dans l'app Android (phase 10) ou on la laisse au web ?
4. **Notifications push** : hors v1 car le serveur n'envoie rien. Voulez-vous les prévoir ensuite (ajout de FCM côté serveur) ?
