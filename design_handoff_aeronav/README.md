# Handoff : AeroNav — Planificateur de voyage aéronautique multi-avions

## Vue d'ensemble

**AeroNav** (nom de projet : *SortieClub*) est une application web de planification de voyages aéronautiques en **formation** (plusieurs avions voyageant ensemble), destinée aux **aéroclubs**. Elle permet de :

- Gérer des **référentiels** : personnes, avions (+ modèles), aérodromes — partagés au sein d'un aéroclub.
- Composer une **route de navigation** multi-étapes avec affectation des équipages (CDB + passagers) par branche et par avion.
- Calculer automatiquement, **pour chaque branche** : distance, cap, durée, carburant brûlé/restant, masse au décollage (TOW) et à l'atterrissage (LDW), avec **vérifications** (MTOW, réserve carburant, piste compatible, carburant disponible à destination, qualification du CDB).
- Gérer **plusieurs variantes de route** par voyage (plan A/B/C selon météo).
- Suivre les **finances** : prix horaire par avion + taxes d'aérodrome, réparties par pilote (seul le CDB d'une branche paye pour cette branche), avec écart à la moyenne.
- Gérer des **utilisateurs** (login OAuth), leurs **voyages**, et le **partage** d'un voyage avec d'autres membres du club.

---

## À propos des fichiers de design

⚠️ **Les fichiers HTML/JSX de ce bundle sont des références de design** — un prototype React (via Babel in-browser, sans build) qui montre l'apparence et le comportement souhaités. **Ce n'est pas du code de production à copier tel quel.**

La tâche consiste à **recréer ce design dans un véritable environnement applicatif** :
- Frontend recommandé : **React + TypeScript + Vite** (le prototype est déjà en React, la transposition est directe), avec un vrai bundler, du state management propre, et un découpage en composants/fichiers.
- Backend : au choix (Node/NestJS, Symfony/PHP, etc.) exposant une API REST/GraphQL + base de données relationnelle (voir **DATA_MODEL.md**).
- Auth : véritable OAuth (Google / Facebook / Microsoft / Apple) via un provider (Auth0, Clerk, Supabase Auth, NextAuth…).

Le prototype stocke tout **en mémoire** (objets `window.*`) + un peu de `localStorage` (utilisateur connecté, voyage actif, tweaks). Il faut remplacer ça par des appels API + persistance réelle.

---

## Fidélité

**Haute fidélité (hifi).** Couleurs, typographie, espacements et interactions sont définitifs. Le design suit une esthétique **"carte aéronautique papier OACI"** (fond crème, encre marine, accents rouge/bleu IGN), typographie **IBM Plex Sans / Mono**. Recréer l'UI fidèlement, en utilisant les composants de la codebase cible. Tous les tokens sont dans `styles.css` (reproduits dans la section Design Tokens ci-dessous).

> Note : une "Procertif Design System" a été attachée au projet, mais **AeroNav possède sa propre identité visuelle aéronautique** (volontairement distincte de Procertif/Skilldy). Conserver l'identité AeroNav décrite ici. Si l'équipe souhaite plutôt aligner sur Procertif, c'est une décision produit à acter explicitement.

---

## Architecture du prototype (fichiers)

| Fichier | Rôle |
|---|---|
| `AeroNav.html` | Point d'entrée : charge React 18 + Babel, fonts, FontAwesome, puis tous les scripts JSX. |
| `styles.css` | Tous les tokens CSS + classes utilitaires (boutons, chips, table, cards, toggle…). |
| `data.js` | **Modèle de données + tout le moteur de calcul** (distances, masses, carburant, finances). Vanilla JS, pas de JSX. À lire en premier. |
| `app.jsx` | Composant racine `App` : auth, état global, routing par onglets, handlers CRUD, branchement des modales. |
| `login.jsx` | Écran de connexion (providers OAuth mock). |
| `voyages-list.jsx` | Liste "Mes voyages", dialog de partage, menu utilisateur, dialog "Nouveau voyage", dialog paramètres voyage. |
| `dashboard.jsx` | Top bar, sous-onglets Voyage, panneau voyage (gauche), détail de branche + cartes avion (droite), variantes. |
| `map.jsx` | Carte SVG "papier OACI" de la France + Corse (projection, aérodromes, route, cercles d'autonomie). |
| `editors.jsx` | Popovers d'édition : aérodrome (remplacer une étape), équipage (CDB+PAX), bagages, carburant. |
| `forms.jsx` | Drawers de formulaire : Personne (référentiel), Avion, Modèle d'avion, Aérodrome, **VoyagePersonForm** (ajout/édition d'une personne dans un voyage avec lien compte utilisateur). |
| `referentials.jsx` | Pages Avions (flotte + modèles) et Aérodromes (table + filtres). |
| `voyage-people.jsx` | Sous-onglet "Personnes" d'un voyage (participants + CRUD). |
| `finance.jsx` | Sous-onglet "Finance" : totaux, répartition par avion, décompte par pilote avec écart à la moyenne. |
| `vac.jsx` | Modale carte VAC (SVG dessinés à la main pour LFRS Nantes et LFKO Propriano). |
| `tweaks-panel.jsx` | Panneau de réglages live (disposition, style carte, cercles d'autonomie). Spécifique au prototype — **non nécessaire en production**. |

👉 **Le modèle de données complet et le détail des calculs sont dans [`DATA_MODEL.md`](./DATA_MODEL.md).** À lire avant d'implémenter le backend.

---

## Navigation & écrans

### 0. Login (`login.jsx`)
- Plein écran, panneau gauche (branding + arguments), carte de connexion à droite.
- 4 boutons providers : **Google, Facebook, Microsoft, Apple** + "Connexion par email" + lien "Demander l'accès à mon aéroclub".
- En prod : brancher un vrai flux OAuth. À la connexion, on obtient un **User** (voir modèle), on stocke la session.

### 1. Mes voyages (`voyages-list.jsx` → `VoyagesListPage`)
- Onglet par défaut après login.
- Grille de cartes voyage. Filtres : **Tous / Mes voyages / Partagés avec moi** + recherche.
- Chaque carte : statut (brouillon/en préparation/en cours/terminé), route OACI, branches, distance, durée, coût total, propriétaire (avatar), invités (avatars empilés), bouton **Partager** (propriétaire uniquement).
- Bouton **+ Nouveau voyage** → `NewVoyageDialog`.
- Clic sur une carte → ouvre le voyage (onglet Voyage).

### 2. Voyage (`dashboard.jsx`) — avec 3 sous-onglets
Sous-barre : **Carte & branches / Personnes / Finance** (les données dépendent du voyage sélectionné).

#### 2a. Carte & branches (`VoyageDashboard`)
3 zones (disposition réglable gauche/droite/bas via tweaks) :
- **Panneau voyage (gauche)** : titre éditable inline (propriétaire), bouton ⚙️ paramètres, bandeau propriétaire+partagés, sélecteur de **variantes** (A/B/C : sélection, +nouvelle/dupliquer, renommer, supprimer), totaux (vol, escales, durée totale, taxes), liste des **branches** (chaque branche : numéro, OACI départ→arrivée cliquables pour remplacer, distance, cap, durée, mini-barres MTOW par avion, badge alertes), réglage du temps d'escale (+/- 15 min).
- **Carte (centre)** : carte papier SVG, aérodromes cliquables, tracé de la route avec labels distance/cap, cercles d'autonomie optionnels, légende, rose des vents, échelle.
- **Détail de branche (droite)** : entête (OACI départ/arrivée, distance, cap, altitude, durée groupe, taxe arrivée, boutons VAC), puis **une carte par avion** présent sur la branche avec : équipage éditable (CDB + PAX, sièges libres), métriques (durée, carb. brûlé/restant, TOW, LDW), barres (masse décollage %, carb. arrivée %), bandeau bagages (`N×poids = total`) et carburant au décollage (éditables). Badges d'alerte : MTOW dépassé, réserve carb. insuffisante, carb. indispo à destination, piste trop courte, CDB non qualifié.

#### 2b. Personnes (`voyage-people.jsx` → `VoyagePeoplePage`)
- Liste des personnes du club, filtres (Tous / Dans le voyage / Non assignés), recherche.
- Bouton **+ Ajouter une personne** et **Modifier** par ligne → `VoyagePersonForm` (voir interactions ci-dessous).
- Colonnes : avatar, nom (+ chip "Utilisateur" si lié à un compte, + email), licence, avions autorisés (**effectifs** pour le voyage, teinte ambre si surchargés), rôle dans le voyage (CDB ×N / PAX ×N / non assigné), branches (chips colorés par avion, gras = CDB), heures totales, montant à payer (si CDB).

#### 2c. Finance (`finance.jsx` → `FinancePage`)
- Bandeau de totaux : total voyage, coût heures de vol, taxes, nb pilotes facturés.
- **Répartition par avion** : carte par avion (tarif horaire, total, heures, % du total).
- **Décompte par pilote** (accordéons multi-ouverts, boutons Tout déplier/replier) : chaque carte montre total, **écart vs moyenne** (€ et %, vert si sous la moyenne, rouge si au-dessus) + **barre divergente** centrée sur la moyenne. Déplié = détail par branche (avion, durée, coût vol, taxes, sous-total).
- Avertissement listant les branches sans CDB désigné (coût non affecté).

### 3. Avions (`referentials.jsx` → `AircraftPage`)
- Toggle **Flotte / Modèles**. Filtré par aéroclub de l'utilisateur connecté.
- Flotte : cartes avion (immat, indicatif, badge club, modèle, perfs, tarif horaire, coût/NM, carburant, piste min, bouton Modifier).
- Modèles : cartes modèle (badge, désignation, type, nb d'appareils, perfs clés, carburant, tarif). Boutons + Nouveau / Modifier → drawers `AircraftForm` / `AircraftModelForm`.

### 4. Aérodromes (`referentials.jsx` → `AerodromesPage`)
- Table filtrée par bibliothèque du club. Recherche + filtres (Nuit, Jet-A1).
- Colonnes : OACI, nom/ville/ATC, piste (QFU + longueur), surface, altitude, carburants, nuit (point vert/rouge), PPR, taxes (atter+park), GPS, boutons VAC / Modifier.
- Bouton + Nouvel aérodrome → drawer `AerodromeForm`.

### Modales transverses
- **VAC** (`vac.jsx`) : carte d'approche à vue dessinée en SVG (LFRS, LFKO) + panneau infos/fréquences/services/taxes/notes.
- **Menu utilisateur** (top-right) : profil, carte aéroclub, déconnexion.

---

## Interactions & comportement clés

### Ajout / édition d'une personne dans un voyage (`VoyagePersonForm`)
Comportement **important** à reproduire fidèlement :
1. Premier champ = **email**. À la saisie, recherche d'un compte utilisateur existant (`userByEmail`).
2. **Si un compte existe** (`matchedUser`) :
   - **Prénom, nom, licence, rôle** sont **verrouillés** (gérés par l'utilisateur lui-même).
   - **Poids** et **avions autorisés** sont modifiables **mais uniquement pour ce voyage** → stockés comme *override* sur la variante (`variant.personOverrides[personId]`), **sans modifier** le profil global de l'utilisateur (`person.weightKg`, `person.authorizedModels`).
   - Boutons "réinitialiser" pour revenir aux valeurs du profil.
3. **Si aucun compte** : tous les champs éditables → crée un **PEOPLE record standalone** (profil libre non lié à un compte).
4. Les **calculs** (masse, qualif CDB) utilisent les **valeurs effectives** via `personEffective(personId, variant)` = profil + override voyage.

### Édition d'une étape
Clic sur un code OACI d'une branche → popover `AerodromePicker` (recherche, infos piste/carburant/nuit/taxes) → remplace l'aérodrome de départ ou d'arrivée de la branche.

### Affectation d'équipage
Clic sur la zone équipage d'une carte avion → popover `CrewPicker` : sélection du CDB (radio, filtré aux pilotes qualifiés pour le modèle), cases passagers (limitées au nombre de sièges-1), signalement des conflits (personne déjà sur un autre avion de la même branche).

### Bagages & carburant
Popovers avec steppers. Bagages = `count × unitKg` (tout le monde a des bagages du même poids unitaire). Carburant = litres au décollage (slider + stepper, plafonné à la capacité du modèle).

### Variantes de route
Chaque voyage a 1..N variantes indépendantes (route, équipages, carburant, bagages, overrides, temps d'escale, altitudes). Dupliquer copie tout en profondeur. La variante active est `voyage.activeVariantId`.

### Partage
`ShareDialog` : liste les membres du **même aéroclub** (hors propriétaire), cases à cocher → met à jour `voyage.sharedWith`. Droits : invités peuvent consulter + éditer l'équipage qui les concerne + voir les frais ; seul le propriétaire modifie la route et supprime.

### Persistance (prototype)
`localStorage` : `aeronav.user` (id utilisateur connecté), `aeronav.activeVoyageId`, tweaks. **À remplacer par API + DB.**

---

## State management (prototype → à transposer)

État porté par `App`/`AppShell` dans `app.jsx` :
- `currentUser` — utilisateur connecté (persisté localStorage).
- `activeVoyageId` — voyage ouvert.
- `tab` (voyages | voyage | aircraft | aerodromes) + `voyageSubTab` (map | people | finance).
- `selectedLegIdx` — branche sélectionnée.
- `editor` — popover ouvert ({kind, anchor, …}).
- `formEditor` — drawer ouvert ({kind, payload}).
- `shareDialogId`, `settingsDialogId`, `newVoyageOpen`, `userMenuOpen`, `vacIcao`.
- `voyagesVersion` / `refsVersion` — compteurs de "bump" pour forcer le recalcul après mutation en place (hack du prototype ; en prod, utiliser un vrai store + invalidation de cache / requêtes).

Les calculs dérivés (`computeVoyage`, `computeFinance`) sont **purs** et recalculés à la volée — à conserver côté front ou à déplacer côté back (idéalement partagés/validés serveur).

---

## Design tokens

(Repris de `styles.css`. Thème "papier OACI".)

### Couleurs
```
Papier / surfaces
--paper:        #f6efde   --paper-2: #efe5cc   --paper-3: #e7d9b8   --paper-edge: #d6c594
--surface:      #fbf6e7   --surface-2: #f1e8cc  --surface-card: #fffdf5
--hairline:     #cdbf99   --hairline-soft: #ddd1ad

Encre / texte
--ink:    #0b2240   --ink-2: #1a3556   --ink-3: #4a5a73   --ink-soft: #7a8aa3

Accents aéro
--aero-red:    #b8323a   --aero-red-2:   #8e242a   (restrictions, classe A, alertes, total)
--aero-blue:   #1b5fa8   --aero-blue-2:  #143f72   (eau, airways, Jet-A1)
--aero-amber:  #c8881e   (warnings, coucher de soleil, overrides voyage)
--aero-green:  #2e7d5b   --aero-green-2: #1f5a3f   (OK, herbe piste)
--aero-violet: #5b3a8e   (CTR)

Teintes avion (légende/équipages/finance) : --plane-1..6
#b8323a, #1b5fa8, #2e7d5b, #c8881e, #5b3a8e, #6d4a1f
```

### Typographie
```
--font-sans: "IBM Plex Sans"            (UI générale)
--font-mono: "IBM Plex Mono"            (chiffres, OACI, immat, tabulaire — font-variant-numeric: tabular-nums)
--font-cond: "IBM Plex Sans Condensed"
Tailles : corps 13px / 1.45. Titres de page 18px. Gros chiffres 18–30px. Labels "cap-sm" 9.5–10.5px uppercase, letter-spacing ~0.1em.
```
Import Google Fonts : `IBM+Plex+Sans:400,500,600,700` + `IBM+Plex+Sans+Condensed:500,600,700` + `IBM+Plex+Mono:400,500,600,700`.

### Rayons / ombres / layout
```
--r-xs:2 --r-sm:4 --r-md:6 --r-lg:10 (px)
--shadow-card: 0 1px 0 rgba(11,34,64,.06), 0 1px 2px rgba(11,34,64,.05)
--shadow-pop:  0 2px 0 rgba(11,34,64,.05), 0 12px 28px -8px rgba(11,34,64,.18)
--topbar-h: 52px   --sidebar-w: 64px
```

### Thèmes de carte (attribut `data-map` sur `<html>`)
`paper` (défaut), `night` (fond marine), `bw` (niveaux de gris). Voir `styles.css` pour les variables `--map-*`.

### Icônes
FontAwesome Free 6 (`fa-solid` + quelques `fa-brands` pour les providers OAuth). Emoji utilisés ponctuellement dans les pills du top-bar (📅 ⏱ 💶) — à remplacer par des icônes FA en prod si souhaité.

---

## Assets
Aucune image bitmap. **Tout est en SVG inline** (logo AeroNav, carte France/Corse, cartes VAC, silhouettes d'avion). Pas de dépendance d'asset externe hormis fonts Google + CDN FontAwesome. Les cartes VAC réelles seraient à intégrer depuis le SIA (cartes officielles) — ici ce sont des mocks SVG.

> La demande initiale évoquait une **carte IGN/Géoportail officielle**. Le prototype utilise une carte SVG stylisée maison (pas de tuiles). En prod, envisager l'intégration **IGN Géoportail / OpenStreetMap (Leaflet/MapLibre)** avec une couche aéro — nécessite clé API et appels réseau.

---

## Reste à faire / pistes (non implémenté dans le proto)
- Persistance réelle (API + DB) — voir DATA_MODEL.md.
- Vrai OAuth.
- Carte cartographique réelle (IGN/OSM) + recherche d'aérodromes par proximité.
- Vent / TAS / GS, centrage (devis de masse détaillé), coucher de soleil/usage de nuit.
- Création de voyage : ajout d'escales intermédiaires post-création (le proto crée un A→B, l'ajout d'escale est ébauché).
- Export PDF du plan de vol / log de navigation.
- Import/export CSV des référentiels.
- Rôles & permissions fins (admin club vs pilote).

---

## Fichiers inclus dans ce bundle
- `DATA_MODEL.md` — **modèle de données complet + formules de calcul** (à lire en priorité pour le backend).
- `screenshots/` — captures des écrans principaux (référence visuelle hifi).
- Tous les fichiers du prototype (`*.html`, `*.css`, `*.js`, `*.jsx`) — références de design.

## Captures d'écran (`screenshots/`)
| Fichier | Écran |
|---|---|
| `01-login.png` | Écran de connexion (providers OAuth) |
| `02-voyages-list.png` | Mes voyages (liste + cartes) |
| `03-voyage-map.png` | Voyage › Carte & branches (vue principale) |
| `04-voyage-people.png` | Voyage › Personnes (participants + CRUD) |
| `05-voyage-finance.png` | Voyage › Finance (décompte par pilote + écart moyenne) |
| `06-aircraft.png` | Avions (flotte / modèles) |
| `07-aerodromes.png` | Aérodromes (table + filtres) |
| `08-vac-chart.png` | Modale carte VAC (SVG) |
