/**
 * AeroNav — Calculation engine (TypeScript port of prototype/data.js)
 * All formulas are identical to the prototype. No wind correction (TAS=GS).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const R_NM = 3440.065; // Earth radius in nautical miles
const FUEL_DENSITY_JET = 0.84; // kg/L  — Jet-A1
const FUEL_DENSITY_AVGAS = 0.72; // kg/L  — 100LL / MOGAS

// ─── Input types (mirror Prisma JSON shapes) ─────────────────────────────────

export interface AerodromeData {
  icao: string;
  name: string;
  city: string;
  lngLat: number[];            // [lng, lat]
  elevationFt: number;
  fuel: string[];
  night: boolean;
  ppr: boolean;
  atc: string;
  taxLanding: number;
  taxParking: number;
  notes?: string | null;
  runways: RunwayData[];
}

export interface RunwayData {
  qfu: string;
  lengthM: number;
  surface: string;
}

export interface AircraftModelData {
  id: string;
  label: string;
  type: string;
  fuelType: string;
  seats: number;
  cruiseKt: number;
  burnLh: number;
  fuelCapL: number;
  mtowKg: number;
  mldwKg: number;
  minRunwayM: number;
  hourlyEUR: number;
  icon?: string | null;
}

export interface AircraftData {
  id: string;
  reg: string;
  modelId: string;
  color: string;
  callsign: string;
  aeroclubId: string;
  massEmptyKg: number;
  notes?: string | null;
  model: AircraftModelData;
}

export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  weightKg: number;
  license: string;
  authorizedModels: string[];
  rolePref?: string | null;
}

export interface CrewEntry {
  cdb: string | null;
  pax: string[];
}

export interface BagEntry {
  count: number;
  unitKg: number;
}

export interface VariantData {
  id: string;
  route: string[];
  stopMin: (number | null)[];
  cruiseAltFt: (number | null)[];
  crewsByLeg: Record<string, CrewEntry>[];
  fuelLoadL: Record<string, number>[];
  bagsByLeg: Record<string, BagEntry>[];
  personOverrides: Record<string, { weightKg?: number; authorizedModels?: string[] }>;
}

export interface ComputeData {
  aerodromes: AerodromeData[];
  aircraft: AircraftData[];
  people: PersonData[];
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface EffectivePerson extends PersonData {
  _hasOverride: boolean;
  _override: { weightKg?: number; authorizedModels?: string[] };
}

export interface PerAcLegResult {
  durHr: number;
  durMin: number;
  burnL: number;
  fuelLeftL: number;
  tow: number;
  ldw: number;
  peopleMass: number;
  bagMass: number;
  fuelKg: number;
  fuelLDestKg: number;
  mtow: number;
  mtowExceeded: boolean;
  mldw: number;
  mldwExceeded: boolean;
  fuelOK: boolean;
  fuelReserve: number;
  compatRunway: boolean;
  compatFuel: boolean;
  cdbOK: boolean;
  paxOK: boolean;
  crew: CrewEntry;
  peopleIds: string[];
  bag: BagEntry;
}

export interface LegResult {
  fromIcao: string;
  toIcao: string;
  from: AerodromeData;
  to: AerodromeData;
  distance: number;
  bearing: number;
  perAc: Record<string, PerAcLegResult>;
}

export interface VoyageResult {
  legs: LegResult[];
  flightMin: number;
  stopMin: number;
  totalMin: number;
  taxLandingTotal: number;
  taxParkingTotal: number;
  taxTotalEUR: number;
}

export interface FinanceItem {
  legIdx: number;
  acId: string;
  personId: string | null;
  hours: number;
  hourlyEUR: number;
  flightCost: number;
  landingTax: number;
  parkingTax: number;
  total: number;
  from: string;
  to: string;
  durMin: number;
}

export interface PersonFinance {
  personId: string;
  total: number;
  hours: number;
  flightCost: number;
  taxesCost: number;
  items: FinanceItem[];
}

export interface AircraftFinance {
  acId: string;
  total: number;
  hours: number;
  flightCost: number;
  taxesCost: number;
}

export interface FinanceTotals {
  flightCost: number;
  taxesCost: number;
  total: number;
  hours: number;
  unassignedCost: number;
}

export interface FinanceResult {
  items: FinanceItem[];
  byPerson: Record<string, PersonFinance>;
  byAircraft: Record<string, AircraftFinance>;
  totals: FinanceTotals;
}

// ─── Geo helpers ─────────────────────────────────────────────────────────────

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Haversine great-circle distance in nautical miles.
 * Coordinates: [lng, lat]
 */
export function distNM(c1: [number, number], c2: [number, number]): number {
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.sqrt(a));
}

/**
 * Initial true bearing in degrees (0–360).
 * Coordinates: [lng, lat]
 */
export function bearingDeg(c1: [number, number], c2: [number, number]): number {
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lng1);
  const λ2 = toRad(lng2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return ((y === 0 && x === 0) ? 0 : (Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Lookup helpers ──────────────────────────────────────────────────────────

function adByIcao(icao: string, data: ComputeData): AerodromeData | undefined {
  return data.aerodromes.find((a) => a.icao === icao);
}

function acById(id: string, data: ComputeData): AircraftData | undefined {
  return data.aircraft.find((a) => a.id === id);
}

function personById(id: string, data: ComputeData): PersonData | undefined {
  return data.people.find((p) => p.id === id);
}

/**
 * Effective person attributes: applies per-voyage overrides on top of base profile.
 */
export function personEffective(personId: string, variant: VariantData, data: ComputeData): EffectivePerson | null {
  const p = personById(personId, data);
  if (!p) return null;
  const overrides = (variant.personOverrides && variant.personOverrides[personId]) || {};
  return {
    ...p,
    weightKg: overrides.weightKg != null ? overrides.weightKg : p.weightKg,
    authorizedModels: overrides.authorizedModels ?? p.authorizedModels,
    _hasOverride: !!(overrides.weightKg != null || overrides.authorizedModels),
    _override: overrides,
  };
}

// ─── computeLeg ──────────────────────────────────────────────────────────────

/**
 * Compute all per-aircraft metrics for a single leg.
 */
export function computeLeg(legIdx: number, variant: VariantData, data: ComputeData): LegResult {
  const fromIcao = variant.route[legIdx];
  const toIcao = variant.route[legIdx + 1];
  const from = adByIcao(fromIcao, data);
  const to = adByIcao(toIcao, data);

  if (!from) throw new Error(`Unknown aerodrome: ${fromIcao}`);
  if (!to) throw new Error(`Unknown aerodrome: ${toIcao}`);

  const distance = distNM(
    [from.lngLat[0], from.lngLat[1]],
    [to.lngLat[0], to.lngLat[1]]
  );
  const bearing = bearingDeg(
    [from.lngLat[0], from.lngLat[1]],
    [to.lngLat[0], to.lngLat[1]]
  );

  const voyageAcIds = Object.keys(variant.crewsByLeg[legIdx] || {});
  const perAc: Record<string, PerAcLegResult> = {};

  for (const acId of voyageAcIds) {
    const ac = acById(acId, data);
    if (!ac) continue;
    const m = ac.model;

    const crew: CrewEntry = (variant.crewsByLeg[legIdx] && variant.crewsByLeg[legIdx][acId]) || {
      cdb: null,
      pax: [],
    };
    const peopleIds = [crew.cdb, ...crew.pax].filter((id): id is string => id !== null);

    const peopleMass = peopleIds.reduce((sum, pid) => {
      const eff = personEffective(pid, variant, data);
      return sum + (eff?.weightKg ?? 0);
    }, 0);

    const bag: BagEntry = (variant.bagsByLeg[legIdx] && variant.bagsByLeg[legIdx][acId]) || {
      count: 0,
      unitKg: 0,
    };
    const bagMass = bag.count * bag.unitKg;

    const fuelL = (variant.fuelLoadL[legIdx] && variant.fuelLoadL[legIdx][acId]) || 0;
    const fuelDensity = m.fuelType.includes("Jet") ? FUEL_DENSITY_JET : FUEL_DENSITY_AVGAS;
    const fuelKg = fuelL * fuelDensity;

    const tow = ac.massEmptyKg + peopleMass + bagMass + fuelKg;
    const durHr = distance / m.cruiseKt;
    const burnL = durHr * m.burnLh;
    const fuelLeftL = Math.max(0, fuelL - burnL);
    const fuelBurnKg = burnL * fuelDensity;
    const ldw = tow - fuelBurnKg;

    const compatRunway = (to.runways[0]?.lengthM ?? 0) >= m.minRunwayM;
    const compatFuel = m.fuelType.includes("Jet")
      ? to.fuel.includes("Jet-A1")
      : to.fuel.includes("100LL") || to.fuel.includes("MOGAS");

    const cdbEff = crew.cdb ? personEffective(crew.cdb, variant, data) : null;
    const cdbOK = cdbEff ? cdbEff.authorizedModels.includes(ac.modelId) : false;
    const paxOK = crew.pax.every((pid) => {
      const eff = personEffective(pid, variant, data);
      return eff ? eff.authorizedModels.includes(ac.modelId) : false;
    });

    perAc[acId] = {
      durHr,
      durMin: durHr * 60,
      burnL,
      fuelLeftL,
      tow,
      ldw,
      peopleMass,
      bagMass,
      fuelKg,
      fuelLDestKg: fuelLeftL * fuelDensity,
      mtow: m.mtowKg,
      mtowExceeded: tow > m.mtowKg,
      mldw: m.mldwKg,
      mldwExceeded: ldw > m.mldwKg,
      fuelOK: fuelLeftL > durHr * m.burnLh * 0.25,
      fuelReserve: fuelLeftL,
      compatRunway,
      compatFuel,
      cdbOK,
      paxOK,
      crew,
      peopleIds,
      bag,
    };
  }

  return { fromIcao, toIcao, from, to, distance, bearing, perAc };
}

// ─── computeVoyage ───────────────────────────────────────────────────────────

/**
 * Roll-up all legs: group flight time, stop time, and taxes.
 */
export function computeVoyage(variant: VariantData, data: ComputeData): VoyageResult {
  const legs = variant.route
    .slice(0, -1)
    .map((_, i) => computeLeg(i, variant, data));

  const voyageAcCount = legs[0] ? Object.keys(legs[0].perAc).length : 0;

  // Total flight time = max per leg (slowest aircraft sets the pace)
  const flightMin = legs.reduce((sum, leg) => {
    const durs = Object.values(leg.perAc).map((p) => p.durMin);
    const maxDur = durs.length > 0 ? Math.max(...durs) : 0;
    return sum + maxDur;
  }, 0);

  const stopMin = variant.stopMin.reduce<number>((s, x) => s + (x ?? 0), 0);

  let taxLandingTotal = 0;
  let taxParkingTotal = 0;

  variant.route.forEach((icao, i) => {
    const ad = adByIcao(icao, data);
    if (!ad) return;
    if (i > 0) taxLandingTotal += (ad.taxLanding ?? 0) * voyageAcCount;
    if (i > 0 && i < variant.route.length - 1) {
      taxParkingTotal += (ad.taxParking ?? 0) * voyageAcCount;
    }
  });

  return {
    legs,
    flightMin,
    stopMin,
    totalMin: flightMin + stopMin,
    taxLandingTotal,
    taxParkingTotal,
    taxTotalEUR: taxLandingTotal + taxParkingTotal,
  };
}

// ─── computeFinance ──────────────────────────────────────────────────────────

/**
 * CDB-only billing: each leg's cost is charged to the aircraft CDB for that leg.
 */
export function computeFinance(variant: VariantData, data: ComputeData): FinanceResult {
  const legs = variant.route
    .slice(0, -1)
    .map((_, i) => computeLeg(i, variant, data));

  const items: FinanceItem[] = [];

  legs.forEach((leg, legIdx) => {
    const isLastLeg = legIdx === legs.length - 1;
    const destTaxLanding = leg.to.taxLanding ?? 0;
    const destTaxParking = isLastLeg ? 0 : (leg.to.taxParking ?? 0);

    for (const acId of Object.keys(leg.perAc)) {
      const ac = acById(acId, data);
      if (!ac) continue;
      const m = ac.model;
      const p = leg.perAc[acId];
      const cdb = p.crew.cdb;
      const hours = p.durMin / 60;
      const flightCost = hours * (m.hourlyEUR ?? 0);
      const total = flightCost + destTaxLanding + destTaxParking;

      items.push({
        legIdx,
        acId: ac.id,
        personId: cdb,
        hours,
        hourlyEUR: m.hourlyEUR ?? 0,
        flightCost,
        landingTax: destTaxLanding,
        parkingTax: destTaxParking,
        total,
        from: leg.fromIcao,
        to: leg.toIcao,
        durMin: p.durMin,
      });
    }
  });

  // Aggregate per person (only assigned CDBs)
  const byPerson: Record<string, PersonFinance> = {};
  for (const it of items) {
    if (!it.personId) continue;
    const k = it.personId;
    if (!byPerson[k]) {
      byPerson[k] = { personId: k, total: 0, hours: 0, flightCost: 0, taxesCost: 0, items: [] };
    }
    byPerson[k].total += it.total;
    byPerson[k].hours += it.hours;
    byPerson[k].flightCost += it.flightCost;
    byPerson[k].taxesCost += it.landingTax + it.parkingTax;
    byPerson[k].items.push(it);
  }

  // Aggregate per aircraft
  const byAircraft: Record<string, AircraftFinance> = {};
  for (const it of items) {
    if (!byAircraft[it.acId]) {
      byAircraft[it.acId] = { acId: it.acId, total: 0, hours: 0, flightCost: 0, taxesCost: 0 };
    }
    byAircraft[it.acId].total += it.total;
    byAircraft[it.acId].hours += it.hours;
    byAircraft[it.acId].flightCost += it.flightCost;
    byAircraft[it.acId].taxesCost += it.landingTax + it.parkingTax;
  }

  const totals: FinanceTotals = {
    flightCost: items.reduce((s, it) => s + it.flightCost, 0),
    taxesCost: items.reduce((s, it) => s + it.landingTax + it.parkingTax, 0),
    total: items.reduce((s, it) => s + it.total, 0),
    hours: items.reduce((s, it) => s + it.hours, 0),
    unassignedCost: items
      .filter((it) => !it.personId)
      .reduce((s, it) => s + it.total, 0),
  };

  return { items, byPerson, byAircraft, totals };
}

// ─── Finance helpers ─────────────────────────────────────────────────────────

export interface PilotDelta {
  personId: string;
  total: number;
  delta: number;
  deltaPct: number;
}

/**
 * Compute per-pilot deviation from the average cost.
 */
export function computePilotDeltas(finance: FinanceResult): PilotDelta[] {
  const pilots = Object.values(finance.byPerson);
  const nbPilots = pilots.length;
  if (nbPilots === 0) return [];

  const avgPerPilot = (finance.totals.total - finance.totals.unassignedCost) / nbPilots;

  return pilots.map((p) => {
    const delta = p.total - avgPerPilot;
    const deltaPct = avgPerPilot !== 0 ? (delta / avgPerPilot) * 100 : 0;
    return { personId: p.personId, total: p.total, delta, deltaPct };
  });
}
