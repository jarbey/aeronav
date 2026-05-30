// AeroNav — Mock data (mirrors data.js for frontend dev without a backend)
import type {
  Aeroclub, User, Person, AircraftModel, Aircraft, Aerodrome,
  Voyage, Variant, VoyageResult, FinanceResult, FinanceItem,
  PersonBill, AircraftBill, PersonEffective, PersonOverride,
  LegResult, AircraftLegResult, CrewAssignment,
} from '../types';

// --- Aéroclubs ---
export const AEROCLUBS: Aeroclub[] = [];

// --- Users ---
export const USERS: User[] = [];

// --- Aircraft models ---
export const AC_MODELS: Record<string, AircraftModel> = {};

// --- Fleet ---
export const AIRCRAFT: Aircraft[] = [];

// --- People ---
export const PEOPLE: Person[] = [];

// --- Aerodromes ---
export const AERODROMES: Aerodrome[] = [];

// --- Helper functions ---
export function adByIcao(icao: string): Aerodrome | undefined {
  return AERODROMES.find(a => a.icao === icao);
}
export function personById(id: string): Person | undefined {
  return PEOPLE.find(p => p.id === id);
}
export function acById(id: string): Aircraft | undefined {
  return AIRCRAFT.find(a => a.id === id);
}
export function userById(id: string): User | undefined {
  return USERS.find(u => u.id === id);
}
export function aeroclubById(id: string): Aeroclub | undefined {
  return AEROCLUBS.find(c => c.id === id);
}
export function userDisplayName(u: User): string {
  return u ? `${u.first} ${u.last}` : '—';
}
export function userInitials(u: User): string {
  return u ? (u.first[0] + u.last[0]).toUpperCase() : '??';
}
export function userByEmail(email: string): User | undefined {
  const e = (email || '').trim().toLowerCase();
  if (!e) return undefined;
  return USERS.find(u => u.email.toLowerCase() === e);
}
export function userForPerson(personId: string): User | undefined {
  return USERS.find(u => u.personId === personId);
}
export function personEffective(personId: string, variant?: Variant): PersonEffective | null {
  const p = personById(personId);
  if (!p) return null;
  const overrides = (variant?.personOverrides?.[personId]) || {};
  return {
    ...p,
    weightKg: overrides.weightKg != null ? overrides.weightKg : p.weightKg,
    authorizedModels: overrides.authorizedModels || p.authorizedModels,
    _hasOverride: !!(overrides.weightKg != null || overrides.authorizedModels),
    _override: overrides,
  };
}
export function voyagesForUser(userId: string): Voyage[] {
  return VOYAGES.filter(v => v.ownerId === userId || (v.sharedWith || []).includes(userId));
}
export function aircraftForUser(user: User | null): Aircraft[] {
  if (!user) return AIRCRAFT;
  return AIRCRAFT.filter(a => a.aeroclubId === user.aeroclubId);
}
export function aerodromesForUser(user: User | null): Aerodrome[] {
  if (!user) return AERODROMES;
  return AERODROMES;
}
export function activeVariant(voyage: Voyage): Variant {
  return voyage.variants.find(v => v.id === voyage.activeVariantId) || voyage.variants[0];
}

// --- Navigation helpers ---
export function distNM(c1: [number, number], c2: [number, number]): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const R = 3440.065;
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function bearingDeg(c1: [number, number], c2: [number, number]): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lng1), λ2 = toRad(lng2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2 - λ1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function fmtHr(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

// --- Computations ---

export function computeLeg(legIdx: number, variant: Variant, voyageAircraftIds: string[] = [], allAerodromes?: Aerodrome[]): LegResult {
  const fromIcao = variant.route[legIdx];
  const toIcao = variant.route[legIdx + 1];
  const lookup = (icao: string) => allAerodromes?.find(a => a.icao === icao) ?? adByIcao(icao);
  const from = lookup(fromIcao)!;
  const to = lookup(toIcao)!;
  const legWaypoints: [number, number][] = variant.waypoints?.[legIdx] ?? [];
  const allPoints: [number, number][] = [from.coord, ...legWaypoints, to.coord];
  const distance = allPoints.slice(0, -1).reduce((sum, p, i) => sum + distNM(p, allPoints[i + 1]), 0);
  const bearing = bearingDeg(from.coord, to.coord);
  const perAc: Record<string, AircraftLegResult> = {};
  const crewsByLeg = variant.crewsByLeg || [];
  const fuelLoadL = variant.fuelLoadL || [];
  const bagsByLeg = variant.bagsByLeg || [];
  const fromCrews = Object.keys(crewsByLeg[legIdx] || {});
  // Union: all voyage aircraft + any in crewsByLeg (deduplicated)
  const allAcIds = [...new Set([...voyageAircraftIds, ...fromCrews])];
  const aircraftList = allAcIds.map(id => acById(id)).filter(Boolean) as Aircraft[];
  aircraftList.forEach(ac => {
    const m = AC_MODELS[ac.model];
    const crew: CrewAssignment = (crewsByLeg[legIdx] && crewsByLeg[legIdx][ac.id]) || { cdb: null, pax: [] };
    const peopleIds = [crew.cdb, ...crew.pax].filter(Boolean) as string[];
    const peopleMass = peopleIds.reduce((s, pid) => {
      const eff = personEffective(pid, variant);
      return s + (eff?.weightKg || 0);
    }, 0);
    const bag = (bagsByLeg[legIdx] && bagsByLeg[legIdx][ac.id]) || { count: 0, unitKg: 0 };
    const bagMass = bag.count * bag.unitKg;
    const fuelL = (fuelLoadL[legIdx] && fuelLoadL[legIdx][ac.id]) || 0;
    const fuelDensity = m.fuelType.includes('Jet') ? 0.84 : 0.72;
    const fuelKg = fuelL * fuelDensity;
    const tow = ac.massEmptyKg + peopleMass + bagMass + fuelKg;
    const cruiseHr = distance / m.cruiseKt;
    const taxiOut = variant.taxiOutMin?.[legIdx] ?? 10;
    const taxiIn = variant.taxiInMin?.[legIdx] ?? 10;
    const durMin = cruiseHr * 60 + taxiOut + taxiIn;
    const durHr = durMin / 60;
    const burnL = durHr * m.burnLh;
    const fuelLeftL = Math.max(0, fuelL - burnL);
    const fuelBurnKg = burnL * fuelDensity;
    const ldw = tow - fuelBurnKg;
    const compatRunway = (to.runways[0]?.lengthM || 0) >= m.minRunwayM;
    const compatFuel = m.fuelType.includes('Jet') ? to.fuel.includes('Jet-A1') : (to.fuel.includes('100LL') || to.fuel.includes('MOGAS'));
    const cdbEff = crew.cdb ? personEffective(crew.cdb, variant) : null;
    const cdbOK = cdbEff ? cdbEff.authorizedModels.includes(ac.model) : false;
    // PAX require no aircraft qualification — passengers can fly on any aircraft
    const paxOK = true;
    perAc[ac.id] = {
      durHr, durMin, burnL, fuelLeftL,
      tow, ldw, peopleMass, bagMass, fuelKg, fuelLDestKg: fuelLeftL * fuelDensity,
      mtow: m.mtowKg, mtowExceeded: tow > m.mtowKg,
      mldw: m.mldwKg, mldwExceeded: ldw > m.mldwKg,
      fuelOK: (fuelLeftL / m.burnLh * 60) >= 30,
      fuelReserve: fuelLeftL,
      compatRunway, compatFuel, cdbOK, paxOK,
      crew, peopleIds, bag,
    };
  });
  return { fromIcao, toIcao, from, to, distance, bearing, perAc };
}

export function computeVoyage(variant: Variant, voyageAircraftIds: string[] = [], allAerodromes?: Aerodrome[]): VoyageResult {
  const lookup = (icao: string) => allAerodromes?.find(a => a.icao === icao) ?? adByIcao(icao);
  const legs = variant.route.slice(0, -1)
    .map((icao, i) => (lookup(icao) && lookup(variant.route[i + 1]))
      ? computeLeg(i, variant, voyageAircraftIds, allAerodromes)
      : null)
    .filter((l): l is LegResult => l !== null);
  const voyageAcCount = legs[0] ? Object.keys(legs[0].perAc).length : 0;
  const flightMin = legs.reduce((s, leg) => {
    const durs = Object.values(leg.perAc).map(p => p.durMin);
    const maxDur = durs.length > 0 ? Math.max(...durs) : 0;
    return s + maxDur;
  }, 0);
  const stopMin = (variant.stopMin || []).reduce((s: number, x) => s + (x || 0), 0);
  let taxLandingTotal = 0, taxParkingTotal = 0;
  variant.route.forEach((icao, i) => {
    const ad = lookup(icao);
    if (!ad) return;
    if (i > 0) taxLandingTotal += (ad.taxLandingEUR || 0) * voyageAcCount;
    if (i > 0 && i < variant.route.length - 1) {
      taxParkingTotal += (ad.taxParkingEUR || 0) * voyageAcCount;
    }
  });
  return { legs, flightMin, stopMin, totalMin: flightMin + stopMin, taxLandingTotal, taxParkingTotal, taxTotalEUR: taxLandingTotal + taxParkingTotal };
}

export function computeFinance(variant: Variant, voyageAircraftIds: string[] = [], allAerodromes?: Aerodrome[]): FinanceResult {
  const items: FinanceItem[] = [];
  const lookup = (icao: string) => allAerodromes?.find(a => a.icao === icao) ?? adByIcao(icao);
  const legs = variant.route.slice(0, -1)
    .map((icao, i) => (lookup(icao) && lookup(variant.route[i + 1]))
      ? computeLeg(i, variant, voyageAircraftIds, allAerodromes)
      : null)
    .filter((l): l is LegResult => l !== null);
  legs.forEach((leg, legIdx) => {
    const isLastLeg = legIdx === legs.length - 1;
    const destTaxLanding = leg.to.taxLandingEUR || 0;
    const destTaxParking = isLastLeg ? 0 : (leg.to.taxParkingEUR || 0);
    Object.keys(leg.perAc).forEach(acId => {
      const ac = acById(acId);
      if (!ac) return;
      const m = AC_MODELS[ac.model];
      const p = leg.perAc[ac.id];
      const cdb = p.crew.cdb;
      const hours = p.durMin / 60;
      const flightCost = hours * (m.hourlyEUR || 0);
      const total = flightCost + destTaxLanding + destTaxParking;
      items.push({
        legIdx, acId: ac.id, personId: cdb,
        hours, hourlyEUR: m.hourlyEUR || 0, flightCost,
        landingTax: destTaxLanding, parkingTax: destTaxParking, total,
        from: leg.fromIcao, to: leg.toIcao, durMin: p.durMin,
      });
    });
  });
  const byPerson: Record<string, PersonBill> = {};
  items.forEach(it => {
    if (!it.personId) return;
    const k = it.personId;
    if (!byPerson[k]) byPerson[k] = { personId: k, total: 0, hours: 0, flightCost: 0, taxesCost: 0, items: [] };
    byPerson[k].total += it.total;
    byPerson[k].hours += it.hours;
    byPerson[k].flightCost += it.flightCost;
    byPerson[k].taxesCost += it.landingTax + it.parkingTax;
    byPerson[k].items.push(it);
  });
  const byAircraft: Record<string, AircraftBill> = {};
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
}

// --- Voyages ---
export const VOYAGES: Voyage[] = [];
