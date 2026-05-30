# AeroNav — Modèle de données & moteur de calcul

Ce document décrit les entités, leurs relations, et **toutes les formules** utilisées par le prototype (`data.js`). Il sert de spécification pour le backend (schéma DB + API) et pour la logique métier.

---

## 1. Vue d'ensemble des entités

```
Aeroclub (tenant)
 ├── Users           (membres ; chaque user appartient à 1 aéroclub)
 ├── Aircraft        (flotte ; chaque avion appartient à 1 aéroclub)
 ├── Aerodrome       (bibliothèque partagée ; rattachée à 1..N aéroclubs)
 └── Voyage          (créé par un user, partagé avec d'autres)
      └── Variant     (1..N : plans A/B/C)
           ├── route          (liste ordonnée de codes OACI)
           ├── stopMin        (temps d'escale par point)
           ├── cruiseAltFt    (altitude par branche)
           ├── crewsByLeg     (équipage par branche × avion)
           ├── fuelLoadL      (carburant au décollage par branche × avion)
           ├── bagsByLeg      (bagages par branche × avion)
           └── personOverrides (surcharges poids/qualif par personne, pour ce voyage)

AircraftModel  (catalogue de modèles ; référencé par Aircraft.model)
Person         (référentiel de personnes ; un User peut être lié à une Person via personId)
```

Relations clés :
- **User → Person** : un utilisateur *peut* être lié à une fiche `Person` (`user.personId`). Une Person peut donc être (a) liée à un compte (identité verrouillée) ou (b) "standalone" (profil libre créé pour un voyage).
- **Aircraft → AircraftModel** : `aircraft.model` est la clé d'un `AC_MODELS`.
- **Voyage → Aeroclub** : un voyage appartient au club de son créateur ; le partage est restreint aux membres de ce club.
- **Variant** porte toute la donnée "planifiable". Les avions impliqués dans une variante = les **clés de `crewsByLeg[legIdx]`** (pas toute la flotte du club).

---

## 2. Entités détaillées

### 2.1 Aeroclub
```ts
{
  id: string,          // "ac-nantes"
  name: string,        // "Aéroclub de Nantes-Atlantique"
  code: string,        // "ACNA" (badge court)
  city: string,
  color: string,       // hex, pour les badges
  base: string,        // code OACI du terrain de base
}
```

### 2.2 User
```ts
{
  id: string,              // "u1"
  first: string,
  last: string,
  email: string,           // unique — sert à la recherche de compte
  aeroclubId: string,      // FK Aeroclub
  provider: "google" | "facebook" | "microsoft" | "apple",
  personId: string | null, // FK Person (l'identité "physique" du user) ; null si pas encore de fiche
  role: string,            // "Admin club" | "Pilote" | "Pilote LAPL" | ...
}
```

### 2.3 Person (référentiel)
```ts
{
  id: string,                  // "p1"
  first: string,
  last: string,
  weightKg: number,            // poids GLOBAL du profil (devis de masse par défaut)
  license: string,             // "PPL+CDI", "LAPL", "PPL", "—"
  authorizedModels: string[],  // clés AC_MODELS sur lesquelles la personne peut embarquer
  rolePref: "CDB" | "PAX",     // rôle préférentiel (informatif + filtre pilotes)
}
```
> ⚠️ Si une Person est liée à un User, son `first/last/license` est **géré par l'utilisateur** et non éditable depuis un voyage. Le `weightKg` et `authorizedModels` peuvent être **surchargés par voyage** (voir `personOverrides`).

### 2.4 AircraftModel (catalogue)
Clé = code interne (ex. `"DR400-155"`).
```ts
{
  label: string,        // "Robin DR.400-155 CDI"
  type: string,         // "Diesel monomoteur"
  fuelType: string,     // "Jet-A1" | "MOGAS / UL91" | "Jet-A1 / MOGAS" | "100LL"
  seats: number,        // places totales (CDB inclus)
  cruiseKt: number,     // vitesse de croisière (kt) — utilisée pour durée
  burnLh: number,       // consommation (L/h)
  fuelCapL: number,     // capacité carburant utilisable (L)
  massEmptyKg: number,  // masse à vide
  mtowKg: number,       // masse max au décollage
  mldwKg: number,       // masse max à l'atterrissage
  minRunwayM: number,   // longueur de piste mini requise (m)
  hourlyEUR: number,    // tarif horaire club (€/h) — utilisé pour la facturation
  icon: string,         // badge court "DR-CDI"
}
```
Modèles de démo : `DR400-155` (215€/h, Jet-A1, 4 pl.), `DR400-ROT` (145€/h, MOGAS, 4 pl.), `ELIXIR` (185€/h, Jet-A1/MOGAS, 2 pl.).

### 2.5 Aircraft (flotte)
```ts
{
  id: string,           // = reg (immatriculation)
  reg: string,          // "F-GAAA"
  model: string,        // FK AC_MODELS
  color: string,        // "var(--plane-1)" — teinte d'identification
  callsign: string,     // "ALPHA"
  aeroclubId: string,   // FK Aeroclub (visibilité)
  notes: string,
}
```

### 2.6 Aerodrome (bibliothèque)
```ts
{
  icao: string,             // "LFRS" (clé)
  name: string,             // "Nantes Atlantique"
  city: string,
  coord: [lng: number, lat: number],  // ⚠️ ordre [longitude, latitude]
  elevation: number,        // ft
  runways: [{ qfu: string, lengthM: number, surface: string }],  // surface: "Revêtue"|"Herbe"|"Stabilisée"|"Eau"
  fuel: string[],           // ["100LL","Jet-A1"]
  night: boolean,           // utilisable de nuit
  ppr: boolean,             // autorisation préalable requise
  atc: string,              // "Tour" | "AFIS" | "Tour+Approche" | "MIL" | "Aucun"
  taxLandingEUR: number,    // taxe d'atterrissage par avion
  taxParkingEUR: number,    // taxe de parking par avion (escales intermédiaires)
  note: string,
  aeroclubIds: string[],    // clubs pour lesquels cet aérodrome est visible
}
```

### 2.7 Voyage
```ts
{
  id: string,
  title: string,
  date: string,             // ISO "2026-06-13"
  aeroclubId: string,       // FK Aeroclub
  ownerId: string,          // FK User (propriétaire)
  sharedWith: string[],     // FK User[] (invités, même club)
  status: "draft" | "planning" | "ongoing" | "completed",
  activeVariantId: string,  // id de la variante affichée
  variants: Variant[],      // 1..N
}
```

### 2.8 Variant
```ts
{
  id: string,               // "A", "B", "C"
  label: string,            // "Plan A — Direct"
  weather: string,          // note météo libre
  tag: "ok" | "alt" | "draft",
  route: string[],          // ["LFRS","LFBI","LFCK","LFMV","LFKC","LFKO"] (>=2 codes OACI)
  stopMin: (number|null)[], // par POINT de route ; null aux extrémités ; minutes d'escale
  cruiseAltFt: number[],    // par BRANCHE (longueur = route.length - 1)

  // Indexés par branche (legIdx 0..route.length-2), puis par aircraftId :
  crewsByLeg: Array<Record<aircraftId, { cdb: personId|null, pax: personId[] }>>,
  fuelLoadL:  Array<Record<aircraftId, number>>,   // litres au décollage
  bagsByLeg:  Array<Record<aircraftId, { count: number, unitKg: number }>>,

  // Surcharges spécifiques au voyage, par personId :
  personOverrides: Record<personId, { weightKg?: number, authorizedModels?: string[] }>,
}
```
> Les **avions impliqués** dans une variante sont les clés présentes dans `crewsByLeg[legIdx]`. Ajouter un avion à un voyage = ajouter une entrée dans `crewsByLeg`/`fuelLoadL`/`bagsByLeg` de chaque branche.

---

## 3. Fonctions utilitaires (lookups)

```js
adByIcao(icao)            // Aerodrome
personById(id)            // Person
acById(id)                // Aircraft
userById(id)              // User
aeroclubById(id)          // Aeroclub
userByEmail(email)        // User | null  (case-insensitive)
userForPerson(personId)   // User | null  (l'user dont personId == personId)
activeVariant(voyage)     // la variante active

// Visibilité par utilisateur (multi-tenant) :
voyagesForUser(userId)        // voyages dont il est owner OU dans sharedWith
aircraftForUser(user)         // avions de son aéroclub
aerodromesForUser(user)       // aérodromes dont aeroclubIds inclut son club

// Attributs effectifs (profil + override voyage) :
personEffective(personId, variant) // { ...person, weightKg, authorizedModels, _hasOverride, _override }
```

`personEffective` est **central** : tous les calculs de masse et de qualification doivent l'utiliser, pas `personById` directement.
```js
personEffective(personId, variant) = {
  ...person,
  weightKg:        override.weightKg ?? person.weightKg,
  authorizedModels: override.authorizedModels ?? person.authorizedModels,
}
```

---

## 4. Géo & projection

### Distance (grand cercle, en milles nautiques)
```
R = 3440.065 NM
distNM(c1, c2) = 2R · asin( sqrt(
   sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
))
```

### Cap initial (route, degrés magnétiques approximés)
```
bearingDeg(c1, c2) = (atan2(
   sin(Δλ)·cos(φ2),
   cos(φ1)·sin(φ2) − sin(φ1)·cos(φ2)·cos(Δλ)
) en degrés + 360) mod 360
```
(φ = latitude, λ = longitude, en radians.)

### Projection carte (prototype)
Projection linéaire lon/lat → SVG, bornes France+Corse :
```
MAP_BOUNDS = { lngMin:-5.5, lngMax:10, latMin:41.0, latMax:51.2 }
MAP_VIEW   = { w:1200, h:1000 }
x = (lng - lngMin)/(lngMax - lngMin) · w
y = (latMax - lat)/(latMax - latMin) · h
```
> En prod avec une vraie carte (Leaflet/MapLibre), cette projection maison disparaît.

---

## 5. Calcul d'une branche — `computeLeg(legIdx, variant)`

Pour chaque branche (de `route[legIdx]` à `route[legIdx+1]`) et **chaque avion présent** (`crewsByLeg[legIdx]`) :

```
from = adByIcao(route[legIdx]); to = adByIcao(route[legIdx+1])
distance = distNM(from.coord, to.coord)            // NM
bearing  = bearingDeg(from.coord, to.coord)        // °

model = AC_MODELS[aircraft.model]
crew  = crewsByLeg[legIdx][aircraftId]             // {cdb, pax[]}
peopleIds = [crew.cdb, ...crew.pax] sans null

// Masse personnes (avec overrides voyage) :
peopleMass = Σ personEffective(pid, variant).weightKg

// Bagages :
bag = bagsByLeg[legIdx][aircraftId]                // {count, unitKg}
bagMass = bag.count × bag.unitKg

// Carburant :
fuelL = fuelLoadL[legIdx][aircraftId]              // litres au décollage
fuelDensity = model.fuelType inclut "Jet" ? 0.84 : 0.72   // kg/L
fuelKg = fuelL × fuelDensity

// Masses :
TOW = model.massEmptyKg + peopleMass + bagMass + fuelKg    // masse au décollage
durHr = distance / model.cruiseKt                          // durée (h)
durMin = durHr × 60
burnL  = durHr × model.burnLh                              // carburant brûlé (L)
fuelLeftL = max(0, fuelL − burnL)                          // restant à l'arrivée (L)
fuelBurnKg = burnL × fuelDensity
LDW = TOW − fuelBurnKg                                      // masse à l'atterrissage

// Vérifications (booléens) :
mtowExceeded = TOW > model.mtowKg
mldwExceeded = LDW > model.mldwKg
fuelOK       = fuelLeftL > (durHr × model.burnLh × 0.25)    // réserve ~25%
compatRunway = to.runways[0].lengthM >= model.minRunwayM
compatFuel   = model.fuelType inclut "Jet"
                 ? to.fuel inclut "Jet-A1"
                 : (to.fuel inclut "100LL" OU "MOGAS")
cdb  = personEffective(crew.cdb, variant)
cdbOK = cdb ? cdb.authorizedModels inclut aircraft.model : false
paxOK = tous les pax : personEffective(pax).authorizedModels inclut aircraft.model
```

Sortie par avion : `{ durHr, durMin, burnL, fuelLeftL, TOW, LDW, peopleMass, bagMass, fuelKg, mtow, mtowExceeded, mldw, mldwExceeded, fuelOK, compatRunway, compatFuel, cdbOK, paxOK, crew, bag }`.

---

## 6. Calcul du voyage — `computeVoyage(variant)`

```
legs = [computeLeg(0), computeLeg(1), ...]            // une par branche
voyageAcCount = nb d'avions dans la variante (clés de crewsByLeg[0])

// Durée de vol : le groupe vole ensemble → la branche dure le temps de l'avion le plus lent
flightMin = Σ_legs ( max sur avions de perAc.durMin )

stopMin = Σ variant.stopMin (en ignorant null)
totalMin = flightMin + stopMin

// Taxes (× nombre d'avions) :
pour chaque point de route i :
   ad = adByIcao(route[i])
   si i > 0 :                          taxLandingTotal += ad.taxLandingEUR × voyageAcCount
   si 0 < i < route.length-1 :         taxParkingTotal += ad.taxParkingEUR × voyageAcCount  // escales seulement
taxTotalEUR = taxLandingTotal + taxParkingTotal
```
Sortie : `{ legs, flightMin, stopMin, totalMin, taxLandingTotal, taxParkingTotal, taxTotalEUR }`.

---

## 7. Calcul financier — `computeFinance(variant)`

**Règle métier : seul le CDB d'une branche paye pour cette branche.**

Pour chaque branche, pour chaque avion :
```
isLastLeg = (legIdx == legs.length - 1)
destTaxLanding = leg.to.taxLandingEUR
destTaxParking = isLastLeg ? 0 : leg.to.taxParkingEUR
hours = perAc.durMin / 60
flightCost = hours × model.hourlyEUR
total = flightCost + destTaxLanding + destTaxParking
→ imputé au CDB de la branche (crew.cdb).  Si pas de CDB → "non affecté".
```

Agrégations :
- **byPerson[personId]** : `{ total, hours, flightCost, taxesCost, items[] }` — items = lignes par branche.
- **byAircraft[aircraftId]** : `{ total, hours, flightCost, taxesCost }`.
- **totals** : `{ flightCost, taxesCost, total, hours, unassignedCost }` (unassignedCost = somme des branches sans CDB).

**Écart à la moyenne** (affiché dans l'UI) :
```
avgPerPilot = (totals.total − totals.unassignedCost) / nbPilotesFacturés
delta_i = byPerson[i].total − avgPerPilot           // € ; rouge si >0, vert si <0
deltaPct_i = delta_i / avgPerPilot × 100
```

---

## 8. Constantes & hypothèses

| Constante | Valeur | Usage |
|---|---|---|
| Densité Jet-A1 | 0.84 kg/L | masse carburant si modèle "Jet*" |
| Densité essence (100LL/MOGAS) | 0.72 kg/L | sinon |
| Réserve carburant | 25 % de la conso de la branche | seuil `fuelOK` |
| Vitesse | croisière constante (`cruiseKt`) | pas de vent dans le proto |
| Durée groupe | max des durées avion par branche | vol en formation |
| Taxes | × nombre d'avions du voyage | atterrissage partout (sauf départ), parking aux escales |

Simplifications connues (à raffiner en prod) : pas de vent (TAS=GS), pas de centrage détaillé (juste TOW/LDW vs MTOW/MLDW), pas de calcul de coucher de soleil pour l'usage de nuit, montée/descente non modélisées.

---

## 9. Endpoints API suggérés (REST)

```
POST   /auth/oauth/:provider              → session + user
GET    /me                                → user courant + aéroclub

GET    /aeroclubs/:id
GET    /aeroclubs/:id/members             → users du club
GET    /aeroclubs/:id/aircraft            → flotte (aircraftForUser)
GET    /aeroclubs/:id/aerodromes          → bibliothèque (aerodromesForUser)

CRUD   /people                            → référentiel personnes (standalone)
CRUD   /aircraft                          → flotte
CRUD   /aircraft-models                   → catalogue modèles
CRUD   /aerodromes

GET    /voyages                           → voyagesForUser
POST   /voyages                           → créer (draft)
GET    /voyages/:id                        → voyage + variants
PATCH  /voyages/:id                        → titre, date, statut
DELETE /voyages/:id                        → (propriétaire)
PATCH  /voyages/:id/share                  → sharedWith[]

POST   /voyages/:id/variants               → dupliquer/créer
PATCH  /voyages/:id/variants/:vid          → route, stopMin, crews, fuel, bags, personOverrides
DELETE /voyages/:id/variants/:vid

GET    /voyages/:id/variants/:vid/compute  → legs + totals + finance (optionnel : calcul serveur)
```

Permissions : owner = tout ; sharedWith = lecture + édition équipage/override le concernant + lecture finance ; non-membre = 403.

---

## 10. Jeu de données de démo

Le prototype contient : 3 aéroclubs (ACNA, ACBX, ACMM), 7 users, 9 personnes, 3 modèles, 6 avions, ~20 aérodromes (France + Corse), 4 voyages dont le principal **Nantes (LFRS) → Propriano (LFKO)** en 5 branches avec 3 variantes (A Direct / B Bypass SO / C Côte d'Azur). Utiliser ce jeu comme seed de test (voir `data.js`).
