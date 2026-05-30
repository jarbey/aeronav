import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    aerodrome: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    runway: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
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

// NOTE: aeroclubIds field removed — aerodromes are now global (no club scoping)
const FAKE_AERODROME = {
  id: 'ad1',
  icao: 'LFRS',
  name: 'Nantes Atlantique',
  city: 'Nantes',
  lngLat: [-1.6118, 47.157],
  elevationFt: 90,
  fuel: ['100LL', 'Jet-A1'],
  fuelSchedule: null,
  night: true,
  ppr: false,
  atc: 'TWR',
  taxLanding: 20,
  taxParking: 10,
  notes: null,
  runways: [{ id: 'r1', aerodromeId: 'ad1', qfu: '03', lengthM: 2900, surface: 'Béton' }],
};

const AERODROME_BODY = {
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
  runways: [{ qfu: '03', lengthM: 2900, surface: 'Béton' }],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function makeAuthHeader(app: Awaited<ReturnType<typeof buildApp>>) {
  const token = app.jwt.sign(
    { id: 'u1', email: 'test@test.com', aeroclubId: 'ac-nantes' },
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
}

// ─── GET /api/aerodromes ──────────────────────────────────────────────────────

describe('GET /api/aerodromes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('returns all aerodromes (no club scoping)', async () => {
    vi.mocked(prisma.aerodrome.findMany).mockResolvedValue([FAKE_AERODROME] as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/aerodromes',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].icao).toBe('LFRS');
    // Verify no aeroclubIds-based filtering is applied (findMany called without aeroclubIds filter)
    expect(vi.mocked(prisma.aerodrome.findMany)).toHaveBeenCalledOnce();
  });

  it('without auth → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/aerodromes' });
    expect(res.statusCode).toBe(401);
  });
});

// ─── GET /api/aerodromes/catalog ─────────────────────────────────────────────

describe('GET /api/aerodromes/catalog', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('short query → empty array without DB call', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/aerodromes/catalog?q=L',
      headers: { Authorization: authHeader },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    expect(vi.mocked(prisma.aerodrome.findMany)).not.toHaveBeenCalled();
  });

  it('query ≥ 2 chars → returns matching aerodromes', async () => {
    vi.mocked(prisma.aerodrome.findMany).mockResolvedValue([FAKE_AERODROME] as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/aerodromes/catalog?q=LF',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body[0].icao).toBe('LFRS');
  });
});

// ─── POST /api/aerodromes ─────────────────────────────────────────────────────

describe('POST /api/aerodromes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('valid body → 201', async () => {
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.aerodrome.create).mockResolvedValue(FAKE_AERODROME as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/aerodromes',
      headers: { Authorization: authHeader },
      payload: AERODROME_BODY,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().icao).toBe('LFRS');
  });

  it('duplicate ICAO → 409', async () => {
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(FAKE_AERODROME as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/aerodromes',
      headers: { Authorization: authHeader },
      payload: AERODROME_BODY,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Conflict');
  });

  it('missing required fields → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/aerodromes',
      headers: { Authorization: authHeader },
      payload: { icao: 'LFRS' }, // missing name, lngLat, etc.
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─── PATCH /api/aerodromes/:icao ──────────────────────────────────────────────

describe('PATCH /api/aerodromes/:icao', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('→ 200, updates aerodrome fields', async () => {
    // Route now uses findUnique (no aeroclubIds scoping)
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(FAKE_AERODROME as any);
    const updated = { ...FAKE_AERODROME, taxLanding: 25 };
    vi.mocked(prisma.aerodrome.update).mockResolvedValue(updated as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/aerodromes/LFRS',
      headers: { Authorization: authHeader },
      payload: { taxLanding: 25 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().taxLanding).toBe(25);
  });

  it('non-existent ICAO → 404', async () => {
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/aerodromes/ZZZZ',
      headers: { Authorization: authHeader },
      payload: { taxLanding: 25 },
    });

    expect(res.statusCode).toBe(404);
  });

  it('updates runways when provided', async () => {
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(FAKE_AERODROME as any);
    vi.mocked(prisma.runway.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.runway.createMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.aerodrome.update).mockResolvedValue(FAKE_AERODROME as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/aerodromes/LFRS',
      headers: { Authorization: authHeader },
      payload: { runways: [{ qfu: '21', lengthM: 3000, surface: 'Béton' }] },
    });

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(prisma.runway.deleteMany)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.runway.createMany)).toHaveBeenCalledOnce();
  });
});

// ─── DELETE /api/aerodromes/:icao ────────────────────────────────────────────

describe('DELETE /api/aerodromes/:icao', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => { await app.close(); });

  it('existing aerodrome → 204', async () => {
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(FAKE_AERODROME as any);
    vi.mocked(prisma.aerodrome.delete).mockResolvedValue(FAKE_AERODROME as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/aerodromes/LFRS',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);
    expect(vi.mocked(prisma.aerodrome.delete)).toHaveBeenCalledWith({ where: { icao: 'LFRS' } });
  });

  it('non-existent ICAO → 404', async () => {
    vi.mocked(prisma.aerodrome.findUnique).mockResolvedValue(null);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/aerodromes/ZZZZ',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(404);
  });
});
