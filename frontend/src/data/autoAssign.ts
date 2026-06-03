/**
 * Automatic crew and fuel assignment for a voyage variant.
 *
 * Constraints enforced:
 *   1. CDB must be authorised for the aircraft model.
 *   2. CDB flight-hours are balanced across legs (fewest-hours-first rotation).
 *   3. MTOW is never exceeded (PAX removed if necessary).
 *   4. Fuel covers the leg + 30 % margin + 30 min VFR reserve.
 *
 * Strategy:
 *   - Pure PAX (non-pilots) are fixed to an aircraft for the whole voyage.
 *   - CDB rotates each leg (pilot with fewest hours gets priority).
 *   - Pilots not flying as CDB on a given leg are added as PAX where seats allow.
 */

import type { Voyage, Variant, Aircraft, PersonEffective, CrewsByLeg, FuelLoadByLeg, Aerodrome } from '../types';
import { acById, personEffective, adByIcao, distNM, AC_MODELS, effectiveFuelCapL } from './mockData';

export interface AutoAssignResult {
  crewsByLeg: CrewsByLeg;
  fuelLoadL: FuelLoadByLeg;
  warnings: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function acModel(ac: Aircraft) { return AC_MODELS[ac.model]; }
function maxPaxSeats(ac: Aircraft) { return Math.max(0, (acModel(ac)?.seats ?? 1) - 1); }
function fuelDensity(ac: Aircraft) {
  const ft = acModel(ac)?.fuelType ?? '';
  return ft.includes('Jet') ? 0.84 : 0.72;
}

/** Rough-compute leg distance (NM), including any waypoints. */
function legDistNM(variant: Variant, legIdx: number, adLookup: (icao: string) => Aerodrome | undefined): number {
  const from = adLookup(variant.route[legIdx]);
  const to   = adLookup(variant.route[legIdx + 1]);
  if (!from || !to) return 0;
  const wps = variant.waypoints?.[legIdx] ?? [];
  const pts: [number, number][] = [from.coord, ...wps, to.coord];
  return pts.slice(0, -1).reduce((s, p, i) => s + distNM(p, pts[i + 1]), 0);
}

/** Leg duration including taxi forfaits (hours). */
function legDurHr(dist: number, ac: Aircraft, variant: Variant, legIdx: number): number {
  const m = acModel(ac);
  if (!m || m.cruiseKt === 0) return 0;
  const taxiOut = variant.taxiOutMin?.[legIdx] ?? 10;
  const taxiIn  = variant.taxiInMin?.[legIdx]  ?? 10;
  return dist / m.cruiseKt + (taxiOut + taxiIn) / 60;
}

// ─── Main function ─────────────────────────────────────────────────────────────

export function autoAssign(
  voyage: Voyage,
  variant: Variant,
  allAerodromes?: Aerodrome[],
): AutoAssignResult {
  const warnings: string[] = [];
  const numLegs = variant.route.length - 1;

  const aircraft = voyage.aircraftIds
    .map(id => acById(id))
    .filter((a): a is Aircraft => !!a && !!acModel(a));

  const people = voyage.peopleIds
    .map(id => personEffective(id, variant))
    .filter((p): p is PersonEffective => !!p);

  if (aircraft.length === 0) {
    warnings.push('Aucun avion valide assigné au voyage.');
    return { crewsByLeg: variant.crewsByLeg, fuelLoadL: variant.fuelLoadL, warnings };
  }
  if (people.length === 0) {
    warnings.push('Aucune personne assignée au voyage.');
    return { crewsByLeg: variant.crewsByLeg, fuelLoadL: variant.fuelLoadL, warnings };
  }

  const adLookup = (icao: string): Aerodrome | undefined =>
    allAerodromes?.find(a => a.icao === icao) ?? adByIcao(icao);

  // ── Pre-compute distances and durations ────────────────────────────────────
  const legDists: number[] = Array.from({ length: numLegs }, (_, i) => legDistNM(variant, i, adLookup));

  // ── Categorise people ──────────────────────────────────────────────────────
  const canFly = (p: PersonEffective, ac: Aircraft) => p.authorizedModels.includes(ac.model);

  const pilots    = people.filter(p => aircraft.some(ac => canFly(p, ac)));
  const purePax   = people.filter(p => !pilots.some(pi => pi.id === p.id));

  if (pilots.length === 0) {
    warnings.push('Aucun pilote qualifié parmi les personnes du voyage.');
    return { crewsByLeg: variant.crewsByLeg, fuelLoadL: variant.fuelLoadL, warnings };
  }

  // ── Assign pure PAX to aircraft (fixed for whole voyage) ─────────────────
  // Round-robin by aircraft, checking seat capacity.
  const acFixedPax: Record<string, string[]> = {};
  aircraft.forEach(ac => { acFixedPax[ac.id] = []; });

  let rrIdx = 0;
  for (const pax of [...purePax].sort((a, b) => b.weightKg - a.weightKg)) {
    for (let t = 0; t < aircraft.length; t++) {
      const ac = aircraft[(rrIdx + t) % aircraft.length];
      if (acFixedPax[ac.id].length < maxPaxSeats(ac)) {
        acFixedPax[ac.id].push(pax.id);
        rrIdx = (aircraft.indexOf(ac) + 1) % aircraft.length;
        break;
      }
    }
  }

  // ── Generate crewsByLeg ────────────────────────────────────────────────────
  // Track accumulated hours per pilot for balancing.
  const pilotHours: Record<string, number> = {};
  pilots.forEach(p => { pilotHours[p.id] = 0; });

  const crewsByLeg: CrewsByLeg = [];

  for (let legIdx = 0; legIdx < numLegs; legIdx++) {
    const legMap: Record<string, { cdb: string | null; pax: string[] }> = {};
    const cdbs = new Set<string>(); // pilots already assigned as CDB this leg

    // Sort aircraft: most constrained first (fewest eligible pilots)
    const acSorted = [...aircraft].sort((a, b) => {
      const ea = pilots.filter(p => canFly(p, a) && !cdbs.has(p.id)).length;
      const eb = pilots.filter(p => canFly(p, b) && !cdbs.has(p.id)).length;
      return ea - eb;
    });

    for (const ac of acSorted) {
      const eligible = pilots
        .filter(p => canFly(p, ac) && !cdbs.has(p.id))
        .sort((a, b) => pilotHours[a.id] - pilotHours[b.id]);

      if (eligible.length === 0) {
        warnings.push(`Aucun CDB disponible pour ${ac.reg} — branche ${legIdx + 1}.`);
        legMap[ac.id] = { cdb: null, pax: [...acFixedPax[ac.id]] };
        continue;
      }

      const cdb = eligible[0];
      cdbs.add(cdb.id);
      pilotHours[cdb.id] += legDurHr(legDists[legIdx], ac, variant, legIdx);
      legMap[ac.id] = { cdb: cdb.id, pax: [...acFixedPax[ac.id]] };
    }

    // Non-CDB pilots → distribute as PAX where seats are available
    for (const pilot of pilots.filter(p => !cdbs.has(p.id))) {
      // Prefer aircraft they can fly (same type familiarity), then others
      const candidates = [...aircraft].sort((a, b) =>
        (canFly(pilot, a) ? 0 : 1) - (canFly(pilot, b) ? 0 : 1));
      for (const ac of candidates) {
        const crew = legMap[ac.id];
        if (crew && crew.pax.length < maxPaxSeats(ac)) {
          crew.pax.push(pilot.id);
          break;
        }
      }
    }

    crewsByLeg.push(legMap);
  }

  // ── Compute fuel (with margin) then check MTOW ─────────────────────────────
  const MARGIN    = 0.30;  // 30 % over required flight fuel
  const RESERVE_H = 0.50;  // 30 min VFR reserve

  const fuelLoadL: FuelLoadByLeg = [];

  for (let legIdx = 0; legIdx < numLegs; legIdx++) {
    const legFuel: Record<string, number> = {};

    for (const ac of aircraft) {
      const m = acModel(ac)!;
      const dist = legDists[legIdx];

      // Minimum fuel including margin + reserve
      const flightH  = legDurHr(dist, ac, variant, legIdx);
      const minFuelL = flightH * m.burnLh * (1 + MARGIN) + RESERVE_H * m.burnLh;

      // Crew weight
      const crew = crewsByLeg[legIdx]?.[ac.id];
      const cdbW = crew?.cdb ? (personEffective(crew.cdb, variant)?.weightKg ?? 0) : 0;
      const paxW = (crew?.pax ?? []).reduce(
        (s, pid) => s + (personEffective(pid, variant)?.weightKg ?? 0), 0);

      // Max fuel that still respects MTOW
      const density = fuelDensity(ac);
      const mtowMarginKg = m.mtowKg - ac.massEmptyKg - cdbW - paxW;
      const maxFuelForMtow = mtowMarginKg / density;

      if (maxFuelForMtow < minFuelL && crew?.pax.length) {
        // Not enough room even before trimming PAX — warn
        warnings.push(
          `${ac.reg} — branche ${legIdx + 1} : MTOW contraint (${m.mtowKg} kg). ` +
          `Vérifiez la charge.`,
        );
      }

      // Final fuel: min_fuel capped by capacity and MTOW headroom
      const cap = effectiveFuelCapL(ac);
      const rawFuel = Math.min(cap, Math.max(minFuelL, Math.min(maxFuelForMtow, cap)));
      // Round to nearest 5 L
      legFuel[ac.id] = Math.max(0, Math.round(rawFuel / 5) * 5);
    }

    // ── MTOW check: trim PAX if needed ──────────────────────────────────────
    for (const ac of aircraft) {
      const m = acModel(ac)!;
      const crew = crewsByLeg[legIdx]?.[ac.id];
      if (!crew) continue;

      const fuelKg = legFuel[ac.id] * fuelDensity(ac);
      const cdbW   = crew.cdb ? (personEffective(crew.cdb, variant)?.weightKg ?? 0) : 0;
      let paxW     = crew.pax.reduce((s, pid) => s + (personEffective(pid, variant)?.weightKg ?? 0), 0);
      let tow      = ac.massEmptyKg + cdbW + paxW + fuelKg;

      if (tow > m.mtowKg) {
        // Sort PAX lightest-first to remove minimum weight
        const sortedPax = [...crew.pax]
          .map(pid => ({ id: pid, w: personEffective(pid, variant)?.weightKg ?? 0 }))
          .sort((a, b) => a.w - b.w);

        const kept: string[] = [...crew.pax];
        for (const p of sortedPax) {
          if (tow <= m.mtowKg) break;
          const idx = kept.indexOf(p.id);
          if (idx >= 0) {
            kept.splice(idx, 1);
            tow -= p.w;
            const name = personEffective(p.id, variant);
            warnings.push(
              `${name ? `${name.first} ${name.last}` : p.id} retiré de ${ac.reg} ` +
              `(branche ${legIdx + 1}) pour respecter le MTOW.`,
            );
          }
        }
        crew.pax = kept;
      }
    }

    fuelLoadL.push(legFuel);
  }

  return { crewsByLeg, fuelLoadL, warnings };
}
