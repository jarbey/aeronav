// Map Prisma snake_case / camelCase fields to the frontend-expected shape.
// The frontend uses `first`/`last` (from the prototype's data.js convention).
// Prisma uses `firstName`/`lastName`.

type PrismaUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  aeroclubId: string;
  provider: string;
  personId: string | null;
  role: string;
  [key: string]: unknown;
};

type PrismaAircraft = {
  id: string;
  reg: string;
  callsign: string;
  modelId: string;
  aeroclubId: string;
  color: string;
  massEmptyKg: number;
  notes: string | null;
  [key: string]: unknown; // absorbs nested `model` relation
};

type PrismaAircraftModel = {
  id: string;
  aeroclubId: string;
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
  icon: string | null;
  [key: string]: unknown;
};

type PrismaPerson = {
  id: string;
  aeroclubId: string;
  firstName: string;
  lastName: string;
  weightKg: number;
  license: string;
  authorizedModels: string[];
  rolePref: string | null;
  [key: string]: unknown;
};

export function serializeUser(u: PrismaUser) {
  return {
    id: u.id,
    email: u.email,
    first: u.firstName,
    last: u.lastName,
    aeroclubId: u.aeroclubId,
    provider: u.provider,
    personId: u.personId,
    role: u.role,
    ...((u as any).aeroclub ? {
      aeroclub: {
        id: (u as any).aeroclub.id,
        name: (u as any).aeroclub.name,
        code: (u as any).aeroclub.code,
        city: (u as any).aeroclub.city,
        color: (u as any).aeroclub.color,
        base: (u as any).aeroclub.baseIcao,
      },
    } : {}),
  };
}

// Frontend Aircraft.model is the model ID string, not the nested object.
export function serializeAircraft(a: PrismaAircraft) {
  return {
    id: a.id,
    reg: a.reg,
    callsign: a.callsign,
    model: a.modelId,       // frontend expects `model` = the ID string
    aeroclubId: a.aeroclubId,
    color: a.color,
    massEmptyKg: a.massEmptyKg,
    burnLhOverride: a.burnLhOverride ?? null,
    cruiseKtOverride: a.cruiseKtOverride ?? null,
    notes: a.notes ?? '',
  };
}

export function serializeAircraftModel(m: PrismaAircraftModel) {
  return {
    id: m.id,
    aeroclubId: m.aeroclubId,
    label: m.label,
    type: m.type,
    fuelType: m.fuelType,
    seats: m.seats,
    cruiseKt: m.cruiseKt,
    burnLh: m.burnLh,
    fuelCapL: m.fuelCapL,
    mtowKg: m.mtowKg,
    mldwKg: m.mldwKg,
    minRunwayM: m.minRunwayM,
    hourlyEUR: m.hourlyEUR,
    icon: m.icon ?? '',
  };
}

export function serializePerson(p: PrismaPerson) {
  return {
    id: p.id,
    aeroclubId: p.aeroclubId,
    first: p.firstName,
    last: p.lastName,
    weightKg: p.weightKg,
    license: p.license,
    authorizedModels: p.authorizedModels,
    rolePref: p.rolePref ?? 'PAX',
  };
}
