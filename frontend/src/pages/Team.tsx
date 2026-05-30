import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { User, Person } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { AC_MODELS } from '../data/mockData';
import { usePeople } from '../api/people';

const ROLES = ['Pilote', 'Élève Pilote (EP)', 'Instructeur', 'Admin'];

type MemberPatch = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  license?: string;
  weightKg?: number;
  rolePref?: string;
};

function useTeam() {
  return useQuery<User[]>({
    queryKey: ['team'],
    queryFn: () => apiFetch<User[]>('/auth/team'),
    staleTime: 30_000,
  });
}

export default function TeamPage({ currentUser }: { currentUser: User }) {
  const qc = useQueryClient();
  const { data: members = [] } = useTeam();
  const { data: people = [] } = usePeople();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Build a map of personId → Person for quick lookup
  const personMap = new Map<string, Person>(people.map(p => [p.id, p]));

  const createMember = useMutation<User, Error, { email: string; firstName: string; lastName: string; role: string }>({
    mutationFn: (data) => apiFetch<User>('/auth/team', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); setShowForm(false); },
  });

  const updateMember = useMutation<User, Error, MemberPatch>({
    mutationFn: ({ id, ...data }) => apiFetch<User>(`/auth/team/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      qc.invalidateQueries({ queryKey: ['people'] });
      setEditingId(null);
    },
  });

  const deleteMember = useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch<void>(`/auth/team/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Équipe</h2>
        <span className="chip">{members.length} membre{members.length > 1 ? 's' : ''}</span>
        <div style={{ flex: 1 }}/>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-plus"/> Ajouter un membre
        </button>
      </div>

      {showForm && (
        <MemberForm
          onSave={(data) => createMember.mutate(data)}
          onCancel={() => setShowForm(false)}
          error={createMember.error?.message}
          loading={createMember.isPending}
        />
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Licence</th>
              <th style={{ textAlign: 'right' }}>Poids</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const person = m.personId ? personMap.get(m.personId) : null;
              return (
                <tr key={m.id}>
                  {editingId === m.id ? (
                    <td colSpan={6} style={{ padding: 0 }}>
                      <MemberForm
                        initial={m}
                        person={person ?? undefined}
                        onSave={(data) => updateMember.mutate({ id: m.id, ...data })}
                        onCancel={() => setEditingId(null)}
                        error={updateMember.error?.message}
                        loading={updateMember.isPending}
                        hideEmail
                      />
                    </td>
                  ) : (
                    <>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <UserAvatar user={m} size={28}/>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.first} {m.last}</div>
                            {m.id === currentUser.id && (
                              <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Vous</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{m.email}</td>
                      <td>
                        <span className={`chip ${m.role === 'Admin' ? 'info' : ''}`} style={{ fontSize: 11 }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {person?.license
                          ? <span className="mono">{person.license}</span>
                          : <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12 }} className="mono">
                        {person ? `${person.weightKg} kg` : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm" onClick={() => setEditingId(m.id)}>
                            <i className="fa-solid fa-pen"/>
                          </button>
                          {m.id !== currentUser.id && (
                            <button className="btn btn-sm" style={{ color: 'var(--aero-red)' }}
                              onClick={() => { if (window.confirm(`Supprimer ${m.first} ${m.last} de l'aéroclub ?`)) deleteMember.mutate(m.id); }}>
                              <i className="fa-solid fa-trash"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberForm({ initial, person, onSave, onCancel, error, loading, hideEmail }: {
  initial?: User;
  person?: Person;
  onSave: (data: { email: string; firstName: string; lastName: string; role: string; license?: string; weightKg?: number; rolePref?: string }) => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
  hideEmail?: boolean;
}) {
  const [firstName, setFirstName] = useState(initial?.first ?? '');
  const [lastName, setLastName] = useState(initial?.last ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState(initial?.role ?? 'Pilote');
  const [license, setLicense] = useState(person?.license ?? '');
  const [weightKg, setWeightKg] = useState<number>(person?.weightKg ?? 75);
  const [rolePref, setRolePref] = useState<'CDB' | 'PAX' | 'EP'>((person?.rolePref as 'CDB' | 'PAX' | 'EP') ?? 'PAX');

  const acOptions = Object.entries(AC_MODELS).map(([k, m]) => ({ value: k, label: `${m.icon} ${m.label}` }));
  const hasPilotData = !!hideEmail; // only show pilot fields when editing (not creating)

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || (!hideEmail && !email.trim())) return;
    onSave({
      email, firstName, lastName, role,
      ...(hasPilotData && { license, weightKg, rolePref }),
    });
  }

  return (
    <div className="card" style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
          {initial ? 'Modifier le membre' : 'Nouveau membre'}
        </div>

        {/* Identité & rôle aéroclub */}
        <div style={{ display: 'grid', gridTemplateColumns: !hideEmail ? '1fr 1fr 1fr auto auto' : '1fr 1fr auto auto', gap: 10, alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Prénom</label>
            <input className="input" autoFocus value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom"/>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Nom</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom"/>
          </div>
          {!hideEmail && (
            <div className="field" style={{ margin: 0 }}>
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@email.fr"/>
            </div>
          )}
          <div className="field" style={{ margin: 0 }}>
            <label>Rôle aéroclub</label>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 1 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '…' : <><i className="fa-solid fa-check"/> {initial ? 'Enregistrer' : 'Ajouter'}</>}
            </button>
            <button type="button" className="btn" onClick={onCancel}>Annuler</button>
          </div>
        </div>

        {/* Profil pilote — seulement à l'édition */}
        {hasPilotData && (
          <div style={{ paddingTop: 12, borderTop: '1px dashed var(--hairline-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>
              <i className="fa-solid fa-id-card" style={{ marginRight: 5 }}/>Profil pilote
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'end' }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Licence</label>
                <input className="input" value={license} onChange={e => setLicense(e.target.value)} placeholder="PPL, LAPL, …"/>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Poids (kg)</label>
                <input className="input" type="number" min={20} max={200} value={weightKg}
                  onChange={e => setWeightKg(Number(e.target.value))}/>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Rôle vol préférentiel</label>
                <select className="select" value={rolePref} onChange={e => setRolePref(e.target.value as 'CDB' | 'PAX' | 'EP')}>
                  <option value="CDB">CDB</option>
                  <option value="PAX">PAX</option>
                  <option value="EP">Élève Pilote (EP)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 11, color: 'var(--aero-red)', padding: '4px 8px', background: '#fdecea', borderRadius: 4 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 5 }}/>{error}
          </div>
        )}
      </form>
    </div>
  );
}
