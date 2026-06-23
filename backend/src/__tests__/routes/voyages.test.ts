import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    voyage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    variant: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    aerodrome: {
      findMany: vi.fn(),
    },
    aircraft: {
      findMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '../../prisma/client.js';
import { buildApp } from '../helpers/buildApp.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_AEROCLUB = {
  id: 'ac-nantes',
  name: 'ACNA',
  code: 'ACNA',
  city: 'Nantes',
  color: '#1b5fa8',
  baseIcao: 'LFRS',
};

const FAKE_USER = {
  id: 'u1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  aeroclubId: 'ac-nantes',
  provider: 'local',
  personId: null,
  role: 'Pilote',
  createdAt: new Date('2024-01-01'),
  aeroclub: FAKE_AEROCLUB,
};

const FAKE_VARIANT = {
  id: 'var1',
  voyageId: 'voy1',
  label: 'Plan A',
  weather: '',
  tag: 'draft',
  route: ['LFRS', 'LFBI'],
  stopMin: [0],
  cruiseAltFt: [3500],
  crewsByLeg: [{ ac1: { cdb: 'p-cdb', pax: [] } }],
  fuelLoadL: [{ ac1: 80 }],
  bagsByLeg: [{ ac1: { count: 0, unitKg: 0 } }],
  personOverrides: {},
};

const FAKE_VOYAGE = {
  id: 'voy1',
  title: 'Test Voyage',
  date: new Date('2024-07-01'),
  aeroclubId: 'ac-nantes',
  ownerId: 'u1',
  sharedWith: [],
  status: 'draft',
  activeVariantId: 'var1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  variants: [FAKE_VARIANT],
  owner: { id: 'u1', firstName: 'Test', lastName: 'User' },
};

// Compute fixtures
const FAKE_AERODROME_LFRS = {
  id: 'ad1',
  icao: 'LFRS',
  name: 'Nantes Atlantique',
  city: 'Nantes',
  lngLat: [-1.6118, 47.157],
  elevationFt: 90,
  fuel: ['100LL'],
  night: true,
  ppr: false,
  atc: 'TWR',
  taxLanding: 20,
  taxParking: 10,
  notes: null,
  aeroclubIds: ['ac-nantes'],
  runways: [{ id: 'r1', aerodromeId: 'ad1', qfu: '03', lengthM: 2900, surface: 'Béton' }],
};

const FAKE_AERODROME_LFBI = {
  id: 'ad2',
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
  notes: null,
  aeroclubIds: ['ac-nantes'],
  runways: [{ id: 'r2', aerodromeId: 'ad2', qfu: '05', lengthM: 2100, surface: 'Béton' }],
};

const FAKE_AIRCRAFT_MODEL = {
  id: 'dr400',
  aeroclubId: 'ac-nantes',
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
  icon: null,
};

const FAKE_AIRCRAFT = {
  id: 'ac1',
  reg: 'F-GXXX',
  callsign: 'XXX',
  modelId: 'dr400',
  aeroclubId: 'ac-nantes',
  color: '#ff0000',
  massEmptyKg: 620,
  notes: null,
  model: FAKE_AIRCRAFT_MODEL,
};

const FAKE_PERSON = {
  id: 'p-cdb',
  aeroclubId: 'ac-nantes',
  firstName: 'Alice',
  lastName: 'Pilot',
  weightKg: 75,
  license: 'PPL',
  authorizedModels: ['dr400'],
  rolePref: 'CDB',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function makeAuthHeader(app: Awaited<ReturnType<typeof buildApp>>) {
  const token = app.jwt.sign(
    { id: 'u1', email: 'test@test.com', aeroclubId: 'ac-nantes' },
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
}

// ─── GET /api/voyages ─────────────────────────────────────────────────────────

describe('GET /api/voyages', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 200, list owned + shared', async () => {
    vi.mocked(prisma.voyage.findMany).mockResolvedValue([FAKE_VOYAGE] as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/voyages',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].title).toBe('Test Voyage');
  });
});

// ─── POST /api/voyages ────────────────────────────────────────────────────────

describe('POST /api/voyages', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 201', async () => {
    vi.mocked(prisma.voyage.create).mockResolvedValue(FAKE_VOYAGE as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/voyages',
      headers: { Authorization: authHeader },
      payload: { title: 'Test Voyage', date: '2024-07-01' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe('Test Voyage');
  });
});

// ─── GET /api/voyages/:id ─────────────────────────────────────────────────────

describe('GET /api/voyages/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 200', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/voyages/voy1',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe('voy1');
  });

  it('not found → 404', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: '/api/voyages/nonexistent',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ─── PATCH /api/voyages/:id ───────────────────────────────────────────────────

describe('PATCH /api/voyages/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('title update → 200', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    const updated = { ...FAKE_VOYAGE, title: 'Updated Title' };
    vi.mocked(prisma.voyage.update).mockResolvedValue(updated as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/voyages/voy1',
      headers: { Authorization: authHeader },
      payload: { title: 'Updated Title' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('Updated Title');
  });

  it('by non-owner trying to change status → 403', async () => {
    // Voyage owned by someone else, but user is in sharedWith
    const sharedVoyage = { ...FAKE_VOYAGE, ownerId: 'u-other', sharedWith: ['u1'] };
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(sharedVoyage as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/voyages/voy1',
      headers: { Authorization: authHeader },
      payload: { status: 'validated' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('Forbidden');
  });
});

// ─── DELETE /api/voyages/:id ──────────────────────────────────────────────────

describe('DELETE /api/voyages/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('by owner → 204', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    vi.mocked(prisma.voyage.delete).mockResolvedValue(FAKE_VOYAGE as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/voyages/voy1',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);
  });

  it('by non-owner → 403', async () => {
    const sharedVoyage = { ...FAKE_VOYAGE, ownerId: 'u-other', sharedWith: ['u1'] };
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(sharedVoyage as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/voyages/voy1',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('Forbidden');
  });
});

// ─── POST /api/voyages/:id/variants ──────────────────────────────────────────

describe('POST /api/voyages/:id/variants', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 201', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    vi.mocked(prisma.variant.create).mockResolvedValue(FAKE_VARIANT as any);
    vi.mocked(prisma.voyage.update).mockResolvedValue(FAKE_VOYAGE as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/voyages/voy1/variants',
      headers: { Authorization: authHeader },
      payload: {
        label: 'Plan A',
        route: ['LFRS', 'LFBI'],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().label).toBe('Plan A');
  });
});

// ─── PATCH /api/voyages/:id/variants/:variantId ───────────────────────────────

describe('PATCH /api/voyages/:id/variants/:variantId', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 200', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    const updated = { ...FAKE_VARIANT, label: 'Plan B' };
    vi.mocked(prisma.variant.update).mockResolvedValue(updated as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/voyages/voy1/variants/var1',
      headers: { Authorization: authHeader },
      payload: { label: 'Plan B' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().label).toBe('Plan B');
  });

  it('taxiOutMin and taxiInMin accepted → 200', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    const updated = { ...FAKE_VARIANT, taxiOutMin: [10, 10], taxiInMin: [5, 5] };
    vi.mocked(prisma.variant.update).mockResolvedValue(updated as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/voyages/voy1/variants/var1',
      headers: { Authorization: authHeader },
      payload: {
        taxiOutMin: [10, 10],
        taxiInMin: [5, 5],
      },
    });

    expect(res.statusCode).toBe(200);
  });

  it('personOverrides with rolePref override → 200', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    const updated = { ...FAKE_VARIANT, personOverrides: { 'p1': { rolePref: 'PAX' } } };
    vi.mocked(prisma.variant.update).mockResolvedValue(updated as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/voyages/voy1/variants/var1',
      headers: { Authorization: authHeader },
      payload: {
        personOverrides: { 'p1': { rolePref: 'PAX' } },
      },
    });

    expect(res.statusCode).toBe(200);
  });
});

// ─── DELETE /api/voyages/:id/variants/:variantId ──────────────────────────────

describe('DELETE /api/voyages/:id/variants/:variantId', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('owner with 2 variants → 204', async () => {
    const variant2 = { ...FAKE_VARIANT, id: 'var2', label: 'Plan B' };
    const voyageWith2 = { ...FAKE_VOYAGE, variants: [FAKE_VARIANT, variant2] };
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(voyageWith2 as any);
    vi.mocked(prisma.variant.delete).mockResolvedValue(FAKE_VARIANT as any);
    vi.mocked(prisma.voyage.update).mockResolvedValue(voyageWith2 as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/voyages/voy1/variants/var1',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);
  });
});

// ─── GET /api/voyages/:id/compute ────────────────────────────────────────────

describe('GET /api/voyages/:id/compute', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 200, returns { voyage, finance }', async () => {
    vi.mocked(prisma.voyage.findFirst).mockResolvedValue(FAKE_VOYAGE as any);
    vi.mocked(prisma.aerodrome.findMany).mockResolvedValue([
      FAKE_AERODROME_LFRS,
      FAKE_AERODROME_LFBI,
    ] as any);
    vi.mocked(prisma.aircraft.findMany).mockResolvedValue([FAKE_AIRCRAFT] as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([FAKE_PERSON] as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/voyages/voy1/compute',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('voyage');
    expect(body).toHaveProperty('finance');
    expect(body.voyage.legs).toHaveLength(1);
    expect(body.voyage.legs[0].fromIcao).toBe('LFRS');
    expect(body.voyage.legs[0].toIcao).toBe('LFBI');
  });
});
