import { describe, it, expect } from 'vitest';
import {
  distNM,
  bearingDeg,
  computeLeg,
  computeFinance,
  type VariantData,
  type ComputeData,
  type AerodromeData,
  type AircraftData,
  type AircraftModelData,
  type PersonData,
} from '../../services/calculations.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const LFRS: AerodromeData = {
  icao: 'LFRS',
  name: 'Nantes Atlantique',
  city: 'Nantes',
  lngLat: [-1.6118, 47.157],
  elevationFt: 90,
  fuel: ['100LL', 'MOGAS'],
  night: true,
  ppr: false,
  atc: 'TWR',
  taxLanding: 20,
  taxParking: 10,
  runways: [{ qfu: '03', lengthM: 2900, surface: 'Béton' }],
};

const LFBI: AerodromeData = {
  icao: 'LFBI',
  name: 'Poitiers-Biard',
  city: 'Poitiers',
  lngLat: [0.3067, 46.5876],
  elevationFt: 423,
  fuel: ['100LL'],
  night: false,
  ppr: false,
  atc: 'AFIS',
  taxLanding: 15,
  taxParking: 0,
  runways: [{ qfu: '05', lengthM: 2100, surface: 'Béton' }],
};


const DR400_MODEL: AircraftModelData = {
  id: 'dr400',
  label: 'DR 400-155',
  type: 'SEP',
  fuelType: '100LL',
  seats: 4,
  cruiseKt: 130,
  burnLh: 28,
  fuelCapL: 110,
  mtowKg: 1000,
  mldwKg: 1000,
  minRunwayM: 800,
  hourlyEUR: 150,
};

const AIRCRAFT_1: AircraftData = {
  id: 'ac1',
  reg: 'F-GXXX',
  callsign: 'XXX',
  modelId: 'dr400',
  color: '#ff0000',
  aeroclubId: 'ac-nantes',
  massEmptyKg: 620,
  model: DR400_MODEL,
};

const PERSON_CDB: PersonData = {
  id: 'p-cdb',
  firstName: 'Alice',
  lastName: 'Pilot',
  weightKg: 75,
  license: 'PPL',
  authorizedModels: ['dr400'],
  rolePref: 'CDB',
};

const PERSON_PAX: PersonData = {
  id: 'p-pax',
  firstName: 'Bob',
  lastName: 'Passenger',
  weightKg: 80,
  license: '',
  authorizedModels: ['dr400'],
  rolePref: 'PAX',
};

function makeComputeData(aerodromes: AerodromeData[], aircraft: AircraftData[], people: PersonData[]): ComputeData {
  return { aerodromes, aircraft, people };
}

function makeVariant(overrides: Partial<VariantData> = {}): VariantData {
  return {
    id: 'v1',
    route: ['LFRS', 'LFBI'],
    stopMin: [0],
    cruiseAltFt: [3500],
    crewsByLeg: [{ ac1: { cdb: 'p-cdb', pax: ['p-pax'] } }],
    fuelLoadL: [{ ac1: 80 }],
    bagsByLeg: [{ ac1: { count: 2, unitKg: 10 } }],
    personOverrides: {},
    ...overrides,
  };
}

// ─── distNM ────────────────────────────────────────────────────────────────────

describe('distNM', () => {
  it('same point → 0', () => {
    expect(distNM([-1.6118, 47.157], [-1.6118, 47.157])).toBe(0);
  });

  it('LFRS → LFBI ≈ 86 NM (±5 NM)', () => {
    const d = distNM([-1.6118, 47.157], [0.3067, 46.5876]);
    expect(d).toBeGreaterThan(81);
    expect(d).toBeLessThan(91);
  });

  it('LFRS → LFKO ≈ 564 NM (±10 NM)', () => {
    const d = distNM([-1.6118, 47.157], [8.889, 41.505]);
    expect(d).toBeGreaterThan(554);
    expect(d).toBeLessThan(574);
  });
});

// ─── bearingDeg ────────────────────────────────────────────────────────────────

describe('bearingDeg', () => {
  it('due east (same lat, higher lng) → ≈ 90°', () => {
    const b = bearingDeg([0, 45], [10, 45]);
    expect(b).toBeGreaterThan(85);
    expect(b).toBeLessThan(95);
  });

  it('LFRS → LFBI → ≈ 113° (±10°)', () => {
    const b = bearingDeg([-1.6118, 47.157], [0.3067, 46.5876]);
    expect(b).toBeGreaterThan(103);
    expect(b).toBeLessThan(123);
  });
});

// ─── computeLeg ────────────────────────────────────────────────────────────────

describe('computeLeg', () => {
  const data = makeComputeData([LFRS, LFBI], [AIRCRAFT_1], [PERSON_CDB, PERSON_PAX]);
  const variant = makeVariant();

  it('distance > 0', () => {
    const result = computeLeg(0, variant, data);
    expect(result.distance).toBeGreaterThan(0);
  });

  it('fuelBurn > 0', () => {
    const result = computeLeg(0, variant, data);
    expect(result.perAc['ac1'].burnL).toBeGreaterThan(0);
  });

  it('TOW = massEmpty + peopleMass + baggageMass + fuelMass', () => {
    const result = computeLeg(0, variant, data);
    const p = result.perAc['ac1'];
    // fuel density 0.72 for AVGAS/100LL
    const expectedTow = AIRCRAFT_1.massEmptyKg + p.peopleMass + p.bagMass + p.fuelKg;
    expect(p.tow).toBeCloseTo(expectedTow, 5);
  });

  it('alerts.mtowExceeded === true when TOW > MTOW', () => {
    // Create an overloaded variant: very heavy people + lots of fuel
    const heavyVariant = makeVariant({
      crewsByLeg: [{
        ac1: {
          cdb: 'p-cdb',
          pax: ['p-pax', 'p-pax', 'p-pax'], // repeat to overload
        },
      }],
      fuelLoadL: [{ ac1: 110 }],
      bagsByLeg: [{ ac1: { count: 10, unitKg: 50 } }],
    });
    const result = computeLeg(0, heavyVariant, data);
    expect(result.perAc['ac1'].mtowExceeded).toBe(true);
  });

  it('mtowExceeded === false for normal load', () => {
    const result = computeLeg(0, variant, data);
    expect(result.perAc['ac1'].mtowExceeded).toBe(false);
  });
});

// ─── computeFinance ────────────────────────────────────────────────────────────

describe('computeFinance', () => {
  it('with 1 leg and 1 CDB assigned: CDB gets charged flightCost + taxes', () => {
    const data = makeComputeData([LFRS, LFBI], [AIRCRAFT_1], [PERSON_CDB, PERSON_PAX]);
    const variant = makeVariant();
    const finance = computeFinance(variant, data);

    expect(finance.items).toHaveLength(1);
    expect(finance.items[0].personId).toBe('p-cdb');
    expect(finance.items[0].flightCost).toBeGreaterThan(0);
    expect(finance.totals.unassignedCost).toBe(0);
    expect(finance.byPerson['p-cdb']).toBeDefined();
    expect(finance.byPerson['p-cdb'].total).toBeGreaterThan(0);
  });

  it('with 1 leg and no CDB: unassignedCost > 0', () => {
    const data = makeComputeData([LFRS, LFBI], [AIRCRAFT_1], [PERSON_CDB, PERSON_PAX]);
    const noCdbVariant = makeVariant({
      crewsByLeg: [{ ac1: { cdb: null, pax: ['p-pax'] } }],
    });
    const finance = computeFinance(noCdbVariant, data);

    expect(finance.totals.unassignedCost).toBeGreaterThan(0);
    expect(Object.keys(finance.byPerson)).toHaveLength(0);
  });

  it('ONLY the CDB is billed (PAX pay nothing)', () => {
    const data = makeComputeData([LFRS, LFBI], [AIRCRAFT_1], [PERSON_CDB, PERSON_PAX]);
    const variant = makeVariant();
    const finance = computeFinance(variant, data);

    // PAX person should have no billing
    expect(finance.byPerson['p-pax']).toBeUndefined();
    // CDB has the full bill
    expect(Object.keys(finance.byPerson)).toEqual(['p-cdb']);
  });
});
