/**
 * AeroNav — Database seed
 * Idempotent: uses upsert throughout so it can be re-run safely.
 * Data sourced verbatim from /prototype/data.js
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Aeroclubs ───────────────────────────────────────────────────────────────

const AEROCLUBS = [
  { id: "ac-nantes",    name: "Aéroclub de Nantes-Atlantique", code: "ACNA", city: "Nantes",    color: "#1b5fa8", baseIcao: "LFRS" },
  { id: "ac-bordeaux",  name: "Aéroclub Bordelais",            code: "ACBX", city: "Bordeaux",  color: "#b8323a", baseIcao: "LFBD" },
  { id: "ac-marseille", name: "Aéroclub du Mistral",           code: "ACMM", city: "Marseille", color: "#c8881e", baseIcao: "LFML" },
];

// ─── People ──────────────────────────────────────────────────────────────────

const PEOPLE = [
  { id: "p1", aeroclubId: "ac-nantes",   firstName: "Antoine", lastName: "Lemaire",  weightKg: 82, license: "PPL+CDI", authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "CDB" },
  { id: "p2", aeroclubId: "ac-nantes",   firstName: "Camille", lastName: "Bertrand", weightKg: 64, license: "PPL+CDI", authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "CDB" },
  { id: "p3", aeroclubId: "ac-nantes",   firstName: "Julien",  lastName: "Marchand", weightKg: 88, license: "PPL",     authorizedModels: ["DR400-ROT","ELIXIR"],            rolePref: "CDB" },
  { id: "p4", aeroclubId: "ac-nantes",   firstName: "Sophie",  lastName: "Renaud",   weightKg: 58, license: "LAPL",   authorizedModels: ["ELIXIR","DR400-ROT"],            rolePref: "CDB" },
  { id: "p5", aeroclubId: "ac-nantes",   firstName: "Marc",    lastName: "Picard",   weightKg: 91, license: "—",      authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "PAX" },
  { id: "p6", aeroclubId: "ac-nantes",   firstName: "Élise",   lastName: "Dubreuil", weightKg: 56, license: "—",      authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "PAX" },
  { id: "p7", aeroclubId: "ac-nantes",   firstName: "Noah",    lastName: "Salinas",  weightKg: 72, license: "—",      authorizedModels: ["DR400-155","DR400-ROT"],          rolePref: "PAX" },
  { id: "p8", aeroclubId: "ac-nantes",   firstName: "Chloé",   lastName: "Vasseur",  weightKg: 61, license: "—",      authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "PAX" },
  { id: "p9", aeroclubId: "ac-nantes",   firstName: "Karim",   lastName: "Hadj",     weightKg: 78, license: "PPL",    authorizedModels: ["DR400-155","DR400-ROT"],          rolePref: "CDB" },
];

// ─── Users ───────────────────────────────────────────────────────────────────

const USERS = [
  { id: "u1", firstName: "Antoine", lastName: "Lemaire",  email: "antoine.lemaire@aero-nantes.fr", aeroclubId: "ac-nantes",   provider: "google",    personId: "p1", role: "Admin club" },
  { id: "u2", firstName: "Camille", lastName: "Bertrand", email: "camille.b@gmail.com",            aeroclubId: "ac-nantes",   provider: "google",    personId: "p2", role: "Pilote" },
  { id: "u3", firstName: "Julien",  lastName: "Marchand", email: "j.marchand@outlook.com",         aeroclubId: "ac-nantes",   provider: "microsoft", personId: "p3", role: "Pilote" },
  { id: "u4", firstName: "Sophie",  lastName: "Renaud",   email: "sophie.renaud@me.com",           aeroclubId: "ac-nantes",   provider: "apple",     personId: "p4", role: "Pilote LAPL" },
  { id: "u5", firstName: "Karim",   lastName: "Hadj",     email: "karim.hadj@gmail.com",           aeroclubId: "ac-nantes",   provider: "google",    personId: "p9", role: "Pilote" },
  { id: "u6", firstName: "Marc",    lastName: "Dupré",    email: "m.dupre@aero-bx.fr",             aeroclubId: "ac-bordeaux", provider: "facebook",  personId: null, role: "Admin club" },
  { id: "u7", firstName: "Léa",     lastName: "Caron",    email: "lea.caron@aero-bx.fr",           aeroclubId: "ac-bordeaux", provider: "google",    personId: null, role: "Pilote" },
];

// ─── Aircraft Models ─────────────────────────────────────────────────────────

// Note: modelId is the internal code used by aircraft references in the seed.
// We store the code as the Prisma `id` to keep FK references simple.
const AC_MODELS = [
  {
    id: "DR400-155",
    aeroclubId: "ac-nantes",
    label: "Robin DR.400-155 CDI",
    type: "Diesel monomoteur",
    fuelType: "Jet-A1",
    seats: 4,
    cruiseKt: 135,
    burnLh: 28,
    fuelCapL: 110,
    mtowKg: 1100,
    mldwKg: 1100,
    minRunwayM: 500,
    hourlyEUR: 215,
    icon: "DR-CDI",
  },
  {
    id: "DR400-ROT",
    aeroclubId: "ac-nantes",
    label: "Robin DR.400 Rotax (912iS)",
    type: "Essence monomoteur",
    fuelType: "MOGAS / UL91",
    seats: 4,
    cruiseKt: 110,
    burnLh: 18,
    fuelCapL: 110,
    mtowKg: 900,
    mldwKg: 900,
    minRunwayM: 450,
    hourlyEUR: 145,
    icon: "DR-ROT",
  },
  {
    id: "ELIXIR",
    aeroclubId: "ac-nantes",
    label: "Elixir Aircraft (Rotax 915iS)",
    type: "Composite biplace",
    fuelType: "Jet-A1 / MOGAS",
    seats: 2,
    cruiseKt: 130,
    burnLh: 21,
    fuelCapL: 100,
    mtowKg: 600,
    mldwKg: 600,
    minRunwayM: 400,
    hourlyEUR: 185,
    icon: "ELX",
  },
];

// ─── Aircraft ─────────────────────────────────────────────────────────────────

const AIRCRAFT = [
  { id: "F-GAAA", reg: "F-GAAA", modelId: "DR400-155", color: "var(--plane-1)", callsign: "ALPHA",   aeroclubId: "ac-nantes",   massEmptyKg: 693, notes: "Avion école, basé hangar 2" },
  { id: "F-GBBB", reg: "F-GBBB", modelId: "DR400-155", color: "var(--plane-2)", callsign: "BRAVO",   aeroclubId: "ac-nantes",   massEmptyKg: 688, notes: "Privilégié vols longs" },
  { id: "F-GCCC", reg: "F-GCCC", modelId: "ELIXIR",    color: "var(--plane-3)", callsign: "CHARLIE", aeroclubId: "ac-nantes",   massEmptyKg: 382, notes: "Biplace découverte" },
  { id: "F-GDDD", reg: "F-GDDD", modelId: "DR400-ROT", color: "var(--plane-4)", callsign: "DELTA",   aeroclubId: "ac-nantes",   massEmptyKg: 618, notes: "" },
  { id: "F-GHJK", reg: "F-GHJK", modelId: "DR400-155", color: "var(--plane-5)", callsign: "HOTEL",   aeroclubId: "ac-bordeaux", massEmptyKg: 695, notes: "" },
  { id: "F-GLMN", reg: "F-GLMN", modelId: "ELIXIR",    color: "var(--plane-6)", callsign: "LIMA",    aeroclubId: "ac-bordeaux", massEmptyKg: 379, notes: "" },
];

// ─── Aerodromes ──────────────────────────────────────────────────────────────

interface RunwaySeed {
  qfu: string;
  lengthM: number;
  surface: string;
}

interface AerodromeSeed {
  icao: string;
  name: string;
  city: string;
  coord: [number, number];
  elevation: number;
  runways: RunwaySeed[];
  fuel: string[];
  night: boolean;
  ppr: boolean;
  atc: string;
  taxLandingEUR: number;
  taxParkingEUR: number;
  note: string;
  aeroclubIds?: string[];
}

const AERODROMES: AerodromeSeed[] = [
  {
    icao: "LFRS", name: "Nantes Atlantique", city: "Nantes", coord: [-1.611, 47.157],
    elevation: 90, runways: [{qfu: "03/21", lengthM: 2900, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour+Approche",
    taxLandingEUR: 18, taxParkingEUR: 12,
    note: "CAG, parking aviation générale au sud."
  },
  {
    icao: "LFBI", name: "Poitiers-Biard", city: "Poitiers", coord: [0.307, 46.587],
    elevation: 423, runways: [{qfu: "03/21", lengthM: 2350, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "AFIS",
    taxLandingEUR: 14, taxParkingEUR: 8,
    note: "Bonne escale carburant, restau aéro club."
  },
  {
    icao: "LFCI", name: "Albi-Le Séquestre", city: "Albi", coord: [2.117, 43.914],
    elevation: 564, runways: [{qfu: "09/27", lengthM: 1430, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: false, ppr: false, atc: "AFIS",
    taxLandingEUR: 11, taxParkingEUR: 6,
    note: "Aéro-club actif, escale prisée des voyages vers le Sud."
  },
  {
    icao: "LFCK", name: "Castres-Mazamet", city: "Castres", coord: [2.289, 43.556],
    elevation: 788, runways: [{qfu: "13/31", lengthM: 1800, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "AFIS",
    taxLandingEUR: 12, taxParkingEUR: 7,
    note: "Reliefs au sud — attention vent traversier."
  },
  {
    icao: "LFMV", name: "Avignon-Caumont", city: "Avignon", coord: [4.902, 43.907],
    elevation: 124, runways: [{qfu: "17/35", lengthM: 1880, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 22, taxParkingEUR: 15,
    note: "Mistral fréquent, escale carburant facile."
  },
  {
    icao: "LFKC", name: "Calvi-Sainte-Catherine", city: "Calvi", coord: [8.793, 42.531],
    elevation: 209, runways: [{qfu: "18/36", lengthM: 2310, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: true, atc: "Tour",
    taxLandingEUR: 32, taxParkingEUR: 22,
    note: "PPR week-end été. Vol côtier obligatoire."
  },
  {
    icao: "LFKO", name: "Propriano", city: "Propriano", coord: [8.890, 41.661],
    elevation: 13, runways: [{qfu: "18/36", lengthM: 1200, surface: "Revêtue"}],
    fuel: ["100LL"], night: false, ppr: true, atc: "AFIS",
    taxLandingEUR: 24, taxParkingEUR: 16,
    note: "Jet-A1 indisponible — DR-CDI doit arriver avec autonomie suffisante."
  },
  {
    icao: "LFRN", name: "Rennes-Saint-Jacques", city: "Rennes", coord: [-1.73, 48.07],
    elevation: 124, runways: [{qfu: "10/28", lengthM: 2100, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 16, taxParkingEUR: 9, note: ""
  },
  {
    icao: "LFRB", name: "Brest-Bretagne", city: "Brest", coord: [-4.42, 48.45],
    elevation: 325, runways: [{qfu: "07/25", lengthM: 3100, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 19, taxParkingEUR: 11, note: ""
  },
  {
    icao: "LFBD", name: "Bordeaux-Mérignac", city: "Bordeaux", coord: [-0.71, 44.83],
    elevation: 162, runways: [{qfu: "05/23", lengthM: 3100, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 24, taxParkingEUR: 14, note: ""
  },
  {
    icao: "LFBO", name: "Toulouse-Blagnac", city: "Toulouse", coord: [1.36, 43.63],
    elevation: 499, runways: [{qfu: "14/32", lengthM: 3500, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 28, taxParkingEUR: 18, note: ""
  },
  {
    icao: "LFML", name: "Marseille-Provence", city: "Marseille", coord: [5.22, 43.44],
    elevation: 74, runways: [{qfu: "13/31", lengthM: 3500, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 32, taxParkingEUR: 22, note: ""
  },
  {
    icao: "LFLL", name: "Lyon-Saint-Exupéry", city: "Lyon", coord: [5.09, 45.73],
    elevation: 821, runways: [{qfu: "17/35", lengthM: 4000, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 34, taxParkingEUR: 24, note: ""
  },
  {
    icao: "LFLY", name: "Lyon-Bron", city: "Lyon", coord: [4.94, 45.73],
    elevation: 659, runways: [{qfu: "16/34", lengthM: 1820, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 22, taxParkingEUR: 14, note: ""
  },
  {
    icao: "LFPN", name: "Toussus-le-Noble", city: "Toussus", coord: [2.11, 48.75],
    elevation: 538, runways: [{qfu: "07/25", lengthM: 1100, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: false, ppr: false, atc: "Tour",
    taxLandingEUR: 26, taxParkingEUR: 18, note: ""
  },
  {
    icao: "LFLC", name: "Clermont-Ferrand-Auvergne", city: "Clermont", coord: [3.17, 45.79],
    elevation: 1090, runways: [{qfu: "08/26", lengthM: 3000, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 21, taxParkingEUR: 13, note: ""
  },
  {
    icao: "LFMN", name: "Nice-Côte d'Azur", city: "Nice", coord: [7.215, 43.66],
    elevation: 13, runways: [{qfu: "04/22", lengthM: 2960, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: true, atc: "Tour",
    taxLandingEUR: 38, taxParkingEUR: 28, note: ""
  },
  {
    icao: "LFLB", name: "Chambéry-Aix", city: "Chambéry", coord: [5.88, 45.64],
    elevation: 779, runways: [{qfu: "18/36", lengthM: 2020, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: false, atc: "Tour",
    taxLandingEUR: 18, taxParkingEUR: 12, note: ""
  },
  {
    icao: "LFLW", name: "Aurillac", city: "Aurillac", coord: [2.422, 44.892],
    elevation: 2096, runways: [{qfu: "02/20", lengthM: 1500, surface: "Revêtue"}],
    fuel: ["100LL"], night: false, ppr: false, atc: "AFIS",
    taxLandingEUR: 10, taxParkingEUR: 5, note: ""
  },
  {
    icao: "LFOA", name: "Avord", city: "Bourges", coord: [2.63, 47.05],
    elevation: 580, runways: [{qfu: "07/25", lengthM: 2400, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: true, atc: "MIL",
    taxLandingEUR: 0, taxParkingEUR: 0, note: ""
  },
  {
    icao: "LFMD", name: "Cannes-Mandelieu", city: "Cannes", coord: [6.95, 43.54],
    elevation: 13, runways: [{qfu: "17/35", lengthM: 1600, surface: "Revêtue"}],
    fuel: ["100LL","Jet-A1"], night: true, ppr: true, atc: "Tour",
    taxLandingEUR: 42, taxParkingEUR: 32, note: ""
  },
];

// ─── Crews / fuel / bags templates ───────────────────────────────────────────

function defaultCrews() {
  return [
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p4", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p3"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p4", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p3"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p3", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p4"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p3", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p4"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p3", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p4"] } },
  ];
}

function defaultFuel() {
  return Array.from({length: 5}, () => ({ "F-GAAA": 95, "F-GBBB": 95, "F-GCCC": 80, "F-GDDD": 95 }));
}

function defaultBags() {
  return Array.from({length: 5}, () => ({
    "F-GAAA": { count: 3, unitKg: 12 },
    "F-GBBB": { count: 3, unitKg: 12 },
    "F-GCCC": { count: 1, unitKg: 10 },
    "F-GDDD": { count: 2, unitKg: 12 },
  }));
}

// ─── Voyages ─────────────────────────────────────────────────────────────────

interface VariantSeed {
  id: string;
  label: string;
  weather: string;
  tag: string;
  route: string[];
  stopMin: (number | null)[];
  cruiseAltFt: number[];
  crewsByLeg: object[];
  fuelLoadL: object[];
  bagsByLeg: object[];
  personOverrides?: object;
}

interface VoyageSeed {
  id: string;
  title: string;
  date: string;
  aeroclubId: string;
  ownerId: string;
  sharedWith: string[];
  status: string;
  activeVariantId: string;
  aircraftIds: string[];
  variants: VariantSeed[];
}

const VOYAGES: VoyageSeed[] = [
  {
    id: "vy-nantes-propriano-2026-06",
    title: "Tour SortieClub — Nantes → Propriano",
    date: "2026-06-13",
    aeroclubId: "ac-nantes",
    ownerId: "u1",
    sharedWith: ["u2","u3","u4","u5"],
    status: "planning",
    activeVariantId: "var-A-nantes-propriano",
    aircraftIds: ["F-GAAA", "F-GBBB", "F-GCCC", "F-GDDD"],
    variants: [
      {
        id: "var-A-nantes-propriano",
        label: "Plan A — Direct",
        weather: "Météo nominale, vent OSO modéré",
        tag: "ok",
        route: ["LFRS","LFBI","LFCK","LFMV","LFKC","LFKO"],
        stopMin: [null, 45, 50, 45, 60, null],
        cruiseAltFt: [3500, 4500, 5500, 5500, 4500],
        crewsByLeg: defaultCrews(),
        fuelLoadL: defaultFuel(),
        bagsByLeg: defaultBags(),
        personOverrides: {},
      },
      {
        id: "var-B-nantes-propriano",
        label: "Plan B — Bypass Sud-Ouest",
        weather: "Si front orageux Massif central",
        tag: "alt",
        route: ["LFRS","LFBD","LFBO","LFMV","LFKC","LFKO"],
        stopMin: [null, 50, 45, 45, 60, null],
        cruiseAltFt: [3500, 4500, 4500, 5500, 4500],
        crewsByLeg: defaultCrews(),
        fuelLoadL: defaultFuel(),
        bagsByLeg: defaultBags(),
        personOverrides: {},
      },
      {
        id: "var-C-nantes-propriano",
        label: "Plan C — Côte d'Azur",
        weather: "Si CB sur la Provence intérieure",
        tag: "alt",
        route: ["LFRS","LFBI","LFLY","LFMD","LFKC","LFKO"],
        stopMin: [null, 45, 45, 50, 60, null],
        cruiseAltFt: [3500, 5500, 6500, 5500, 4500],
        crewsByLeg: defaultCrews(),
        fuelLoadL: defaultFuel(),
        bagsByLeg: defaultBags(),
        personOverrides: {},
      },
    ],
  },
  {
    id: "vy-tour-bretagne-2026-07",
    title: "Tour de Bretagne — 3 jours",
    date: "2026-07-04",
    aeroclubId: "ac-nantes",
    ownerId: "u2",
    sharedWith: ["u1","u3"],
    status: "planning",
    activeVariantId: "var-A-bretagne",
    aircraftIds: ["F-GAAA", "F-GCCC"],
    variants: [{
      id: "var-A-bretagne",
      label: "Plan A — Côtier",
      weather: "Beau temps, peu de vent",
      tag: "ok",
      route: ["LFRS","LFRB","LFRN","LFRS"],
      stopMin: [null, 60, 90, null],
      cruiseAltFt: [3500, 3500, 3500],
      crewsByLeg: [
        { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GCCC": { cdb: "p2", pax: [] } },
        { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GCCC": { cdb: "p2", pax: [] } },
        { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GCCC": { cdb: "p2", pax: [] } },
      ],
      fuelLoadL: Array.from({length:3}, () => ({ "F-GAAA": 95, "F-GCCC": 80 })),
      bagsByLeg: Array.from({length:3}, () => ({ "F-GAAA": { count: 2, unitKg: 10 }, "F-GCCC": { count: 1, unitKg: 8 } })),
      personOverrides: {},
    }],
  },
  {
    id: "vy-formation-ppl-2026-05",
    title: "Vol cross-country PPL — Solo",
    date: "2026-05-22",
    aeroclubId: "ac-nantes",
    ownerId: "u4",
    sharedWith: ["u1"],
    status: "completed",
    activeVariantId: "var-A-ppl",
    aircraftIds: ["F-GCCC"],
    variants: [{
      id: "var-A-ppl",
      label: "Plan validé",
      weather: "CAVOK",
      tag: "ok",
      route: ["LFRS","LFRN","LFRS"],
      stopMin: [null, 45, null],
      cruiseAltFt: [2500, 2500],
      crewsByLeg: [
        { "F-GCCC": { cdb: "p4", pax: [] } },
        { "F-GCCC": { cdb: "p4", pax: [] } },
      ],
      fuelLoadL: Array.from({length:2}, () => ({ "F-GCCC": 80 })),
      bagsByLeg: Array.from({length:2}, () => ({ "F-GCCC": { count: 0, unitKg: 0 } })),
      personOverrides: {},
    }],
  },
  {
    id: "vy-baroudeurs-2026-09",
    title: "Sortie Baroudeurs — Pyrénées",
    date: "2026-09-12",
    aeroclubId: "ac-nantes",
    ownerId: "u3",
    sharedWith: ["u1","u2"],
    status: "draft",
    activeVariantId: "var-A-baroudeurs",
    aircraftIds: ["F-GBBB", "F-GDDD"],
    variants: [{
      id: "var-A-baroudeurs",
      label: "Plan A — Initial",
      weather: "À planifier",
      tag: "draft",
      route: ["LFRS","LFBO","LFCK"],
      stopMin: [null, 45, null],
      cruiseAltFt: [3500, 4500],
      crewsByLeg: [
        { "F-GBBB": { cdb: "p2", pax: ["p7"] }, "F-GDDD": { cdb: "p3", pax: ["p6"] } },
        { "F-GBBB": { cdb: "p2", pax: ["p7"] }, "F-GDDD": { cdb: "p3", pax: ["p6"] } },
      ],
      fuelLoadL: Array.from({length:2}, () => ({ "F-GBBB": 100, "F-GDDD": 95 })),
      bagsByLeg: Array.from({length:2}, () => ({ "F-GBBB": { count: 2, unitKg: 12 }, "F-GDDD": { count: 2, unitKg: 12 } })),
      personOverrides: {},
    }],
  },
];

// ─── Seed runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding aeroclubs…");
  for (const ac of AEROCLUBS) {
    await prisma.aeroclub.upsert({
      where: { id: ac.id },
      update: ac,
      create: ac,
    });
  }

  console.log("Seeding aircraft models…");
  for (const m of AC_MODELS) {
    await prisma.aircraftModel.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }

  console.log("Seeding people…");
  for (const p of PEOPLE) {
    await prisma.person.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  console.log("Seeding users…");
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: u,
      create: u,
    });
  }

  console.log("Seeding aircraft…");
  for (const a of AIRCRAFT) {
    await prisma.aircraft.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  console.log("Seeding aerodromes…");
  for (const ad of AERODROMES) {
    const aeroclubIds = ad.aeroclubIds ?? ["ac-nantes", "ac-bordeaux"];
    const adData = {
      icao: ad.icao,
      name: ad.name,
      city: ad.city,
      lngLat: ad.coord,
      elevationFt: ad.elevation,
      fuel: ad.fuel,
      night: ad.night,
      ppr: ad.ppr,
      atc: ad.atc,
      taxLanding: ad.taxLandingEUR,
      taxParking: ad.taxParkingEUR,
      notes: ad.note || null,
      aeroclubIds,
    };

    const aerodrome = await prisma.aerodrome.upsert({
      where: { icao: ad.icao },
      update: adData,
      create: adData,
    });

    // Re-create runways (delete+insert for idempotency)
    await prisma.runway.deleteMany({ where: { aerodromeId: aerodrome.id } });
    for (const rwy of ad.runways) {
      await prisma.runway.create({
        data: {
          aerodromeId: aerodrome.id,
          qfu: rwy.qfu,
          lengthM: rwy.lengthM,
          surface: rwy.surface,
        },
      });
    }
  }

  console.log("Seeding voyages…");
  for (const v of VOYAGES) {
    const voyageData = {
      id: v.id,
      title: v.title,
      date: new Date(v.date),
      aeroclubId: v.aeroclubId,
      ownerId: v.ownerId,
      sharedWith: v.sharedWith,
      status: v.status,
      activeVariantId: v.activeVariantId,
      aircraftIds: v.aircraftIds,
    };

    await prisma.voyage.upsert({
      where: { id: v.id },
      update: voyageData,
      create: voyageData,
    });

    for (const variant of v.variants) {
      const variantData = {
        id: variant.id,
        voyageId: v.id,
        label: variant.label,
        weather: variant.weather,
        tag: variant.tag,
        route: variant.route,
        stopMin: variant.stopMin,
        cruiseAltFt: variant.cruiseAltFt,
        crewsByLeg: variant.crewsByLeg,
        fuelLoadL: variant.fuelLoadL,
        bagsByLeg: variant.bagsByLeg,
        personOverrides: variant.personOverrides ?? {},
      };

      await prisma.variant.upsert({
        where: { id: variant.id },
        update: variantData,
        create: variantData,
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
