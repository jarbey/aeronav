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

const FAKE_AERODROME = {
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/aerodromes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => {
    await app.close();
  });

  it('→ 200, list filtered to user\'s club', async () => {
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
  });
});

describe('POST /api/aerodromes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => {
    await app.close();
  });

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
    // When the aerodrome already exists AND the club is already in its list
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
});

describe('PATCH /api/aerodromes/:icao', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => {
    await app.close();
  });

  it('→ 200', async () => {
    vi.mocked(prisma.aerodrome.findFirst).mockResolvedValue(FAKE_AERODROME as any);
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

  it('not found → 404', async () => {
    vi.mocked(prisma.aerodrome.findFirst).mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/aerodromes/nonexistent',
      headers: { Authorization: authHeader },
      payload: { taxLanding: 25 },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/aerodromes/:icao', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
  });

  afterEach(async () => {
    await app.close();
  });

  it('→ 204 (removes club from aeroclubIds)', async () => {
    vi.mocked(prisma.aerodrome.findFirst).mockResolvedValue(FAKE_AERODROME as any);
    // After removing ac-nantes, no clubs remain → delete
    vi.mocked(prisma.aerodrome.delete).mockResolvedValue(FAKE_AERODROME as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/aerodromes/LFRS',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);
  });

  it('→ 204 (updates aeroclubIds when other clubs remain)', async () => {
    const sharedAerodrome = {
      ...FAKE_AERODROME,
      aeroclubIds: ['ac-nantes', 'ac-other'],
    };
    vi.mocked(prisma.aerodrome.findFirst).mockResolvedValue(sharedAerodrome as any);
    vi.mocked(prisma.aerodrome.update).mockResolvedValue({ ...sharedAerodrome, aeroclubIds: ['ac-other'] } as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/aerodromes/LFRS',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);
  });
});
