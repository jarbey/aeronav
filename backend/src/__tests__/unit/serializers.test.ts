import { describe, it, expect } from 'vitest';
import { serializeUser, serializePerson } from '../../utils/serializers.js';

// ─── serializeUser ─────────────────────────────────────────────────────────────

describe('serializeUser', () => {
  const rawUser = {
    id: 'u1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    aeroclubId: 'ac-nantes',
    provider: 'local',
    personId: 'p1',
    role: 'Pilote',
    // Extra Prisma fields that should NOT be included
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    password: 'secret-hash',
    aeroclub: { id: 'ac-nantes', name: 'ACNA' },
  };

  it('maps firstName → first', () => {
    const result = serializeUser(rawUser);
    expect(result.first).toBe('Alice');
    expect((result as Record<string, unknown>).firstName).toBeUndefined();
  });

  it('maps lastName → last', () => {
    const result = serializeUser(rawUser);
    expect(result.last).toBe('Martin');
    expect((result as Record<string, unknown>).lastName).toBeUndefined();
  });

  it('preserves id, email, aeroclubId, provider, personId, role', () => {
    const result = serializeUser(rawUser);
    expect(result.id).toBe('u1');
    expect(result.email).toBe('alice@example.com');
    expect(result.aeroclubId).toBe('ac-nantes');
    expect(result.provider).toBe('local');
    expect(result.personId).toBe('p1');
    expect(result.role).toBe('Pilote');
  });

  it('extra Prisma fields (createdAt, etc.) are NOT included in output', () => {
    const result = serializeUser(rawUser);
    expect((result as Record<string, unknown>).createdAt).toBeUndefined();
    expect((result as Record<string, unknown>).updatedAt).toBeUndefined();
    expect((result as Record<string, unknown>).password).toBeUndefined();
    expect((result as Record<string, unknown>).aeroclub).toBeUndefined();
  });

  it('works when personId is null', () => {
    const result = serializeUser({ ...rawUser, personId: null });
    expect(result.personId).toBeNull();
  });
});

// ─── serializePerson ──────────────────────────────────────────────────────────

describe('serializePerson', () => {
  const rawPerson = {
    id: 'p1',
    aeroclubId: 'ac-nantes',
    firstName: 'Bob',
    lastName: 'Dupont',
    weightKg: 80,
    license: 'PPL',
    authorizedModels: ['DR400-155', 'C172'],
    rolePref: 'CDB' as string | null,
    createdAt: new Date(),
  };

  it('maps firstName → first', () => {
    const result = serializePerson(rawPerson);
    expect(result.first).toBe('Bob');
    expect((result as Record<string, unknown>).firstName).toBeUndefined();
  });

  it('maps lastName → last', () => {
    const result = serializePerson(rawPerson);
    expect(result.last).toBe('Dupont');
    expect((result as Record<string, unknown>).lastName).toBeUndefined();
  });

  it('null rolePref becomes "PAX"', () => {
    const result = serializePerson({ ...rawPerson, rolePref: null });
    expect(result.rolePref).toBe('PAX');
  });

  it('defined rolePref is preserved', () => {
    const result = serializePerson({ ...rawPerson, rolePref: 'CDB' });
    expect(result.rolePref).toBe('CDB');
  });

  it('preserves weightKg, license, authorizedModels', () => {
    const result = serializePerson(rawPerson);
    expect(result.weightKg).toBe(80);
    expect(result.license).toBe('PPL');
    expect(result.authorizedModels).toEqual(['DR400-155', 'C172']);
  });

  it('preserves id and aeroclubId', () => {
    const result = serializePerson(rawPerson);
    expect(result.id).toBe('p1');
    expect(result.aeroclubId).toBe('ac-nantes');
  });
});
