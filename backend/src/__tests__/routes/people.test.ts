import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const FAKE_PERSON = {
  id: 'p1',
  aeroclubId: 'ac-nantes',
  firstName: 'Alice',
  lastName: 'Dupont',
  weightKg: 70,
  license: 'PPL',
  authorizedModels: ['DR400-155'],
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/people', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authHeader: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    authHeader = await makeAuthHeader(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('without auth → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/people' });
    expect(res.statusCode).toBe(401);
  });

  it('with auth → 200, array with first/last fields', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([FAKE_PERSON] as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/people',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].first).toBe('Alice');
    expect(body[0].last).toBe('Dupont');
    // Should NOT expose raw firstName/lastName
    expect(body[0].firstName).toBeUndefined();
    expect(body[0].lastName).toBeUndefined();
  });
});

describe('POST /api/people', () => {
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

  it('valid body → 201 with first/last', async () => {
    vi.mocked(prisma.person.create).mockResolvedValue(FAKE_PERSON as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/people',
      headers: { Authorization: authHeader },
      payload: {
        first: 'Alice',
        last: 'Dupont',
        weightKg: 70,
        license: 'PPL',
        authorizedModels: ['DR400-155'],
        rolePref: 'CDB',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.first).toBe('Alice');
    expect(body.last).toBe('Dupont');
  });

  it('missing required fields → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/people',
      headers: { Authorization: authHeader },
      payload: {
        first: 'Alice',
        // missing weightKg, license
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('empty lastName accepted (first name only) → 201', async () => {
    const personFirstOnly = { ...FAKE_PERSON, lastName: '' };
    vi.mocked(prisma.person.create).mockResolvedValue(personFirstOnly as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/people',
      headers: { Authorization: authHeader },
      payload: {
        first: 'Alice',
        last: '',          // empty last name is now allowed
        weightKg: 70,
        license: '',
        authorizedModels: [],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().first).toBe('Alice');
    expect(res.json().last).toBe('');
  });

  it('rolePref EP is accepted → 201', async () => {
    vi.mocked(prisma.person.create).mockResolvedValue({ ...FAKE_PERSON, rolePref: 'EP' } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/people',
      headers: { Authorization: authHeader },
      payload: {
        first: 'Elève',
        last: 'Pilote',
        weightKg: 65,
        license: '',
        authorizedModels: [],
        rolePref: 'EP',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().rolePref).toBe('EP');
  });
});

describe('PATCH /api/people/:id', () => {
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

  it('existing person same club → 200', async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue(FAKE_PERSON as any);
    const updatedPerson = { ...FAKE_PERSON, weightKg: 75 };
    vi.mocked(prisma.person.update).mockResolvedValue(updatedPerson as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/people/p1',
      headers: { Authorization: authHeader },
      payload: { weightKg: 75 },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.weightKg).toBe(75);
  });

  it('person not found or different club → 404', async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/people/nonexistent',
      headers: { Authorization: authHeader },
      payload: { weightKg: 75 },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/people/:id', () => {
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

  it('unlinked person → 204', async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue(FAKE_PERSON as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.person.delete).mockResolvedValue(FAKE_PERSON as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/people/p1',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);
  });

  it('person linked to user → 409', async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue(FAKE_PERSON as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(FAKE_USER as any);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/people/p1',
      headers: { Authorization: authHeader },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Conflict');
  });
});
