import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock prisma BEFORE importing buildApp (which imports routes, which import prisma)
vi.mock('../../prisma/client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
  person: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('valid email → 200 with { user: { first, last, ... }, token }', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@test.com' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.first).toBe('Test');
    expect(body.user.last).toBe('User');
    expect(body.user.email).toBe('test@test.com');
    // Should NOT expose firstName/lastName
    expect(body.user.firstName).toBeUndefined();
    expect(body.user.lastName).toBeUndefined();
  });

  it('unknown email → 401', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('missing email field → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it('malformed email → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'not-an-email' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('without Authorization header → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('with invalid JWT → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Authorization: 'Bearer totally.invalid.token' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('with valid JWT → 200, returns user', async () => {
    // First call: requireAuth middleware calls findUnique with id
    // Second call: auth/me handler also calls findUnique
    vi.mocked(prisma.user.findUnique).mockResolvedValue(FAKE_USER as any);

    const token = app.jwt.sign(
      { id: 'u1', email: 'test@test.com', aeroclubId: 'ac-nantes' },
      { expiresIn: '1h' }
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.first).toBe('Test');
    expect(body.last).toBe('User');
    expect(body.email).toBe('test@test.com');
  });
});

describe('POST /api/auth/logout', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('→ 200, { ok: true }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
