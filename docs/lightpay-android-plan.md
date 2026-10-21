# LightPay Android — plan d'implémentation (Flutter)

> **À l'agent qui implémente (Gemini)** : lis ce document en entier avant d'écrire une ligne.
> Suis les phases **dans l'ordre**. Chaque phase a des critères de fin : ne passe pas à la suivante tant qu'ils ne sont pas tous remplis.
> **La source de vérité est le code existant** (liste en section 1). Ouvre le fichier cité et reproduis-le : ne devine pas, ne « améliore » pas.
> **Tu n'es pas créatif ici, sauf pour ce que la section 3 (registre créatif) liste. Tout le reste est une copie ou une décision déjà prise.**

---

## 0. Ce qu'on construit (et ce qu'on ne construit pas)

| | Décision |
|---|---|
| **App** | « LightPay », application Android native en **Flutter** (Dart). Projet **séparé** : `C:\Light\LightPayApp\`. |
| **Ce qu'elle reproduit** | L'**interface simple du compte LightPay** (la page web `/account`) : accueil, dépôt, envoi, retrait, activité, détail d'une opération, apps connectées, compte, @nom d'utilisateur, suppression du compte. **Toutes** ces fonctions, rien d'autre. |
| **Ce qu'elle ignore** | Tout ce qui est **développeur ou admin** : console (`/account/console`), espace développeur, clés API, webhooks, « Mode avancé » (`#/developer`, `/v1/me/developer*`, `/v1/me/developer-access`), administration (`admin-page.ts`, `/v1/admin*`, `/v1/admin-console/*`), SDK `lightpay.js`, page de paiement `/pay/:id`, API marchand (`/v1/merchant`, `/v1/wallets`, `/v1/payments`, `/v1/holds`, faucet). Le champ `developer` de `GET /v1/me` est lu et **ignoré**. |
| **Backend** | **Aucun nouveau backend, aucune modification de `C:\Light\LightWallet`.** L'app appelle l'API existante `/v1/me/*`. Une seule exception possible (C-05), faite par Claude, jamais par toi. |
| **Public visé** | Toute personne qui a un wallet LightPay, et d'abord **celles qui encaissent** : créateurs, vendeurs, prestataires qui reçoivent de l'argent des **apps connectées** (LightPay Connect). L'app doit leur rendre la vie plus simple (section 3). |
| **LightPay ≠ une app connectée** | LightPay est une plateforme **générique** : elle ne connaît aucune app en particulier. Une app connectée (quelle qu'elle soit) n'apparaît que par le **nom que le serveur renvoie** (`app_name`, `counterparty`). **Aucune mention, aucun texte, aucun logo, aucune logique d'une app précise dans l'app LightPay.** Voir règle 16. |
| **Hors périmètre v1** | iOS, notifications push (le serveur n'a pas de FCM), pages légales natives (on ouvre le web), paiement d'une commande par wallet (`/pay/:id`). |

> [!IMPORTANT]
> **Interdit** : modifier `C:\Light\LightWallet` ou `C:\Light\salacope_online`. Ces dossiers sont en **lecture seule** pour toi. Ne jamais commiter, pousser ni ouvrir de PR sans demande explicite de l'utilisateur.

---

## 1. Sources de vérité (à ouvrir, pas à deviner)

**Interface et textes** (`C:\Light\LightWallet\src\pages\hosted\`) :

| Fichier | Contient |
|---|---|
| `account.ts` | tous les écrans : accueil, activité, détail, apps, compte, @nom, suppression ; tables `STATUS`, `KIND_ICON`, `actTitle`, `END_LABEL` ; barre compacte au défilement |
| `flows.ts` | dépôt, envoi, retrait et leurs écrans de résultat ; feuille de confirmation ; suivi du dépôt et du retrait |
| `client.ts` | appels API (`LP.api`), jeton, connexion Google, réauthentification, flux temps réel (`LP.live`), `money`, `walletAmount`, `amountRows`, `confirmSheet`, navigation |
| `design.ts` | **toute la feuille de style** : tailles, rayons, espacements, animations (à traduire en Flutter) |
| `connect.ts` | écran de consentement d'une app (utilisé par C-05) |
| `icons.ts` | jeu d'icônes (même jeu en Flutter : `lucide_icons_flutter`) |

**API** (`C:\Light\LightWallet\src\`) : `routes\me.ts` (toutes les routes `/v1/me/*`), `routes\checkout-public.ts` (dépôt : `mobile-money` + suivi de session ; `authorize` pour C-05), `db\account.ts` (règles dépôt / envoi / retrait), `db\activity.ts` (états et messages de refus), `db\identity.ts` (règles du @nom), `payments\fees.ts` (frais), `payments\mobile-money.ts` (numéros 04/05/06).

**Règles du projet** : `C:\Light\LightWallet\CLAUDE.md` et `C:\Light\AGENT.md` (à respecter à la lettre, résumées en section 2).

**Base visuelle déjà codée en Flutter** : `C:\Light\salacope_online\mobile\` (projet Android existant, source de **design commun** uniquement). **Réutiliser avant d'écrire** : on **copie** ses fichiers `lib/core/design/*`, `lib/core/ui/*` (voir 5.2) en retirant toute trace de ce projet (règle 16), on ne les réécrit pas.

---

## 2. Règles non négociables

Reprises de `CLAUDE.md` / `AGENT.md` de LightWallet, adaptées au mobile.

1. **Aucune requête réseau vers le vrai serveur d'initiative.** Tu n'appelles jamais l'API réelle toi-même (ni GET de test). Le code appelle l'API ; **l'utilisateur** lance l'app sur son téléphone et teste. Tes tests automatiques n'utilisent qu'un faux adaptateur HTTP **dans `test/`**.
2. **Zéro mockup dans `lib/`** : aucune donnée fictive, aucun solde, aucune opération, aucun compte de démonstration dans le code de l'app. Tout vient de l'API.
3. **Argent : un seul code.** Dépôt, Envoi, Retrait suivent le même schéma : **formulaire → feuille de confirmation (bottom sheet) → écran d'attente → écran de résultat**. Le formulaire n'affiche **aucune erreur** : le bouton reste grisé tant que ce n'est pas complet ; un refus s'affiche **uniquement** sur l'écran de résultat. Le bouton de la feuille se verrouille au premier appui (anti double appui). Chaque opération a sa **clé d'idempotence**.
4. **Le numéro choisit l'opérateur** : 06 = MTN MoMo, 05 ou 04 = Airtel Money. Le serveur refuse un mélange ; l'app l'empêche avant.
5. **Montants** : entiers FCFA uniquement (`int`), jamais de `double`. Saisie : chiffres et espaces seulement ; autre chose → « Montant en FCFA entiers, sans virgule ni point (ex. 1000). » (texte du web).
6. **Montants affichés honnêtement** : une sortie affiche ce qui a quitté le wallet, frais compris ; une entrée affiche ce qui est arrivé (voir `walletAmount`, `amountRows` dans `client.ts`).
7. **Les fournisseurs (SasPay, pawaPay) ne se montrent jamais** : aucun écran ni texte ne les nomme. Pour la personne, c'est « mobile money ».
8. **Minimalisme façon Stripe / Linear** : peu d'éléments, textes courts, ni dégradé, ni emoji, ni bordure colorée sur le côté. Hiérarchie par la taille et la graisse. **Un écran = une seule chose** ; un élément d'une liste s'ouvre dans **son propre écran** (flèche retour).
9. **Couleurs uniquement via les tokens** (`AppColors`, jeu de tokens de référence copié, voir 5.2). **Aucun `Color(0x…)` dans un widget.** Exception : le bouton Google (couleurs imposées par Google) et les logos MTN / Airtel (PNG).
10. **Thème nuit par défaut**, clair disponible, choix mémorisé.
11. **Textes en français, recopiés du web mot pour mot** (apostrophes typographiques « ’ » comprises). Ne reformule ni libellé, ni statut, ni message d'erreur.
12. **Shimmer partout où l'on attend** la **toute première** réponse ; **jamais** de shimmer quand on revient sur un écran déjà vu (voir D-06). Un détail rouvert pour un autre élément montre le shimmer, jamais les données de l'autre.
13. **Animations douces**, toutes coupées si `MediaQuery.disableAnimationsOf(context)` est vrai.
14. **Un widget = une responsabilité.** Pas d'écran de 800 lignes : les écrans composent, la logique vit dans des fichiers `model.dart` / `api.dart` testés.
15. **Jamais de jeton, d'e-mail ou de numéro dans les journaux** (`print`, `debugPrint`, crash).
16. **LightPay ne connaît pas Salacope (ni aucune autre app).** Aucune chaîne « Salacope », aucun logo, aucun lien, aucun cas particulier par `app_id` dans le code, les textes, les exemples, les tests ou les ressources. Les apps connectées s'affichent par le nom renvoyé par le serveur, avec leurs initiales en avatar. Le code copié du projet Salacope Android (5.2) est du **design commun** : on en retire toute trace de Salacope (noms de classes, images, textes) en le copiant.

---

## 3. Protocole de traçabilité et registre créatif

C'est la partie la plus importante de ce plan. Tu suis très bien les règles : donc **la créativité est cadrée par écrit**, jamais laissée à ton initiative.

### 3.1 Les trois sortes de choses dans le code

| Étiquette | Sens | Qui décide |
|---|---|---|
| `[COPIE web:<fichier>:<ligne>]` | Reproduction fidèle d'un comportement, d'un texte ou d'un style du web. | Le web (déjà décidé). |
| `[DÉCISION D-nn]` | Choix technique fixé dans ce plan (section 4). | Ce plan. |
| `[CRÉATIF C-nn]` | Idée nouvelle, absente du web, **listée au registre 3.3**, avec sa spécification exacte. | Le fondateur (validé). |

**Tout le reste est interdit.** Pas d'écran, de bouton, de texte, d'animation, d'icône, de couleur ou de raccourci qui n'est ni copié du web, ni décidé en D-nn, ni listé en C-nn.

### 3.2 Comment tracer

1. **Chaque fichier Dart** commence par un commentaire d'une ligne : `// TRACE: [COPIE web:account.ts:252-287] ...` ou `// TRACE: [CRÉATIF C-02] ...`. Plusieurs étiquettes possibles.
2. **`TRACE.md`** à la racine du projet : la matrice de la section 7, que tu remplis au fil des phases (fichier Dart, statut, test).
3. **`DECISIONS.md`** : toute **déviation** (même minime) y est consignée avec la date, la raison, et l'étiquette du plan concernée. Une déviation non consignée est une erreur.
4. **`QUESTIONS.md`** : si une spécification manque ou est ambiguë, **n'invente pas**. Écris la question, prends l'option **la plus simple conforme aux règles** et marque le code `// DEFAULT-Q<n>`. L'utilisateur tranchera.
5. Un point créatif **jamais ajouté** sans passer par `QUESTIONS.md` : si tu as une bonne idée, écris-la dans `QUESTIONS.md` sous « Idées », ne l'implémente pas.

### 3.3 Registre créatif (la seule créativité autorisée)

Principe commun : **ces fonctions n'utilisent que des routes qui existent déjà** et des données réelles (jamais de chiffre inventé). Elles servent celles et ceux qui encaissent (créateurs, vendeurs…) : suivre l'argent bloqué, le retirer vite, se faire payer facilement. **Elles sont génériques** : aucune ne dépend d'une app précise (règle 16).

| ID | Nom | Phase | Priorité |
|---|---|---|---|
| C-01 | Argent bloqué : le détail | 3 | haute |
| C-02 | Tout retirer | 5 | haute |
| C-03 | Numéros récents de retrait | 5 | moyenne |
| C-04 | Recevoir : @nom, QR, partage, scan | 7 | haute |
| C-05 | Autoriser une app connectée en deux appuis (App Link) | 8 | haute |
| C-06 | Verrouillage biométrique | 7 | haute |
| C-07 | Alertes locales d'argent reçu | 9 | basse, facultative |
| C-08 | Retours tactiles | 4 | basse |
| C-09 | Solde qui se met à jour en douceur | 3 | basse |

---

**C-01 — Argent bloqué : le détail.**
*Pourquoi* : on voit « 18 000 FCFA bloqués jusqu'à la livraison » mais on ne sait pas lesquels. *Spécification* : sur l'accueil, la ligne « bloqués jusqu'à la livraison » (copiée du web, `homeLocked`) devient **cliquable** ; elle ouvre l'écran `/locked` (titre « Argent bloqué », flèche retour). Données : `GET /v1/me/activity?limit=200`, filtrées côté app sur `status == 'LOCKED'`. Chaque ligne = `TxRow` (même composant que l'activité) : montant à gauche, `counterparty` (le nom renvoyé par le serveur, tel quel) en description, `metadata.reference` s'il existe en sous-ligne. Si `reason_code == 'DISPUTED'`, la ligne affiche `reason` (« Litige en cours : fonds gelés jusqu’à la décision. »). Pied de liste, texte exact : « Ces montants passent dans votre solde disponible quand le paiement est validé. » État vide : « Aucun montant bloqué. » *Interdit* : date de libération estimée, total par mois, tout chiffre qui n'est pas dans la réponse. *Acceptation* : le total des lignes affichées = `locked_balance` de `/v1/me` (sinon, afficher « Détail partiel » n'est **pas** permis : c'est une erreur à signaler dans `QUESTIONS.md`).

**C-02 — Tout retirer.**
*Pourquoi* : les frais rendent le calcul du montant maximum pénible. *Spécification* : sur l'écran Retirer, sous le champ montant, un lien texte « Tout retirer » (même style que `.link`). Au toucher : `a = disponible` ; `q = GET /v1/me/withdrawals/quote?amount=a&network=…` ; `over = q.total - disponible` ; si `over <= 0` → montant = `a` ; sinon `a = a - over`, on refait **une** cotation, et on garde `a`. (Les frais ne diminuent jamais quand le montant augmente : le total ne dépasse donc jamais le solde.) Si `a < minimum` ou `a <= 0` : le lien est masqué. Le montant remplit le champ, la cotation s'affiche comme d'habitude. *Acceptation* : jamais de total débité supérieur au solde ; test unitaire sur la fonction pure `maxWithdrawable`.

**C-03 — Numéros récents de retrait.**
*Pourquoi* : on retire presque toujours vers les mêmes numéros. *Spécification* : après un retrait **accepté par le serveur**, mémoriser (dans `shared_preferences`, jamais envoyé nulle part) le numéro national et l'opérateur ; garder les **3 derniers distincts**. Sur l'écran Retirer, sous le champ numéro, des pastilles « 06 512 44 81 » ; un appui remplit le numéro et l'opérateur. Dans Compte → ligne « Effacer les numéros enregistrés » (texte exact) si au moins un existe. *Interdit* : stocker autre chose, afficher le nom du titulaire.

**C-04 — Recevoir : @nom, QR, partage, scan.**
*Pourquoi* : on se fait payer en face à face ou par message. *Spécification* : dans Compte, le bloc profil (avatar, nom, @nom) est cliquable → écran `/receive` (titre « Recevoir »). Contenu : le @nom en grand (`amount-xl` réduit à 28), un **QR** (paquet `qr_flutter`) dont le contenu est exactement `lightpay://send/<nom_sans_arobase>`, puis deux boutons : « Copier mon @nom » et « Partager » (`share_plus`, texte exact : « Envoyez-moi de l’argent sur LightPay : @nom »). Si aucun @nom n'est défini : on ne peut pas arriver ici (le @nom est obligatoire). **Scan** : sur l'écran Envoyer, dans le champ destinataire, une icône caméra (`mobile_scanner`) ouvre un lecteur plein écran ; si le QR contient `lightpay://send/<nom>` ou `@nom`, le champ destinataire est rempli (la recherche du destinataire part comme si on l'avait tapé) ; sinon le lecteur reste ouvert avec le texte « Ce code n’est pas un code LightPay. » L'app déclare aussi le schéma `lightpay://` dans le manifeste : `lightpay://send/<nom>` ouvre Envoyer prérempli. *Aucune route serveur nouvelle.* *Permission* : caméra demandée au moment du scan seulement.

**C-05 — Autoriser une app connectée en deux appuis (App Link).**
*Pourquoi* : aujourd'hui, autoriser une app (LightPay Connect) passe par une page web où il faut se reconnecter à Google. *Spécification* : l'app déclare un App Link pour `https://checkout.smlab.xyz/connect` ; ouvert depuis n'importe quelle app connectée, ce lien arrive dans l'app sur l'écran `/connect` = **copie de `connect.ts`** en natif. Étapes : `GET /v1/checkout/public/authorize?app_id&scope&redirect_uri&code_challenge&environment` pour valider ; compte déjà connecté dans l'app → écran de consentement (avatar de l'app, « <App> souhaite accéder à votre compte LightPay », liste des permissions, limite par débit si `charge`, conditions + case à cocher si présentes, boutons Refuser / Autoriser) ; Autoriser → `POST /v1/me/connect/approve` → la réponse contient `redirect` → ouvrir avec `url_launcher` en `LaunchMode.externalApplication` (Android renvoie vers l'app d'origine si elle a son propre App Link, sinon vers le navigateur ; LightPay n'a rien à savoir de plus). Refuser → rouvrir `redirect_uri` avec `error=access_denied&state=…`. Seul un `redirect_uri` **validé par le serveur** est ouvert. Si l'app n'est pas connectée : écran de connexion puis consentement. *Prérequis côté serveur (fait par Claude, jamais par toi)* : servir `/.well-known/assetlinks.json` sur `checkout.smlab.xyz` avec l'empreinte SHA-256 du certificat de l'app. Sans ce fichier, le lien s'ouvre simplement dans le navigateur (comportement actuel) : **rien ne casse**. *Interdit* : toute logique, texte ou exception propre à une app précise (règle 16) ; l'écran est identique pour toutes.

**C-06 — Verrouillage biométrique.**
*Pourquoi* : c'est de l'argent réel sur un téléphone qui peut être prêté. *Spécification* : paquet `local_auth`. Compte → ligne « Verrouillage de l'app » (interrupteur). **Désactivé par défaut.** Activé : (a) à l'ouverture de l'app et au retour de l'arrière-plan après **30 secondes**, un écran de verrouillage (logo, bouton « Déverrouiller ») appelle la biométrie ou le code de l'appareil ; (b) avant l'ouverture de **chaque feuille de confirmation** d'argent (dépôt, envoi, retrait) la même vérification est demandée. Échec ou annulation : on reste sur l'écran, aucun message d'erreur sauf si l'appareil n'a aucune sécurité configurée (« Configurez un verrouillage d’écran sur votre téléphone pour utiliser cette option. »). Après le **premier dépôt réussi**, une feuille propose une seule fois « Protéger LightPay avec votre empreinte ? » (boutons « Activer » / « Plus tard »). Ne remplace pas la réauthentification Google exigée par le serveur (D-04). *Interdit* : stocker un code PIN maison.

**C-07 — Alertes locales d'argent reçu (facultative, dernière).**
*Pourquoi* : on veut savoir qu'un paiement est arrivé sans ouvrir l'app. *Limite honnête* : sans serveur de notifications (FCM), seule une vérification périodique est possible (Android la retarde si le téléphone dort). Si l'utilisateur ne valide pas cette phase, on **ne la fait pas**. *Spécification* : paquets `workmanager` + `flutter_local_notifications`. Compte → « Alertes d'argent reçu » (interrupteur, désactivé par défaut, demande la permission de notification au moment de l'activer). Toutes les 15 minutes (minimum Android) : `GET /v1/me/activity?limit=20` ; toute ligne `direction == 'IN'` et `status == 'SUCCEEDED'` dont l'`id` n'a pas encore été vu produit une notification, texte exact : « Vous avez reçu {montant} de {counterparty} » (le nom vient du serveur ; sans `counterparty` : « Vous avez reçu {montant} »). Le plus récent `id` vu est mémorisé. Un appui sur la notification ouvre `/activity/<id>`. À la première activation, on enregistre les `id` déjà présents comme « vus » (pas de rafale). Si la session a expiré, la tâche s'arrête sans notifier. *Option future (à ne pas faire)* : FCM, qui demande un changement du serveur.

**C-08 — Retours tactiles.**
Exactement deux : `HapticFeedback.mediumImpact()` quand le bouton de la feuille de confirmation est appuyé ; `HapticFeedback.lightImpact()` quand un écran de résultat passe à « réussi ». Nulle part ailleurs.

**C-09 — Solde qui se met à jour en douceur.**
Quand le solde **change après l'affichage initial** (signal temps réel, retour de dépôt), le montant glisse de l'ancienne valeur à la nouvelle en **450 ms**, courbe `easeOutCubic`, chiffres tabulaires (aucun saut de largeur). Pas d'animation au premier affichage ni au retour sur l'écran. Coupée si `disableAnimations`.

---

## 4. Décisions prises (fixes)

| ID | Décision |
|---|---|
| D-01 | **Projet** : `flutter create --org com.smlab --project-name lightpay --platforms android C:\Light\LightPayApp`. `applicationId` : `com.smlab.lightpay`. `minSdk 24`. Nom affiché « LightPay ». |
| D-02 | **Environnement** : `API_BASE_URL` (défaut `https://api.smlab.xyz`, voir Q-01) et `WEB_URL` (défaut `https://checkout.smlab.xyz`) via `--dart-define`, lus dans `core/config/env.dart`. L'en-tête `X-Environment` vaut `production` en release. Un build **debug** peut passer `--dart-define=LP_ENV=sandbox` : il affiche alors le badge « Test » en haut (comme `.badge` du web). **Aucun écran de bascule test / réel** dans l'app. |
| D-03 | **Connexion = Google seulement**, comme le web. Paquet `google_sign_in` (lire son README : l'API a changé en v7, ne pas deviner) → jeton d'identité Google → `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=<FIREBASE_API_KEY>` avec `{"postBody":"id_token=<JETON_GOOGLE>&providerId=google.com","requestUri":"http://localhost","returnIdpCredential":true,"returnSecureToken":true}` → `idToken`, `refreshToken`, `expiresIn`. **Pas** de SDK `firebase_auth`, **pas** de `google-services.json`. Clé web Firebase : `AIzaSyAyOdD8qSUfx8wvHhb5F4EJ4zKjavwnpeI` (publique par conception, `client.ts:3`), projet `lightpay-a5f01`. Jetons dans `flutter_secure_storage`. Rafraîchissement : `POST https://securetoken.googleapis.com/v1/token?key=…` (`grant_type=refresh_token`), comme `client.ts:78`, quand l'expiration est dans moins d'1 minute. Sur 400 → déconnexion. Messages d'erreur : table `ERRORS` de `client.ts:54` + `readable()` de `client.ts:486`. |
| D-04 | **Action sensible** (envoi, retrait, suppression) : le serveur répond `401` avec `error == 'RECENT_SIGN_IN_REQUIRED'` si la dernière connexion date de plus de 10 minutes. L'app ouvre alors la feuille « Confirmez votre identité » (texte du web, `client.ts:580`), refait la connexion Google, **vérifie que l'`uid` est le même** (sinon : « Utilisez le compte Google déjà connecté (<e-mail>). »), puis **rejoue l'action une fois** avec la même clé d'idempotence. `401` + `SIGN_IN_REQUIRED` → déconnexion et écran de connexion. |
| D-05 | **Client HTTP** (`dio`) : copie de `LP.api` (`client.ts:87`) — en-têtes `Authorization: Bearer`, `X-Environment`, `Idempotency-Key` (POST d'argent), délai **25 s**, message « Connexion impossible. Vérifiez votre réseau et réessayez. » et « Le serveur ne répond pas. Vérifiez votre connexion et réessayez. ». Le champ `message` des erreurs du serveur est **toujours affichable tel quel** (français). La clé d'idempotence respecte `^[A-Za-z0-9_-]{8,100}$` : `uuid` v4 (36 caractères) convient. |
| D-06 | **Persistance** (règle de design commune) : la dernière réponse de `/v1/me` et de `/v1/me/activity` est gardée sur disque. Revenir sur l'accueil, l'activité ou le compte **réaffiche tout de suite** le dernier état connu, puis vérifie auprès du serveur en arrière-plan ; le shimmer n'existe que pour une donnée **jamais vue**. Le solde mis en cache porte la légende « Données à jour à 16:51 » (composant `UpdatedAt`) tant qu'il n'est pas confirmé. **Une action d'argent ne s'appuie jamais sur un solde du cache** : à l'entrée de Envoyer et de Retirer, on relit `/v1/me` (comme le web, `loadMe()`), et le bouton reste grisé jusque-là. Le filtre de l'activité (Tout / Entrées / Sorties / En attente) est mémorisé (`shared_preferences`). Tant que le compte n'est pas chargé : placeholders neutres, rien de faux. |
| D-07 | **Temps réel** : `GET /v1/me/stream` (SSE, `Accept: text/event-stream`, `dio` en `ResponseType.stream`) tant que l'app est au premier plan. L'événement `event: change` déclenche, après 200 ms, la relecture de `/v1/me` et de l'écran affiché (`onLive`, `account.ts:566`). Reconnexion : attente 1 s doublée jusqu'à 30 s (`client.ts:169`). Le serveur coupe le flux après 10 minutes : se reconnecter aussitôt. Arrêt en arrière-plan ; relecture immédiate au retour (`AppLifecycleState.resumed`). |
| D-08 | **Police** : Poppins 400 / 500 / 600 **embarquée** (pas de téléchargement), comme le web LightPay. Chiffres tabulaires (`FontFeature.tabularFigures()`) sur tous les montants. Voir Q-02. |
| D-09 | **Retour arrière pendant l'attente** d'un dépôt ou d'un retrait : autorisé, il ramène à l'accueil ; l'opération continue côté serveur, son état apparaît dans l'activité (« En cours ») grâce au temps réel. Le suivi (D-10) s'arrête avec l'écran. |
| D-10 | **Suivi des opérations** : dépôt → `GET /v1/checkout/public/sessions/:id` (sans authentification) toutes les **2 s**, **240 essais** max ; retrait en cours → `GET /v1/me/withdrawals` toutes les **3 s**, **60 essais** max (`flows.ts:162` et `:386`). |
| D-11 | **Navigation** (`go_router`) : routes en section 6. Barre du bas à **3 onglets** (Accueil, Activité, Compte), icônes seules avec libellé d'accessibilité (`Semantics`), visible uniquement sur ces trois écrans racines, masquée dans un flux d'argent (comme le web). Transitions : avancer = glisse depuis la droite 32 px / 300 ms ; reculer = depuis la gauche ; onglets = fondu 220 ms ; courbe `Cubic(.2, .7, .2, 1)`. |
| D-12 | **@nom obligatoire** : si `GET /v1/me` renvoie `username == null`, l'app ouvre l'écran « Choisissez votre nom d’utilisateur » et **bloque tout le reste** tant qu'il n'est pas choisi (`account.ts:540`). |
| D-13 | **Compte fermé** (`wallet.status != 'ACTIVE'`) : bandeau « Ce compte LightPay est fermé : il ne peut plus recevoir ni envoyer d’argent. » et boutons d'action masqués (`account.ts:263`). |
| D-14 | **Tests** : un test unitaire par fonction pure (section 8). Doubles de test uniquement dans `test/`. `flutter analyze` sans aucun avertissement. |
| D-15 | **Sécurité du paquet** : `android:allowBackup="false"`, R8 activé en release, trafic en clair interdit, pas de capture d'écran bloquée (`FLAG_SECURE` non utilisé). |
| D-16 | **Suppression du compte** : écran de `account.ts:177` (taper SUPPRIMER) → `DELETE /v1/me` (réauthentification possible) puis `accounts:delete` de Firebase (`client.ts:207`) → écran « Compte supprimé ». Google Play l'exige dans l'app. |

---

## 5. Stack technique et design

### 5.1 Paquets

Ajouter avec `flutter pub add <nom>` (dernières versions stables, **ne pas inventer de numéros**). Reprendre le mode de travail de `C:\Light\salacope_online\mobile\pubspec.yaml`.

| Besoin | Paquet |
|---|---|
| État / navigation / HTTP | `flutter_riverpod`, `go_router`, `dio` |
| Stockage | `flutter_secure_storage` (jetons), `shared_preferences` (filtre, numéros récents), `path_provider` + fichier JSON (cache D-06) |
| Formats FR / identifiants | `intl`, `uuid` |
| Icônes | `lucide_icons_flutter` |
| Connexion | `google_sign_in` |
| Liens | `app_links`, `url_launcher`, `flutter_custom_tabs` (pages légales) |
| Partage | `share_plus` |
| C-04 | `qr_flutter`, `mobile_scanner` |
| C-06 | `local_auth` |
| C-07 (facultatif) | `workmanager`, `flutter_local_notifications` |
| Splash / icône | `flutter_native_splash`, `flutter_launcher_icons` (dev) |
| Tests | `flutter_test`, `mocktail` |

### 5.2 Design commun à copier (ne pas réécrire), sans trace de Salacope

LightPay et le projet Salacope Android partagent le même jeu de tokens de référence (`CLAUDE.md` de LightWallet : « Couleurs : celles de Salacope… sont la référence »). C'est un **design commun**, pas un lien entre les produits. Depuis `C:\Light\salacope_online\mobile\` vers `C:\Light\LightPayApp\` : `lib/core/design/` (colors, typography, tokens, motion, theme, theme_provider), `lib/core/ui/` (`s_button`, `s_badge`, `s_panel`, `s_page`, `s_list`, `s_segmented`, `s_field`, `s_empty_state`, `s_toast`, `s_sheet`, `s_dialog`, `s_avatar`, `s_shimmer`, `s_stat`, `updated_at`, `operator_logo`, `s_offline_banner`), `lib/core/lib/format.dart`, `assets/images/{lightpay-mark,mtn-momo,airtel-money}.png`. **Ne PAS copier** `salacope-mark.png`, `app_icon*.png`, ni aucune icône ou image Salacope : l'icône et le splash de l'app viennent de `lightpay-mark.png`. Renommer `SalacopeColors` en `AppColors` **sans changer une seule valeur**, puis vérifier par `grep -ri salacope` dans le projet : **zéro résultat** attendu (hors la phrase de cette section dans `DECISIONS.md`). Les valeurs de couleur sont celles de `C:\Light\salacope_online\src\styles\tokens.css` (identiques à `design.ts`). Remplacer la police par Poppins (D-08).

### 5.3 Traduction de `design.ts` en Flutter

`design.ts` fait foi. Valeurs clés à respecter (ne rien arrondir) :

| Élément | Web | Flutter |
|---|---|---|
| Fond / carte / surélevé | `--bg #0b0b0c`, `--card #131314`, `--raised #1c1c1e` (nuit) | `canvas`, `surface`, `gray100` |
| Accent | `#34d399` nuit, `#047857` jour | `accent` ; texte sur accent `onAccent` |
| Marge latérale d'écran | 24 px | 24 |
| Barre du haut | min 60, titre 11 px, graisse 600, espacement +0,16 em, MAJUSCULES, centré | `TopBar` |
| Solde d'accueil | 52 px / 600 / -0,02 em, « FCFA » à 0,42 em en `muted` | `AmountText` |
| Boutons d'action d'accueil | grille de 3, hauteur 50, rayon 16, 14 px | `HomeAction` |
| Ligne d'opération (`.tx`) | colonnes 22 / flex / auto, gap 16, padding vertical 10 ; montant 15 px 600 ; description 11 px `muted` ; fin 10 px MAJUSCULES | `TxRow` |
| Champ | hauteur 52, rayon 10, bordure `line-strong`, focus = bordure accent + halo 3 px `accent-soft` | `SField` |
| Montant saisi | 38 px / 600 centré dans un bloc `raised` rayon 16 | `AmountInput` |
| Choix d'opérateur | 2 pastilles rayon 999, hauteur 46, logo 22 px, active = bordure accent + fond `accent-soft` | `OperatorChoice` |
| Bouton principal | hauteur 52, rayon 14, 12 px / 600 / +0,14 em / MAJUSCULES | `SButton` |
| Feuille (bottom sheet) | rayon 24 haut, poignée 40×4, padding 30/24, monte en 280 ms | `ConfirmSheet` |
| Écran d'état | icône 64 px ronde (ok = accent, err = `danger-soft`, wait = `warn-soft`), titre 20 px 600 | `ResultState` |
| Shimmer | dégradé 100°, 1,2 s linéaire en boucle | `SShimmer` |

Les écrans copient aussi : barre compacte de l'accueil qui apparaît quand le gros solde et ses 3 boutons sortent par le haut (balance à gauche, Dépôt / Retrait à droite, « Envoyer à un @pseudo » dessous, glisse en 260 ms, `account.ts:296-311`), titres de jour **collants** dans l'activité, titre « Activité » **collant** sous la barre compacte.

### 5.4 Icônes

Le jeu de `icons.ts` (lucide). Correspondance déjà dans `KIND_ICON` et `SCOPE_ICON` (`account.ts`). Ne pas en ajouter d'autres sans C-nn.

---

## 6. Architecture, écrans et routes

```
lib/
├── main.dart
├── app/            router.dart, shell.dart (barre du bas), deep_links.dart
├── core/
│   ├── config/     env.dart
│   ├── design/     (copié)
│   ├── ui/         (copié) + amount_input, tx_row, confirm_sheet, result_state, operator_choice, fees_block
│   ├── api/        api_client.dart, auth.dart (Google + Firebase REST), live.dart (SSE), domain_error.dart
│   ├── store/      wallet_cache.dart (disque), providers.dart
│   └── lib/        format.dart (money, phone, day labels), network.dart (04/05/06), idempotency.dart
└── features/
    ├── session/    sign_in, username, reauth_sheet
    ├── home/       home_screen, compact_bar
    ├── activity/   activity_screen, activity_item_screen, activity_model.dart
    ├── deposit/    form, done, deposit_api.dart, deposit_follow.dart
    ├── send/       form, done, send_api.dart, recipient_lookup.dart
    ├── withdraw/   form, done, withdraw_api.dart, withdraw_follow.dart, max_withdrawable.dart (C-02)
    ├── account/    account_screen, delete_screen, bye_screen
    ├── apps/       apps_screen, app_screen
    └── creators/   locked_screen (C-01), receive_screen + scanner (C-04), connect_screen (C-05), app_lock (C-06), alerts (C-07)
```

Chaque feature : `*_api.dart` (appels, = ce que fait le script du web), `model.dart` (règles pures testées), `screens/`, `widgets/`. Entre features : on importe un fichier d'export `<feature>.dart` seulement.

### Table des routes

| Route | Écran | Source web | Barre du bas |
|---|---|---|---|
| `/connexion` | Connexion Google | `client.ts:529` (`mountAuth`) | non |
| `/home` | Accueil | `account.ts:27-55` | oui |
| `/deposit`, `/deposit/done` | Dépôt, résultat | `flows.ts:23-37` | non |
| `/send`, `/send/done` | Envoyer, résultat | `flows.ts:38-46` | non |
| `/withdraw`, `/withdraw/done` | Retirer, résultat | `flows.ts:47-62` | non |
| `/activity` | Activité (filtres + jours) | `account.ts:59-68` | oui |
| `/activity/:id` | Détail d'une opération | `account.ts:70-89` | non |
| `/locked` | Argent bloqué (C-01) | — créatif | non |
| `/account` | Compte | `account.ts:119-146` | oui |
| `/account/username` | @nom | `account.ts:148-157` | non |
| `/account/apps`, `/account/apps/:id` | Apps connectées, accès d'une app | `account.ts:91-117` | non |
| `/account/delete`, `/bye` | Suppression, au revoir | `account.ts:177-190` | non |
| `/receive` | Recevoir (C-04) | — créatif | non |
| `/connect` | Consentement d'une app (C-05) | `connect.ts` | non |

**Ignoré** (ne pas créer) : `#/developer`, `#/security`, console, admin.

Gardes : pas de jeton → `/connexion` ; pas de @nom → `/account/username` (D-12). L'écran d'accueil lit `me` et l'activité (10 lignes max, « Voir toute l’activité » si plus), comme `enterHome`.

### Les tables à porter à l'identique (`activity_model.dart`)

Un fichier, une fonction par entrée, test unitaire pour chacune. Sources : `account.ts:219-250`, `client.ts:316-326`.

- `actTitle(a)` : `DEPOSIT` → « Dépôt » (+ « · <counterparty> ») ; `TRANSFER` → entrée « Reçu de <x> » / sortie « Envoi à <x ou —> » ; `WITHDRAWAL` → « Retrait » (+ « · x ») ; `PAYMENT` → « Paiement · x » ; `CHARGE` → « Débit par x » ; `SALE` → « Vente · x » ; `COMMISSION` → « Commission automatique · x » ; `REFUND` → entrée « Remboursement · x » / sortie « Remboursement envoyé ».
- `STATUS` : `PENDING` « En cours » (warn), `SUCCEEDED` « Réussi » (ok), `FAILED` « Refusé » (err), `LOCKED` « Bloqué » (warn), `REFUNDED` « Remboursé », `EXPIRED` « Expiré », `CANCELLED` « Annulé ».
- `settledOk(a)` = statut `SUCCEEDED`, `LOCKED` ou `PENDING`. `walletAmount(a)` = `total` si sortie et `total > amount`, sinon `amount`. `amountRows(a)` = lignes « Montant / Frais / Débité du wallet » selon sens et type (`client.ts:317`).
- Détail d'une opération : lignes « Commission… », « De / À / Via », « Via », « Référence », « Message », « Date », « Mise à jour » (si différente et pas réussie), « N° d’opération » (`account.ts:370-381`).
- Argent : `money(v, 'XAF')` = nombre groupé fr_FR avec **espace insécable U+00A0** (remplacer l'espace fine U+202F) + « FCFA » (`client.ts:205`).
- Téléphone : `fmtPhone` = `06 512 44 81` ; saisie nationale `^0[4-6]\d{7}$` ; un préfixe `242` saisi est retiré ; `networkOf` = 06 → `MTN_MOMO_COG`, 04 / 05 → `AIRTEL_COG` (`client.ts:252`).

### Flux d'argent : points à ne pas rater

**Dépôt** (`flows.ts:65-180`) : montant, opérateur, numéro qui paie → frais en direct (`GET /v1/me/deposits/quote?amount=` après 300 ms d'arrêt de frappe, une cotation par opérateur) → le bouton affiche « Déposer <total> » (préfixe « ≈ » si `estimated`) → feuille « Vous déposez » → `POST /v1/me/deposits {amount}` + `Idempotency-Key` → `{session_id}` → `POST /v1/checkout/public/sessions/<session_id>/mobile-money {msisdn, network}` (sans authentification, `msisdn` en national) → suivi (D-10). Au `COMPLETED` : « Dépôt reçu » / « <montant> ajoutés à votre wallet LightPay. ». Échecs : table `DEP_FAIL` + repli « L’opérateur n’a pas confirmé le paiement. Aucun argent n’a été pris. ».

**Envoi** (`flows.ts:201-266`) : champ destinataire (`@pseudo` ou e-mail) avec recherche 350 ms (`GET /v1/me/recipient?to=`), ligne « → Nom · @pseudo » ou « Aucun compte LightPay trouvé. » ; montant ≤ disponible ; message ≤ 140 ; bouton « Continuer » grisé jusqu'à complet ; feuille « Vous envoyez » (À / Frais « Aucun » / Message / Solde après envoi) ; `POST /v1/me/transfers {to, amount, note}` (**réauthentification possible**, D-04) ; résultat « Argent envoyé » / « <montant> envoyés à <nom>. ».

**Retrait** (`flows.ts:268-399`) : opérateur, numéro, montant → cotation (`GET /v1/me/withdrawals/quote?amount=&network=`) → lignes « Vous recevez / Frais opérateur / Frais LightPay / Total débité de votre wallet » ; sous le minimum ou au-dessus du solde : la ligne sous le montant passe en couleur d'attention (`below`), bouton grisé, **pas de message** ; feuille « Vous retirez » ; `POST /v1/me/withdrawals {amount, msisdn, network}` (réauthentification possible) ; résultats : `SUCCEEDED` « Retrait envoyé » / `FAILED` « Retrait échoué » + restitution / `PENDING` « Retrait en cours » + suivi ; liste « Derniers retraits » (5) sous le formulaire.

---

## 7. Matrice de traçabilité (à copier dans `TRACE.md`)

| Écran / pièce | Étiquette | Source | Fichier Dart | Test | Statut |
|---|---|---|---|---|---|
| Connexion Google | COPIE | `client.ts:529`, D-03 | | | à faire |
| Réauthentification | COPIE | `client.ts:580`, D-04 | | | à faire |
| Accueil + barre compacte | COPIE | `account.ts:27-55,296-311` | | | à faire |
| Solde animé | C-09 | — | | | à faire |
| Argent bloqué | C-01 | — | | | à faire |
| Dépôt (3 écrans) | COPIE | `flows.ts:23-37,65-180` | | | à faire |
| Envoyer (2 écrans) | COPIE | `flows.ts:38-46,201-266` | | | à faire |
| Retirer (2 écrans) | COPIE | `flows.ts:47-62,268-399` | | | à faire |
| Tout retirer | C-02 | — | | | à faire |
| Numéros récents | C-03 | — | | | à faire |
| Activité + détail | COPIE | `account.ts:59-89,314-387` | | | à faire |
| Compte | COPIE | `account.ts:119-146` | | | à faire |
| @nom | COPIE | `account.ts:148-157,467-483` | | | à faire |
| Apps connectées | COPIE | `account.ts:91-117,389-454` | | | à faire |
| Suppression + au revoir | COPIE | `account.ts:177-190,521-530` | | | à faire |
| Recevoir, QR, scan | C-04 | — | | | à faire |
| Verrouillage | C-06 | — | | | à faire |
| Connect natif | C-05 | `connect.ts` | | | à faire |
| Alertes locales | C-07 | — | | | facultatif |
| Retours tactiles | C-08 | — | | | à faire |

---

## 8. Phases

Chaque phase se termine par : `flutter analyze` sans erreur ni avertissement, `flutter test` vert, `flutter build apk --debug` réussi, `TRACE.md` à jour. L'utilisateur teste sur téléphone. Les tests unitaires reprennent les cas limites du TS (ci-dessous).

### Phase 1 — Socle et design
- Projet (D-01), paquets, polices Poppins, images, `env.dart`, copie du design (5.2), `AppColors` = valeurs identiques.
- Nouveaux composants de base : `AmountInput`, `TxRow`, `ConfirmSheet`, `ResultState`, `OperatorChoice`, `FeesBlock`, `TopBar`.
- Écran caché `/_design` (debug seulement) montrant chaque composant dans les deux thèmes.
- **Fini quand** : la galerie reproduit `design.ts` dans les deux thèmes ; bascule de thème mémorisée ; icône et splash (fond nuit `#0B0B0C` dans la config du splash, seule couleur codée en dur autorisée).

### Phase 2 — Connexion, API, cache, temps réel
- `auth.dart` (Google → Firebase REST, jetons sécurisés, rafraîchissement), écran de connexion, feuille de réauthentification, `api_client.dart`, `domain_error.dart`, cache disque (D-06), `live.dart` (D-07), garde @nom + écran @nom (D-12).
- Tests : `money`, `fmtPhone`, `networkOf`, `normalise le préfixe 242`, `amountDigits` (« 100,50 » refusé), clé d'idempotence valide, interprétation des erreurs 401.
- **Fini quand** : connexion avec un vrai compte, session conservée au redémarrage, `GET /v1/me` affiché, flux temps réel qui se reconnecte, 401 → écran de connexion.

### Phase 3 — Accueil, activité, détail, argent bloqué
- Accueil complet (barre compacte, activité 10 lignes, bandeau compte fermé), Activité (filtres mémorisés, jours collants), détail d'une opération, `activity_model.dart` complet, C-01, C-09.
- Tests : `actTitle` (chaque type et sens), `walletAmount`, `amountRows`, filtres `all/in/out/wait`, regroupement par jour (Aujourd’hui / Hier / date longue).
- **Fini quand** : retour sur un écran = dernier état sans shimmer ; un détail rouvert pour une autre opération montre le shimmer ; total de C-01 = `locked_balance`.

### Phase 4 — Dépôt
- Les 3 écrans, cotation en direct, feuille, suivi 2 s, résultats, `DEP_FAIL`, C-08.
- **Fini quand** : un dépôt réel (compte test d'abord, voir D-02) aboutit et le solde bouge sans rechargement ; un refus s'affiche sur l'écran de résultat seulement.

### Phase 5 — Envoi et retrait
- Envoyer (recherche, feuille, résultat), Retirer (cotation, feuille, suivi 3 s, liste des derniers retraits), réauthentification rejouée une fois, C-02, C-03.
- Tests : `maxWithdrawable` (jamais de total > solde, minimum respecté), mélange opérateur / numéro refusé avant envoi, bouton grisé tant que le formulaire est incomplet.
- **Fini quand** : envoi à un @pseudo et retrait vers un numéro réels (petits montants) ; double appui ne produit qu'une opération.

### Phase 6 — Compte, apps connectées, suppression
- Compte, @nom (changement), apps connectées (liste, accès, retirer une permission, limite par débit, « Retirer l’accès » en deux appuis), suppression, au revoir, déconnexion, thème, ligne « Effacer les numéros enregistrés ».
- **Fini quand** : toutes les lignes du Compte fonctionnent, la suppression refuse un solde non vide avec le message du serveur.

### Phase 7 — Encaisser I : recevoir et verrouiller
- C-04 (écran, QR, partage, scan, schéma `lightpay://`), C-06 (verrouillage, feuille d'invitation après le premier dépôt).
- Tests : analyse du contenu du QR (`lightpay://send/nom`, `@nom`, texte quelconque refusé).
- **Fini quand** : le QR d'un téléphone, scanné par un autre, remplit Envoyer ; le verrouillage redemande l'empreinte après 30 s.

### Phase 8 — Encaisser II : autoriser une app connectée (C-05)
- Écran `/connect`, App Link `checkout.smlab.xyz/connect`, ouverture du `redirect` en application externe.
- Demander à l'utilisateur de faire servir `assetlinks.json` (Claude fait le côté serveur après son accord). Tant que ce n'est pas fait, le lien s'ouvre sur le web : c'est normal.
- **Fini quand** : un lien `https://checkout.smlab.xyz/connect?...` valide (fourni par l'utilisateur, depuis l'app connectée de son choix) ouvre l'app LightPay sur le consentement ; un appui sur Autoriser rouvre l'adresse de retour renvoyée par le serveur.

### Phase 9 — Alertes locales (C-07, facultative) et mise en production
- C-07 **seulement si l'utilisateur le confirme**.
- Release : R8, icône adaptative, signature (clé de téléversement **fournie par l'utilisateur**), `flutter build appbundle`, fiche « Sécurité des données » de Google Play (suppression du compte dans l'app + lien web), empreintes SHA-256 communiquées pour `assetlinks.json`.
- **Fini quand** : un `.aab` signé est produit ; `flutter analyze` et `flutter test` verts.

---

## 9. Pièges connus

1. **Un solde en cache n'est pas un solde** : le cache sert à afficher vite, jamais à valider une opération (D-06).
2. **Le serveur est la vérité** : l'app grise les boutons pour le confort mais affiche toujours l'erreur du serveur si elle arrive.
3. **Double appui** : verrouiller le bouton de la feuille au premier appui **et** le flux ; une opération = une clé d'idempotence, conservée pour le rejeu après réauthentification.
4. **Montants** : jamais de `double`. `BigInt` côté serveur, chaînes de chiffres dans les réponses : les lire avec `int.parse` (les valeurs tiennent dans 64 bits).
5. **Un compte Google = un wallet** (même `uid` que sur le web LightPay). L'app reproduit le comportement du web, ne contourne rien.
6. **Flux SSE** : le serveur le coupe après 10 minutes et limite à 6 flux par personne : ne jamais ouvrir deux flux, fermer à la mise en arrière-plan.
7. **Retour arrière Android** : le bouton retour ferme d'abord la feuille ouverte ; sur un flux d'argent en attente il ramène à l'accueil (D-09).
8. **Clavier** : l'écran Envoyer / Retirer prend le clavier numérique sur le montant dès l'ouverture (après la transition, 320 ms), comme `focusAmount`.
9. **Fuseau et formats** : heure locale, formats `fr_FR`.
10. **Enums inconnus** : un nouveau `kind` ou `status` ne doit jamais planter l'app (valeur de repli = texte brut).

---

## Questions ouvertes pour l'utilisateur (`QUESTIONS.md`, à reprendre tel quel)

- **Q-01** — Adresse de l'API : `https://api.smlab.xyz` est-elle bien celle des applications ? (`checkout.smlab.xyz` sert aussi `/v1/me/*`.)
- **Q-02** — Police : **Poppins** (400 / 500 / 600) embarquée en local dans `assets/fonts/`. **Validé par l'utilisateur** (parité stricte avec le web LightPay).
- **Q-03** — Identifiant d'application `com.smlab.lightpay` : **Validé par l'utilisateur** (`applicationId: com.smlab.lightpay`, `--org com.smlab`).
- **Q-04** — Connexion Google : l'utilisateur doit ajouter, dans le projet Firebase `lightpay-a5f01`, l'empreinte **SHA-1 et SHA-256** de l'app (debug puis release) et fournir l'**ID client web** Google. Sans cela, la connexion échoue. Peut-il le faire, ou on s'en occupe ensemble ?
- **Q-05** — Un test avec de l'argent de test (compte `sandbox`) est-il souhaité en build debug avant de tester en réel ? (prévu en D-02)
- **Q-06** — C-07 (alertes locales, vérification toutes les 15 minutes, non garantie) : la faire, ou attendre de vraies notifications push (changement du serveur) ?
- **Q-07** — Logo : `lightpay-mark.png` suffit-il pour l'icône Android (idéalement 1024 × 1024) ?
