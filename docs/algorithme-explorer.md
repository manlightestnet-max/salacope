# Algorithme de l'Explorer Salacope

> Version 1.0 · 13 octobre 2026 · Salacope (SMLab)
> Le moteur qui décide de l'ordre des offres dans l'Explorer, sur l'accueil et dans la recherche, sur le web et dans l'app Android.

---

## 1. En une page

L'Explorer montre chaque offre au bon visiteur, sans inventer de chiffre et sans laisser les grosses boutiques écraser les nouveaux créateurs.

- **En tête : « À la une »**, les offres choisies par l'administration, dans l'ordre qu'elle fixe.
- **Puis « Pour vous »**, un seul flux qui mélange produits numériques et services. Chaque offre y reçoit un **score** calculé à partir de **7 signaux** : ventes, visites, favoris, note de la boutique, nouveauté, goûts du visiteur et une rotation quotidienne.
- **L'administration règle le poids de chaque signal** (de 0 à 10) sans toucher au code. Le changement s'applique en une minute environ, sur le site comme dans l'app.
- **Les goûts du visiteur restent sur son appareil.** Rien de personnel n'est envoyé au serveur.
- **La recherche** comprend les accents, les pluriels et une faute de frappe. Elle propose de vrais titres et de vraies boutiques pendant la saisie.

Ce que le moteur garantit :

| Garantie | Comment |
|---|---|
| Données honnêtes | Chaque signal vient de la base (ventes, visites, favoris, avis) ou d'un geste réel du visiteur. Aucun faux « Populaire », aucune fausse note. |
| Équité | Bonus aux offres neuves, rotation quotidienne, au plus 2 offres d'affilée par boutique. |
| Vie privée | Les goûts sont gardés sur l'appareil et s'effacent avec le temps ou d'un bouton. |
| Maîtrise | Poids, durée de la nouveauté, limite par boutique et « À la une » se règlent dans l'admin. |

---

## 2. Principes

1. **Rien d'inventé.** Un signal absent vaut 0, jamais une estimation.
2. **Un nouveau créateur doit être vu.** Sans ventes ni avis, la nouveauté et la rotation le font apparaître.
3. **Personne ne monopolise l'écran.** Une boutique ne peut pas aligner plus de quelques offres de suite.
4. **Le visiteur n'est pas enfermé.** Ses goûts perdent la moitié de leur poids toutes les deux semaines, et il peut les effacer.
5. **Pas de catégories imposées.** Services et produits sont dans le même flux. C'est le visiteur qui filtre.
6. **Stable sous les yeux.** Les goûts sont lus une fois par visite : ouvrir une offre ne réorganise pas l'écran en cours.

---

## 3. « À la une »

- L'administration choisit jusqu'à **12 offres**, dans l'ordre voulu (Admin → Paramètres → Explorer → À la une).
- Elles s'affichent en tête de « Tout », avant le flux « Pour vous », sans passer par le score.
- Seules les offres **en ligne** sont acceptées. Une offre retirée, masquée ou passée en brouillon disparaît d'elle-même de la liste.
- Une offre à la une n'apparaît pas une deuxième fois dans le flux en dessous.

---

## 4. Le score

### 4.1 Les 7 signaux

| Signal | Source | Valeur entre 0 et 1 | Poids par défaut |
|---|---|---|---|
| **Ventes** | commandes payées, non annulées | `log(1 + ventes) / max` | 6 |
| **Visites** | pages vues sur 30 jours | `log(1 + visites) / max` | 3 |
| **Favoris** | personnes qui ont enregistré l'offre | `log(1 + favoris) / max` | 4 |
| **Note** | moyenne des avis de la boutique | moyenne bayésienne, voir 4.2 | 3 |
| **Nouveauté** | date de publication | `max(0, 1 − âge en jours / durée)` | 5 |
| **Goûts** | gestes du visiteur | affinité, voir section 5 | 6 |
| **Rotation** | tirage déterministe du jour | entre 0 et 1, voir 6.2 | 2 |

`max` est la plus grande valeur parmi les offres comparées : l'offre la plus vendue vaut 1, les autres en proportion.

### 4.2 Pourquoi le logarithme et la moyenne bayésienne

- **Le logarithme écrase les écarts extrêmes.** Une offre à 1 000 ventes vaut environ 1, une offre à 10 ventes environ 0,35. Sans logarithme, elle vaudrait 0,01 et serait invisible.
- **La moyenne bayésienne évite qu'un seul avis fasse la loi.** On ajoute 5 avis fictifs à 3,5★ avant de calculer la moyenne :

```
note_ajustée = (note × avis + 3,5 × 5) / (avis + 5)
signal       = (note_ajustée − 1) / 4
```

Exemples : 5★ sur 1 avis donne 3,75★ ; 4,6★ sur 40 avis donne 4,48★. La boutique bien notée par beaucoup de clients passe devant.

### 4.3 La formule

```
score = ( P_ventes    × ventes
        + P_visites   × visites
        + P_favoris   × favoris
        + P_note      × note
        + P_nouveauté × nouveauté
        + P_goûts     × goûts
        + P_rotation  × rotation ) / somme des poids
```

Le score est toujours entre 0 et 1. Mettre un poids à 0 retire complètement ce signal.

---

## 5. Les goûts du visiteur

### 5.1 Ce qui est retenu

À chaque geste, l'appareil retient trois choses de l'offre : sa **catégorie**, sa **boutique** et ses **mots** (titre et quatre premiers éléments de « Ce qui est inclus »).

| Geste | Poids |
|---|---|
| Regarder une offre (une fois par session) | 1 |
| Appuyer sur « Acheter » | 3 |
| Mettre en favori | 4 |
| Chercher des mots | 2 par mot |

En plus, le compte connaît les **boutiques suivies**. Elles comptent comme un fort intérêt pour la boutique.

Les mots sont nettoyés : en minuscules, sans accents, réduits à leur racine (« formations » devient « formation »), et les petits mots courants sont ignorés (« les », « pour », « avec », « guide »…).

### 5.2 L'affinité

```
affinité = 0,4 × catégorie + 0,3 × boutique + 0,3 × mots
```

Chaque partie est ramenée entre 0 et 1 par rapport au plus fort intérêt du visiteur. Sans aucun historique, l'affinité vaut 0 : rien n'est deviné.

### 5.3 Mémoire et oubli

- **Stockage** : sur l'appareil uniquement (navigateur ou téléphone). Rien n'est envoyé à Salacope.
- **Taille** : 80 mots, 40 boutiques et 200 offres vues au plus.
- **Oubli** : chaque intérêt perd la moitié de son poids toutes les 2 semaines, et un intérêt devenu trop faible est retiré.
- **Effacement** : bouton « Effacer mes goûts » dans la page Cookies (web) et Paramètres → Recommandations (app).

---

## 6. Corrections et équité

### 6.1 Ce qui fait reculer une offre

| Situation | Effet | Raison |
|---|---|---|
| Produit numérique déjà acheté | score × 0,2 | On ne l'achète qu'une fois. |
| Offre vue dans les 2 derniers jours | score × 0,85 | Laisser la place aux autres. |
| Offre déjà en favori | score × 0,9 | Le visiteur la connaît déjà. |

### 6.2 La rotation

Pour chaque offre, on tire un nombre entre 0 et 1 à partir de :

```
graine = date du jour + identifiant du visiteur (compte, ou appareil pour un visiteur)
tirage = hash(graine + identifiant de l'offre)
```

Le résultat est le même toute la journée pour un même visiteur, donc l'ordre ne saute pas d'un écran à l'autre. Il change le lendemain, et il diffère d'un visiteur à l'autre : le flux n'est jamais figé, et chaque offre finit par passer devant quelqu'un.

### 6.3 La nouveauté

Une offre publiée aujourd'hui a un bonus plein, qui diminue chaque jour jusqu'à zéro au bout de la durée réglée (14 jours par défaut). Un créateur sans vente est donc vu dès sa première offre.

### 6.4 Une boutique à la fois

Après le tri, on parcourt le flux. Si les `N` dernières offres viennent de la même boutique (`N` = 2 par défaut), la meilleure offre d'une autre boutique est remontée juste après.

---

## 7. La recherche

### 7.1 La pertinence

Chaque mot cherché est cherché dans l'offre, du plus important au moins important :

| Où le mot est trouvé | Points |
|---|---|
| La phrase entière dans le titre | +10 (une fois) |
| Dans le titre | +4 |
| Dans le nom de la boutique | +3 |
| Dans le résumé ou « Ce qui est inclus » | +2 |
| Dans la description | +1 |
| L'identifiant exact de l'offre | 100 |

Une offre qui ne contient qu'une partie des mots voit son total multiplié par la part de mots trouvés : elle passe après celles qui les contiennent tous. Une offre qui n'en contient aucun n'apparaît pas.

### 7.2 La tolérance

- **Majuscules et accents** sont ignorés : « elevage » trouve « Élevage ».
- **Pluriels et formes proches** sont reconnus : « formations » trouve « formation », « marketing » trouve « marketeur ».
- **Une faute de frappe** est pardonnée sur les mots de 5 lettres et plus : « fiscalitee » trouve « fiscalité ».

### 7.3 L'ordre des résultats

```
ordre = pertinence / meilleure pertinence + 0,35 × score de l'Explorer
```

La pertinence domine toujours. Le score de l'Explorer ne fait que départager les offres qui répondent à peu près aussi bien.

### 7.4 Les suggestions pendant la saisie

Dès 2 lettres, la liste propose :
1. de vrais titres d'offres qui répondent aux mots, les plus pertinents d'abord, puis les plus vendus à pertinence égale ;
2. les boutiques dont le nom contient les mots ;
3. les catégories correspondantes.

Rien n'est inventé ni sponsorisé. Une recherche validée nourrit les goûts du visiteur.

### 7.5 Les filtres

Type (produits ou services), catégorie, prix minimum et maximum, et tri : Recommandé (l'algorithme), Les plus vendus, Les plus récents, Prix croissant ou décroissant.

---

## 8. Offres similaires et exclusions

### 8.1 « Dans le même esprit »

Sous une offre, on propose jusqu'à 8 offres **d'autres boutiques** proches par le sujet :

```
proximité = mots communs / √(mots de l'offre × mots de l'autre) + 0,15 si même catégorie
```

Cette section n'apparaît jamais sous une offre de boutique privée : ses clients restent dans sa boutique.

### 8.2 Ce qui n'entre jamais dans le classement

- Les **boutiques privées**, absentes de l'Explorer, de la recherche, des suggestions et du sitemap. On les ouvre seulement par leur lien, comme une boutique à part.
- Les offres en **brouillon** ou **masquées** par Salacope.
- Les offres d'un vendeur **non vérifié**, **suspendu** ou **bloqué**.

---

## 9. Réglages de l'administration

Admin → Paramètres → **Explorer**.

| Réglage | Plage | Défaut |
|---|---|---|
| Poids de chacun des 7 signaux | 0 à 10 | voir 4.1 |
| Durée de la nouveauté | 1 à 90 jours | 14 |
| Offres d'une même boutique à la suite | 1 à 10 | 2 |
| À la une | 0 à 12 offres | aucune |

Chaque changement est inscrit au journal de l'administration.

### Recettes selon la phase

| Phase | Réglage conseillé | Effet |
|---|---|---|
| **Lancement** : peu de ventes, beaucoup de nouveaux créateurs | Nouveauté 8–10, Ventes 3, Rotation 3–4, À la une avec des créateurs variés | Tout le monde est vu, le catalogue paraît vivant. |
| **Croissance** : ventes régulières | Défauts (Ventes 6, Goûts 6, Nouveauté 5) | Équilibre entre ce qui marche et ce qui est neuf. |
| **Maturité** : beaucoup d'avis | Note 5–6, Ventes 6, Rotation 1–2 | La qualité prouvée passe devant. |
| **Opération spéciale** (fête, promotion) | À la une avec les offres de l'opération | Mise en avant sans toucher au classement. |

---

## 10. Fiche technique

### 10.1 Où vit le code

| Rôle | Fichier |
|---|---|
| Classement, recherche, similaires, suggestions (web) | `src/features/catalog/ranking.ts` |
| Mots : nettoyage, racines, fautes de frappe | `src/shared/lib/text.ts` |
| Goûts du visiteur (web) | `src/shared/lib/taste.ts` |
| Réglages partagés et valeurs par défaut | `src/shared/config/explore.ts` |
| Écran d'administration | `src/pages/admin/AdminExplorePage.tsx` |
| Signaux envoyés avec le catalogue (visites 30 j, favoris) | `server/load.ts` (`loadStats`) |
| Enregistrement des réglages | `server/settings.ts`, route `PUT /admin/explore` |
| Le même moteur dans l'app Android | `mobile/lib/features/catalog/domain/ranking.dart` |

### 10.2 Données utilisées

- **Envoyées avec le catalogue** : ventes par offre, visites sur 30 jours et favoris par offre (des nombres seulement, jamais qui), note et nombre d'avis par boutique, date de publication.
- **Gardées sur l'appareil** : catégories, boutiques et mots d'intérêt, offres vues récemment, graine de rotation.
- **Sur le compte** : boutiques suivies, favoris, achats (pour reculer ce qui est déjà acheté).

### 10.3 Performances

- **Où se fait le calcul** : sur l'appareil du visiteur, à partir du catalogue déjà chargé. Le serveur ne calcule rien par visiteur et reste léger.
- **Coût** : un classement de plusieurs milliers d'offres prend quelques millisecondes.
- **Rafraîchissement** : le catalogue est vérifié par une empreinte. Si rien n'a changé, la réponse ne pèse que quelques octets.

### 10.4 Limites connues et pistes

| Limite | Piste |
|---|---|
| Les goûts ne suivent pas la personne d'un appareil à l'autre. | Synchronisation volontaire, chiffrée, avec le compte. |
| Les mots sont comparés à l'identique (racines), pas par le sens. | Proximité par le sens (embeddings) pour « Dans le même esprit ». |
| Le classement est calculé sur l'appareil. | Au-delà de quelques dizaines de milliers d'offres, pré-classement côté serveur. |
| Les poids sont les mêmes pour tous. | Tests A/B entre deux jeux de poids, mesurés sur les ventes. |
| Pas d'emplacement payant. | Mise en avant payante, toujours signalée « Sponsorisé » et séparée du classement. |
