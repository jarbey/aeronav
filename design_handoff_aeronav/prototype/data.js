// AeroNav — sample dataset for Nantes → Propriano (4 aircraft, 9 people, 5 legs)

// --- Aéroclubs (organization tenants) ---
window.AEROCLUBS = [
  { id: "ac-nantes",   name: "Aéroclub de Nantes-Atlantique", code: "ACNA", city: "Nantes",   color: "#1b5fa8", base: "LFRS" },
  { id: "ac-bordeaux", name: "Aéroclub Bordelais",            code: "ACBX", city: "Bordeaux", color: "#b8323a", base: "LFBD" },
  { id: "ac-marseille",name: "Aéroclub du Mistral",            code: "ACMM", city: "Marseille",color: "#c8881e", base: "LFML" },
];

// --- Users ---
// Each user belongs to one aéroclub. personId links them to a PEOPLE record
// (their weight, license, etc.) so a user IS also a "personne" of the system.
window.USERS = [
  { id: "u1", first: "Antoine",  last: "Lemaire",  email: "antoine.lemaire@aero-nantes.fr", aeroclubId: "ac-nantes",   provider: "google",    personId: "p1", role: "Admin club" },
  { id: "u2", first: "Camille",  last: "Bertrand", email: "camille.b@gmail.com",            aeroclubId: "ac-nantes",   provider: "google",    personId: "p2", role: "Pilote" },
  { id: "u3", first: "Julien",   last: "Marchand", email: "j.marchand@outlook.com",         aeroclubId: "ac-nantes",   provider: "microsoft", personId: "p3", role: "Pilote" },
  { id: "u4", first: "Sophie",   last: "Renaud",   email: "sophie.renaud@me.com",           aeroclubId: "ac-nantes",   provider: "apple",     personId: "p4", role: "Pilote LAPL" },
  { id: "u5", first: "Karim",    last: "Hadj",     email: "karim.hadj@gmail.com",           aeroclubId: "ac-nantes",   provider: "google",    personId: "p9", role: "Pilote" },
  { id: "u6", first: "Marc",     last: "Dupré",    email: "m.dupre@aero-bx.fr",             aeroclubId: "ac-bordeaux", provider: "facebook",  personId: null, role: "Admin club" },
  { id: "u7", first: "Léa",      last: "Caron",    email: "lea.caron@aero-bx.fr",           aeroclubId: "ac-bordeaux", provider: "google",    personId: null, role: "Pilote" },
];

// --- Aircraft models (specs) ---
// All numbers are realistic-ish; this is a planning prototype not an AFM.
window.AC_MODELS = {
  "DR400-155": {
    label: "Robin DR.400-155 CDI",
    type: "Diesel monomoteur",
    fuelType: "Jet-A1",
    seats: 4,
    cruiseKt: 135,
    burnLh: 28,           // L/h
    fuelCapL: 110,        // total usable
    massEmptyKg: 690,
    mtowKg: 1100,         // MTOW
    mldwKg: 1100,
    minRunwayM: 500,
    hourlyEUR: 215,       // coût horaire club
    icon: "DR-CDI",
  },
  "DR400-ROT": {
    label: "Robin DR.400 Rotax (912iS)",
    type: "Essence monomoteur",
    fuelType: "MOGAS / UL91",
    seats: 4,
    cruiseKt: 110,
    burnLh: 18,
    fuelCapL: 110,
    massEmptyKg: 615,
    mtowKg: 900,
    mldwKg: 900,
    minRunwayM: 450,
    hourlyEUR: 145,
    icon: "DR-ROT",
  },
  "ELIXIR": {
    label: "Elixir Aircraft (Rotax 915iS)",
    type: "Composite biplace",
    fuelType: "Jet-A1 / MOGAS",
    seats: 2,
    cruiseKt: 130,
    burnLh: 21,
    fuelCapL: 100,
    massEmptyKg: 380,
    mtowKg: 600,
    mldwKg: 600,
    minRunwayM: 400,
    hourlyEUR: 185,
    icon: "ELX",
  },
};

// --- Fleet ---
// Each aircraft is owned by an aéroclub. Visible only to members of that club.
window.AIRCRAFT = [
  { id: "F-GAAA", model: "DR400-155", reg: "F-GAAA", color: "var(--plane-1)", callsign: "ALPHA",   aeroclubId: "ac-nantes",   notes: "Avion école, basé hangar 2" },
  { id: "F-GBBB", model: "DR400-155", reg: "F-GBBB", color: "var(--plane-2)", callsign: "BRAVO",   aeroclubId: "ac-nantes",   notes: "Privilégié vols longs" },
  { id: "F-GCCC", model: "ELIXIR",    reg: "F-GCCC", color: "var(--plane-3)", callsign: "CHARLIE", aeroclubId: "ac-nantes",   notes: "Biplace découverte" },
  { id: "F-GDDD", model: "DR400-ROT", reg: "F-GDDD", color: "var(--plane-4)", callsign: "DELTA",   aeroclubId: "ac-nantes",   notes: "" },
  { id: "F-GHJK", model: "DR400-155", reg: "F-GHJK", color: "var(--plane-5)", callsign: "HOTEL",   aeroclubId: "ac-bordeaux", notes: "" },
  { id: "F-GLMN", model: "ELIXIR",    reg: "F-GLMN", color: "var(--plane-6)", callsign: "LIMA",    aeroclubId: "ac-bordeaux", notes: "" },
];

// --- People ---
// authorizedModels: which AC models they may be on board for (CDB needs license matching)
// rolePref: pilot or pax (informational)
window.PEOPLE = [
  { id: "p1", first: "Antoine",  last: "Lemaire",   weightKg: 82, license: "PPL+CDI", authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "CDB" },
  { id: "p2", first: "Camille",  last: "Bertrand",  weightKg: 64, license: "PPL+CDI", authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "CDB" },
  { id: "p3", first: "Julien",   last: "Marchand",  weightKg: 88, license: "PPL",     authorizedModels: ["DR400-ROT","ELIXIR"],            rolePref: "CDB" },
  { id: "p4", first: "Sophie",   last: "Renaud",    weightKg: 58, license: "LAPL",    authorizedModels: ["ELIXIR","DR400-ROT"],            rolePref: "CDB" },
  { id: "p5", first: "Marc",     last: "Picard",    weightKg: 91, license: "—",        authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "PAX" },
  { id: "p6", first: "Élise",    last: "Dubreuil",  weightKg: 56, license: "—",        authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "PAX" },
  { id: "p7", first: "Noah",     last: "Salinas",   weightKg: 72, license: "—",        authorizedModels: ["DR400-155","DR400-ROT"],         rolePref: "PAX" },
  { id: "p8", first: "Chloé",    last: "Vasseur",   weightKg: 61, license: "—",        authorizedModels: ["DR400-155","DR400-ROT","ELIXIR"], rolePref: "PAX" },
  { id: "p9", first: "Karim",    last: "Hadj",      weightKg: 78, license: "PPL",     authorizedModels: ["DR400-155","DR400-ROT"],         rolePref: "CDB" },
];

// --- Aerodromes ---
// coord: [lng, lat]
// runways: array of {qfu, lengthM, surface}
// fuel: array of fuel codes (100LL, Jet-A1, MOGAS/UL91)
// night: usable at night (with PPR or unrestricted)
window.AERODROMES = [
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
  // Context-only aerodromes (visible on map, not on the route by default)
  { icao: "LFRN", name: "Rennes-Saint-Jacques", city: "Rennes", coord: [-1.73, 48.07], elevation: 124, runways: [{qfu:"10/28",lengthM:2100,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 16, taxParkingEUR: 9, note:"" },
  { icao: "LFRB", name: "Brest-Bretagne", city: "Brest", coord: [-4.42, 48.45], elevation: 325, runways: [{qfu:"07/25",lengthM:3100,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 19, taxParkingEUR: 11, note:"" },
  { icao: "LFBD", name: "Bordeaux-Mérignac", city: "Bordeaux", coord: [-0.71, 44.83], elevation: 162, runways: [{qfu:"05/23",lengthM:3100,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 24, taxParkingEUR: 14, note:"" },
  { icao: "LFBO", name: "Toulouse-Blagnac", city: "Toulouse", coord: [1.36, 43.63], elevation: 499, runways: [{qfu:"14/32",lengthM:3500,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 28, taxParkingEUR: 18, note:"" },
  { icao: "LFML", name: "Marseille-Provence", city: "Marseille", coord: [5.22, 43.44], elevation: 74, runways: [{qfu:"13/31",lengthM:3500,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 32, taxParkingEUR: 22, note:"" },
  { icao: "LFLL", name: "Lyon-Saint-Exupéry", city: "Lyon", coord: [5.09, 45.73], elevation: 821, runways: [{qfu:"17/35",lengthM:4000,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 34, taxParkingEUR: 24, note:"" },
  { icao: "LFLY", name: "Lyon-Bron", city: "Lyon", coord: [4.94, 45.73], elevation: 659, runways: [{qfu:"16/34",lengthM:1820,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 22, taxParkingEUR: 14, note:"" },
  { icao: "LFPN", name: "Toussus-le-Noble", city: "Toussus", coord: [2.11, 48.75], elevation: 538, runways: [{qfu:"07/25",lengthM:1100,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:false, ppr:false, atc:"Tour", taxLandingEUR: 26, taxParkingEUR: 18, note:"" },
  { icao: "LFLC", name: "Clermont-Ferrand-Auvergne", city: "Clermont", coord: [3.17, 45.79], elevation: 1090, runways: [{qfu:"08/26",lengthM:3000,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 21, taxParkingEUR: 13, note:"" },
  { icao: "LFMN", name: "Nice-Côte d'Azur", city: "Nice", coord: [7.215, 43.66], elevation: 13, runways: [{qfu:"04/22",lengthM:2960,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:true, atc:"Tour", taxLandingEUR: 38, taxParkingEUR: 28, note:"" },
  { icao: "LFLB", name: "Chambéry-Aix", city: "Chambéry", coord: [5.88, 45.64], elevation: 779, runways: [{qfu:"18/36",lengthM:2020,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:false, atc:"Tour", taxLandingEUR: 18, taxParkingEUR: 12, note:"" },
  { icao: "LFLW", name: "Aurillac", city: "Aurillac", coord: [2.422, 44.892], elevation: 2096, runways: [{qfu:"02/20",lengthM:1500,surface:"Revêtue"}], fuel:["100LL"], night:false, ppr:false, atc:"AFIS", taxLandingEUR: 10, taxParkingEUR: 5, note:"" },
  { icao: "LFOA", name: "Avord", city: "Bourges", coord: [2.63, 47.05], elevation: 580, runways: [{qfu:"07/25",lengthM:2400,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:true, atc:"MIL", taxLandingEUR: 0, taxParkingEUR: 0, note:"" },
  { icao: "LFMD", name: "Cannes-Mandelieu", city: "Cannes", coord: [6.95, 43.54], elevation: 13, runways: [{qfu:"17/35",lengthM:1600,surface:"Revêtue"}], fuel:["100LL","Jet-A1"], night:true, ppr:true, atc:"Tour", taxLandingEUR: 42, taxParkingEUR: 32, note:"" },
];

// Attach aerodromes to all aéroclubs by default (so the demo shows shared library).
// In a real product each club curates their own list.
window.AERODROMES.forEach(ad => {
  if (!ad.aeroclubIds) ad.aeroclubIds = ["ac-nantes", "ac-bordeaux"];
});

// --- Voyage : Nantes → Propriano (multi-variant: weather routing) ---
// Each variant has its own route + crews + fuel + bags + stop times.
window.VOYAGE = {
  id: "vy-nantes-propriano-2026-06",
  title: "Tour SortieClub — Nantes → Propriano",
  date: "2026-06-13",
  aeroclubId: "ac-nantes",
  ownerId: "u1",
  sharedWith: ["u2", "u3", "u4", "u5"],
  status: "planning",
  activeVariantId: "A",
  variants: [
    {
      id: "A",
      label: "Plan A — Direct",
      weather: "Météo nominale, vent OSO modéré",
      tag: "ok",
      route: ["LFRS", "LFBI", "LFCK", "LFMV", "LFKC", "LFKO"],
      stopMin: [null, 45, 50, 45, 60, null],
      cruiseAltFt: [3500, 4500, 5500, 5500, 4500],
    },
    {
      id: "B",
      label: "Plan B — Bypass Sud-Ouest",
      weather: "Si front orageux Massif central",
      tag: "alt",
      route: ["LFRS", "LFBD", "LFBO", "LFMV", "LFKC", "LFKO"],
      stopMin: [null, 50, 45, 45, 60, null],
      cruiseAltFt: [3500, 4500, 4500, 5500, 4500],
    },
    {
      id: "C",
      label: "Plan C — Côte d'Azur",
      weather: "Si CB sur la Provence intérieure",
      tag: "alt",
      route: ["LFRS", "LFBI", "LFLY", "LFMD", "LFKC", "LFKO"],
      stopMin: [null, 45, 45, 50, 60, null],
      cruiseAltFt: [3500, 5500, 6500, 5500, 4500],
    },
  ],
};

// Shared crews / fuel / bags — generated for the active variant's leg count
// (each variant has 5 legs in this demo so we use a single shared template).
function _defaultCrews() {
  return [
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p4", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p3"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p4", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p3"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p3", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p4"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p3", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p4"] } },
    { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GBBB": { cdb: "p2", pax: ["p7","p8"] }, "F-GCCC": { cdb: "p3", pax: [] }, "F-GDDD": { cdb: "p9", pax: ["p4"] } },
  ];
}
function _defaultFuel() {
  return Array.from({length: 5}, () => ({ "F-GAAA": 95, "F-GBBB": 95, "F-GCCC": 80, "F-GDDD": 95 }));
}
function _defaultBags() {
  // count = number of bags, unitKg = weight of one bag
  return Array.from({length: 5}, () => ({
    "F-GAAA": { count: 3, unitKg: 12 },
    "F-GBBB": { count: 3, unitKg: 12 },
    "F-GCCC": { count: 1, unitKg: 10 },
    "F-GDDD": { count: 2, unitKg: 12 },
  }));
}
window.VOYAGE.variants.forEach(v => {
  v.crewsByLeg = _defaultCrews();
  v.fuelLoadL = _defaultFuel();
  v.bagsByLeg = _defaultBags();
  v.personOverrides = v.personOverrides || {};
});

// --- Voyages library : list of trips visible to the current user ---
// Each voyage has its own variants + crews. The current VOYAGE above is the
// main demo trip; we add a couple more so the "Mes voyages" page has content.
function _legacyEmptyCrew(acIds) { return acIds.reduce((o, id) => { o[id] = { cdb: null, pax: [] }; return o; }, {}); }

window.VOYAGES = [
  window.VOYAGE,
  {
    id: "vy-tour-bretagne-2026-07",
    title: "Tour de Bretagne — 3 jours",
    date: "2026-07-04",
    aeroclubId: "ac-nantes",
    ownerId: "u2",
    sharedWith: ["u1", "u3"],
    status: "planning",
    activeVariantId: "A",
    variants: [{
      id: "A",
      label: "Plan A — Côtier",
      weather: "Beau temps, peu de vent",
      tag: "ok",
      route: ["LFRS", "LFRB", "LFRN", "LFRS"],
      stopMin: [null, 60, 90, null],
      cruiseAltFt: [3500, 3500, 3500],
      crewsByLeg: [
        { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GCCC": { cdb: "p2", pax: [] } },
        { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GCCC": { cdb: "p2", pax: [] } },
        { "F-GAAA": { cdb: "p1", pax: ["p5","p6"] }, "F-GCCC": { cdb: "p2", pax: [] } },
      ],
      fuelLoadL: Array.from({length:3}, () => ({ "F-GAAA": 95, "F-GCCC": 80 })),
      bagsByLeg: Array.from({length:3}, () => ({ "F-GAAA": { count: 2, unitKg: 10 }, "F-GCCC": { count: 1, unitKg: 8 } })),
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
    activeVariantId: "A",
    variants: [{
      id: "A",
      label: "Plan validé",
      weather: "CAVOK",
      tag: "ok",
      route: ["LFRS", "LFRN", "LFRS"],
      stopMin: [null, 45, null],
      cruiseAltFt: [2500, 2500],
      crewsByLeg: [
        { "F-GCCC": { cdb: "p4", pax: [] } },
        { "F-GCCC": { cdb: "p4", pax: [] } },
      ],
      fuelLoadL: Array.from({length:2}, () => ({ "F-GCCC": 80 })),
      bagsByLeg: Array.from({length:2}, () => ({ "F-GCCC": { count: 0, unitKg: 0 } })),
    }],
  },
  {
    id: "vy-baroudeurs-2026-09",
    title: "Sortie Baroudeurs — Pyrénées",
    date: "2026-09-12",
    aeroclubId: "ac-nantes",
    ownerId: "u3",
    sharedWith: ["u1", "u2", "u9"],
    status: "draft",
    activeVariantId: "A",
    variants: [{
      id: "A",
      label: "Plan A — Initial",
      weather: "À planifier",
      tag: "draft",
      route: ["LFRS", "LFBO", "LFCK"],
      stopMin: [null, 45, null],
      cruiseAltFt: [3500, 4500],
      crewsByLeg: [
        { "F-GBBB": { cdb: "p2", pax: ["p7"] }, "F-GDDD": { cdb: "p3", pax: ["p6"] } },
        { "F-GBBB": { cdb: "p2", pax: ["p7"] }, "F-GDDD": { cdb: "p3", pax: ["p6"] } },
      ],
      fuelLoadL: Array.from({length:2}, () => ({ "F-GBBB": 100, "F-GDDD": 95 })),
      bagsByLeg: Array.from({length:2}, () => ({ "F-GBBB": { count: 2, unitKg: 12 }, "F-GDDD": { count: 2, unitKg: 12 } })),
    }],
  },
];

// Currently loaded voyage (mutable from app)
window.activeVoyageId = window.VOYAGE.id;

// ---- Helpers ----

// Great-circle distance in nautical miles
window.distNM = function(c1, c2) {
  const toRad = (d) => d * Math.PI / 180;
  const R = 3440.065; // NM
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Initial magnetic course (deg)
window.bearingDeg = function(c1, c2) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lng1), λ2 = toRad(lng2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2 - λ1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// Map projection: lon/lat → svg coords given viewBox
// Range chosen to cover France + Corsica with mild compression
window.MAP_BOUNDS = { lngMin: -5.5, lngMax: 10, latMin: 41.0, latMax: 51.2 };
window.MAP_VIEW = { w: 1200, h: 1000 };
window.project = function([lng, lat]) {
  const b = window.MAP_BOUNDS, v = window.MAP_VIEW;
  const x = (lng - b.lngMin) / (b.lngMax - b.lngMin) * v.w;
  const y = (b.latMax - lat) / (b.latMax - b.latMin) * v.h;
  return [x, y];
};

// Quick lookup
window.adByIcao = function(icao) { return window.AERODROMES.find(a => a.icao === icao); };
window.personById = function(id) { return window.PEOPLE.find(p => p.id === id); };
window.acById = function(id) { return window.AIRCRAFT.find(a => a.id === id); };
window.userById = function(id) { return window.USERS.find(u => u.id === id); };
window.aeroclubById = function(id) { return window.AEROCLUBS.find(c => c.id === id); };
window.userDisplayName = function(u) { return u ? `${u.first} ${u.last}` : "—"; };
window.userInitials = function(u) { return u ? (u.first[0] + u.last[0]).toUpperCase() : "??"; };

// Find user by email (case-insensitive)
window.userByEmail = function(email) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return null;
  return window.USERS.find(u => u.email.toLowerCase() === e) || null;
};
// Find the user whose personId matches (i.e. this PEOPLE record IS a system user)
window.userForPerson = function(personId) {
  return window.USERS.find(u => u.personId === personId) || null;
};
// Effective person attributes for a voyage variant : applies per-voyage overrides
// (weight + authorized models) if present on the variant.
window.personEffective = function(personId, variant) {
  const p = window.personById(personId);
  if (!p) return null;
  const overrides = (variant && variant.personOverrides && variant.personOverrides[personId]) || {};
  return {
    ...p,
    weightKg: overrides.weightKg != null ? overrides.weightKg : p.weightKg,
    authorizedModels: overrides.authorizedModels || p.authorizedModels,
    _hasOverride: !!(overrides.weightKg != null || overrides.authorizedModels),
    _override: overrides,
  };
};

// Voyages visible to a user: owner OR shared
window.voyagesForUser = function(userId) {
  return window.VOYAGES.filter(v => v.ownerId === userId || (v.sharedWith || []).includes(userId));
};
// Aircraft visible to a user (filtered by aéroclub)
window.aircraftForUser = function(user) {
  if (!user) return window.AIRCRAFT;
  return window.AIRCRAFT.filter(a => a.aeroclubId === user.aeroclubId);
};
// Aerodromes visible to a user (filtered by aéroclub library)
window.aerodromesForUser = function(user) {
  if (!user) return window.AERODROMES;
  return window.AERODROMES.filter(a => !a.aeroclubIds || a.aeroclubIds.includes(user.aeroclubId));
};

// Leg calculations (variant = one of voyage.variants)
window.computeLeg = function(legIdx, variant) {
  const fromIcao = variant.route[legIdx];
  const toIcao = variant.route[legIdx + 1];
  const from = window.adByIcao(fromIcao);
  const to = window.adByIcao(toIcao);
  const distance = window.distNM(from.coord, to.coord);
  const bearing = window.bearingDeg(from.coord, to.coord);
  const perAc = {};
  // Aircraft involved in this voyage = keys of crewsByLeg entries
  const voyageAcIds = Object.keys(variant.crewsByLeg[legIdx] || {});
  const aircraftList = voyageAcIds.map(id => window.acById(id)).filter(Boolean);
  aircraftList.forEach(ac => {
    const m = window.AC_MODELS[ac.model];
    const crew = (variant.crewsByLeg[legIdx] && variant.crewsByLeg[legIdx][ac.id]) || { cdb: null, pax: [] };
    const peopleIds = [crew.cdb, ...crew.pax].filter(Boolean);
    const peopleMass = peopleIds.reduce((s, pid) => {
      const eff = window.personEffective(pid, variant);
      return s + (eff?.weightKg || 0);
    }, 0);
    const bag = (variant.bagsByLeg[legIdx] && variant.bagsByLeg[legIdx][ac.id]) || { count: 0, unitKg: 0 };
    const bagMass = bag.count * bag.unitKg;
    const fuelL = (variant.fuelLoadL[legIdx] && variant.fuelLoadL[legIdx][ac.id]) || 0;
    // Jet-A1 ≈ 0.84 kg/L, AVGAS/MOGAS ≈ 0.72 kg/L
    const fuelDensity = m.fuelType.includes("Jet") ? 0.84 : 0.72;
    const fuelKg = fuelL * fuelDensity;
    const tow = m.massEmptyKg + peopleMass + bagMass + fuelKg;
    const durHr = distance / m.cruiseKt;
    const burnL = durHr * m.burnLh;
    const fuelLeftL = Math.max(0, fuelL - burnL);
    const fuelBurnKg = burnL * fuelDensity;
    const ldw = tow - fuelBurnKg;
    const compatRunway = (to.runways[0]?.lengthM || 0) >= m.minRunwayM;
    const compatFuel = (m.fuelType.includes("Jet") ? to.fuel.includes("Jet-A1") : (to.fuel.includes("100LL") || to.fuel.includes("MOGAS")));
    // Pilot license check (CDB present, authorized for this model)
    const cdb = crew.cdb ? window.personEffective(crew.cdb, variant) : null;
    const cdbOK = cdb ? cdb.authorizedModels.includes(ac.model) : false;
    // Pax authorization check
    const paxOK = crew.pax.every(pid => window.personEffective(pid, variant)?.authorizedModels.includes(ac.model));
    perAc[ac.id] = {
      durHr, durMin: durHr * 60, burnL, fuelLeftL,
      tow, ldw, peopleMass, bagMass, fuelKg, fuelLDestKg: fuelLeftL * fuelDensity,
      mtow: m.mtowKg, mtowExceeded: tow > m.mtowKg,
      mldw: m.mldwKg, mldwExceeded: ldw > m.mldwKg,
      fuelOK: fuelLeftL > (durHr * m.burnLh * 0.25), // reserve 25% (loosely 30min @ cruise)
      fuelReserve: fuelLeftL,
      compatRunway, compatFuel, cdbOK, paxOK,
      crew, peopleIds, bag,
    };
  });
  return { fromIcao, toIcao, from, to, distance, bearing, perAc };
};

window.computeVoyage = function(variant) {
  const legs = variant.route.slice(0, -1).map((_, i) => window.computeLeg(i, variant));
  // Aircraft count in voyage (used for tax multiplication)
  const voyageAcCount = legs[0] ? Object.keys(legs[0].perAc).length : 0;
  // Total flight time = max per leg across aircraft (group flies together; slowest sets pace)
  const flightMin = legs.reduce((s, leg) => {
    const durs = Object.values(leg.perAc).map(p => p.durMin);
    const maxDur = durs.length > 0 ? Math.max(...durs) : 0;
    return s + maxDur;
  }, 0);
  const stopMin = variant.stopMin.reduce((s, x) => s + (x || 0), 0);
  // Taxes total — per aerodrome, landing once + parking at stops
  let taxLandingTotal = 0, taxParkingTotal = 0;
  variant.route.forEach((icao, i) => {
    const ad = window.adByIcao(icao);
    if (!ad) return;
    if (i > 0) taxLandingTotal += (ad.taxLandingEUR || 0) * voyageAcCount;
    if (i > 0 && i < variant.route.length - 1) {
      taxParkingTotal += (ad.taxParkingEUR || 0) * voyageAcCount;
    }
  });
  return {
    legs,
    flightMin, stopMin,
    totalMin: flightMin + stopMin,
    taxLandingTotal, taxParkingTotal,
    taxTotalEUR: taxLandingTotal + taxParkingTotal,
  };
};

// Active variant helper
window.activeVariant = function(voyage) {
  return voyage.variants.find(v => v.id === voyage.activeVariantId) || voyage.variants[0];
};

// === Finance ===
// Per leg, per aircraft, the CDB of that leg pays:
//   - flight time × aircraft hourly rate
//   - + landing tax at destination aerodrome
//   - + parking tax at destination if intermediate stop
window.computeFinance = function(variant) {
  const items = []; // each: { legIdx, acId, personId, hours, hourlyEUR, flightCost, landingTax, parkingTax, total }
  const legs = variant.route.slice(0, -1).map((_, i) => window.computeLeg(i, variant));
  legs.forEach((leg, legIdx) => {
    const isLastLeg = legIdx === legs.length - 1;
    const destTaxLanding = leg.to.taxLandingEUR || 0;
    const destTaxParking = isLastLeg ? 0 : (leg.to.taxParkingEUR || 0);
    Object.keys(leg.perAc).forEach(acId => {
      const ac = window.acById(acId);
      if (!ac) return;
      const m = window.AC_MODELS[ac.model];
      const p = leg.perAc[ac.id];
      const cdb = p.crew.cdb;
      const hours = p.durMin / 60;
      const flightCost = hours * (m.hourlyEUR || 0);
      const total = flightCost + destTaxLanding + destTaxParking;
      items.push({
        legIdx, acId: ac.id, personId: cdb,
        hours, hourlyEUR: m.hourlyEUR || 0,
        flightCost,
        landingTax: destTaxLanding,
        parkingTax: destTaxParking,
        total,
        from: leg.fromIcao, to: leg.toIcao,
        durMin: p.durMin,
      });
    });
  });

  // Aggregate per person
  const byPerson = {};
  items.forEach(it => {
    if (!it.personId) return; // skip if no CDB assigned
    const k = it.personId;
    if (!byPerson[k]) byPerson[k] = { personId: k, total: 0, hours: 0, flightCost: 0, taxesCost: 0, items: [] };
    byPerson[k].total += it.total;
    byPerson[k].hours += it.hours;
    byPerson[k].flightCost += it.flightCost;
    byPerson[k].taxesCost += it.landingTax + it.parkingTax;
    byPerson[k].items.push(it);
  });

  // Aggregate per aircraft
  const byAircraft = {};
  items.forEach(it => {
    if (!byAircraft[it.acId]) byAircraft[it.acId] = { acId: it.acId, total: 0, hours: 0, flightCost: 0, taxesCost: 0 };
    byAircraft[it.acId].total += it.total;
    byAircraft[it.acId].hours += it.hours;
    byAircraft[it.acId].flightCost += it.flightCost;
    byAircraft[it.acId].taxesCost += it.landingTax + it.parkingTax;
  });

  const totals = {
    flightCost: items.reduce((s, it) => s + it.flightCost, 0),
    taxesCost: items.reduce((s, it) => s + it.landingTax + it.parkingTax, 0),
    total: items.reduce((s, it) => s + it.total, 0),
    hours: items.reduce((s, it) => s + it.hours, 0),
    unassignedCost: items.filter(it => !it.personId).reduce((s, it) => s + it.total, 0),
  };

  return { items, byPerson, byAircraft, totals };
};

window.fmtHr = function(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${m.toString().padStart(2,'0')}`;
};
