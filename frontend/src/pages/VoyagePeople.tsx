import React, { useState } from 'react';
import type { Voyage, Variant, VoyageResult, FinanceResult, Person } from '../types';
import {
  acById, personById, userForPerson, personEffective, aeroclubById, AC_MODELS,
} from '../data/mockData';

interface PartEntry {
  person: Person;
  legs: { acId: string; ac: ReturnType<typeof acById>; legIdx: number; route: string; durMin: number; role: 'CDB' | 'PAX' }[];
  cdbCount: number;
  paxCount: number;
  totalHours: number;
}

function buildPartMap(variant: Variant, computed: VoyageResult) {
  const map: Record<string, PartEntry> = {};
  variant.crewsByLeg.forEach((leg, legIdx) => {
    const legResult = computed.legs[legIdx];
    Object.entries(leg).forEach(([acId, crew]) => {
      const ac = acById(acId);
      const durMin = legResult?.perAc[acId]?.durMin || 0;
      const route = legResult ? `${legResult.fromIcao}→${legResult.toIcao}` : '';
      const addEntry = (personId: string, role: 'CDB' | 'PAX') => {
        const p = personById(personId); if (!p) return;
        if (!map[personId]) map[personId] = { person: p, legs: [], cdbCount: 0, paxCount: 0, totalHours: 0 };
        map[personId].legs.push({ acId, ac, legIdx, route, durMin, role });
        if (role === 'CDB') map[personId].cdbCount++; else map[personId].paxCount++;
        map[personId].totalHours += durMin / 60;
      };
      if (crew.cdb) addEntry(crew.cdb, 'CDB');
      crew.pax.forEach(pid => addEntry(pid, 'PAX'));
    });
  });
  return map;
}

interface Props {
  voyage: Voyage;
  variant: Variant;
  computed: VoyageResult;
  finance: FinanceResult;
  onAddPerson: () => void;
  onEditPerson: (p: Person) => void;
  onRemoveFromVoyage: (id: string) => void;
}

type SortKey = 'nom' | 'licence' | 'modeles' | 'role' | 'present' | 'heures' | 'apayer';
type SortDir = 'asc' | 'desc';

export default function VoyagePeople({ voyage, variant, computed, finance, onAddPerson, onEditPerson, onRemoveFromVoyage }: Props) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('role');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const partMap = buildPartMap(variant, computed);
  const cdbCount = Object.values(partMap).filter(r => r.cdbCount > 0).length;

  // Union: people explicitly added to voyage + people assigned in crewsByLeg
  const allPersonIds = new Set<string>(voyage.peopleIds ?? []);
  Object.values(partMap).forEach(entry => allPersonIds.add(entry.person.id));

  const rows = Array.from(allPersonIds)
    .map(id => personById(id))
    .filter((p): p is Person => !!p)
    .filter(p => !q || (p.first + ' ' + p.last + ' ' + p.license).toLowerCase().includes(q.toLowerCase()))
    .map(p => ({ person: p, part: partMap[p.id] || null }))
    .sort((a, b) => {
      const eff_a = personEffective(a.person.id, variant);
      const eff_b = personEffective(b.person.id, variant);
      const billing_a = finance.byPerson[a.person.id];
      const billing_b = finance.byPerson[b.person.id];
      let cmp = 0;
      switch (sortKey) {
        case 'nom':
          cmp = [a.person.last, a.person.first].join(' ').localeCompare([b.person.last, b.person.first].join(' '));
          break;
        case 'licence':
          cmp = (a.person.license || '').localeCompare(b.person.license || '');
          break;
        case 'modeles':
          cmp = (eff_a?.authorizedModels.length ?? 0) - (eff_b?.authorizedModels.length ?? 0);
          break;
        case 'role':
          cmp = ((b.part?.cdbCount ?? 0) - (a.part?.cdbCount ?? 0)) ||
                ((b.part?.paxCount ?? 0) - (a.part?.paxCount ?? 0));
          break;
        case 'present':
          cmp = (a.part?.legs.length ?? 0) - (b.part?.legs.length ?? 0);
          break;
        case 'heures':
          cmp = (a.part?.totalHours ?? 0) - (b.part?.totalHours ?? 0);
          break;
        case 'apayer':
          cmp = (billing_a?.total ?? 0) - (billing_b?.total ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Personnes</h2>
        <span className="chip info">{rows.length} dans ce voyage</span>
        <span className="chip">{cdbCount} CDB</span>
        <span className="chip warn">{rows.filter(r => !r.part).length} non placés</span>
        <div style={{ flex: 1 }}/>
        <input className="input" style={{ maxWidth: 220 }} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)}/>
        <button className="btn btn-primary" onClick={onAddPerson}><i className="fa-solid fa-plus"/> Ajouter une personne</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 38 }}/>
                {([
                  ['nom',     'Nom',              false],
                  ['licence', 'Licence',          false],
                  ['modeles', 'Avions autorisés', false],
                  ['role',    'Rôle voyage',      false],
                  ['present', 'Présent sur',      false],
                  ['heures',  'Heures',           true],
                  ['apayer',  'À payer',          true],
                ] as [SortKey, string, boolean][]).map(([key, label, right]) => (
                  <th key={key} style={{ textAlign: right ? 'right' : undefined, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort(key)}>
                    {label}
                    {sortKey === key
                      ? <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--aero-red)' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                      : <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--ink-4)' }}>⇅</span>}
                  </th>
                ))}
                <th style={{ width: 110 }}/>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ person: p, part }) => {
                const initials = (p.first[0] + (p.last?.[0] ?? '')).toUpperCase();
                const colorIdx = (p.id.charCodeAt(1) % 6) + 1;
                const billing = finance.byPerson[p.id];
                const linkedUser = userForPerson(p.id);
                const eff = personEffective(p.id, variant)!;
                const overridden = eff._hasOverride;
                return (
                  <tr key={p.id} style={{ opacity: part ? 1 : 0.7 }}>
                    <td>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: `var(--plane-${colorIdx})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10.5 }}>{initials}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {[p.first, p.last].filter(Boolean).join(' ')}
                        {linkedUser && (
                          <span className="chip info" style={{ fontSize: 9 }} title={`Compte utilisateur ${linkedUser.email}`}>
                            <i className="fa-solid fa-user-check" style={{ marginRight: 2 }}/> Utilisateur
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: overridden ? 'var(--aero-amber)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {eff.weightKg}kg{overridden && eff._override.weightKg != null ? '⁺' : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{linkedUser?.email || eff.rolePref}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.license || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {eff.authorizedModels.map(m => (
                          <span key={m} className="chip" title={AC_MODELS[m]?.label || m}
                            style={overridden && eff._override.authorizedModels ? { borderColor: 'var(--aero-amber)', color: 'var(--aero-amber)' } : undefined}>
                            {AC_MODELS[m]?.icon || m}
                          </span>
                        ))}
                        {eff.authorizedModels.length === 0 && <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>—</span>}
                        {overridden && eff._override.authorizedModels && <span className="chip warn" style={{ fontSize: 9 }} title="Spécifique au voyage"><i className="fa-solid fa-route"/></span>}
                      </div>
                    </td>
                    <td>
                      {part ? (
                        <>
                          {part.cdbCount > 0 && <span className="chip info">CDB ×{part.cdbCount}</span>}
                          {part.paxCount > 0 && <span className="chip" style={{ marginLeft: part.cdbCount > 0 ? 4 : 0 }}>PAX ×{part.paxCount}</span>}
                        </>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic' }}>non placé</span>
                      )}
                    </td>
                    <td>
                      {part ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {part.legs.slice(0, 8).map((l, i) => (
                            <span key={i} className="chip" style={{ fontSize: 9.5, padding: '1px 6px', background: l.ac?.color ? `${l.ac.color}22` : 'var(--paper-2)', borderColor: l.ac?.color ? `${l.ac.color}66` : 'var(--hairline-soft)', color: l.ac?.color || 'var(--ink-2)' }} title={`Branche ${l.legIdx + 1} : ${l.route} sur ${l.ac?.reg}`}>
                              {l.role === 'CDB' ? <b>{l.legIdx + 1}</b> : (l.legIdx + 1)}·{l.ac?.reg.slice(-3)}
                            </span>
                          ))}
                          {part.legs.length > 8 && <span style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>+{part.legs.length - 8}</span>}
                        </div>
                      ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {part ? <span>{part.totalHours.toFixed(1)}<span style={{ color: 'var(--ink-3)', fontSize: 10, marginLeft: 2 }}>h</span></span> : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {billing ? <span style={{ fontWeight: 600, color: 'var(--aero-red)' }}>{Math.round(billing.total)}€</span> : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => onEditPerson(p)} title="Modifier">
                          <i className="fa-solid fa-pen"/>
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => onRemoveFromVoyage(p.id)} title="Retirer du voyage" style={{ color: 'var(--aero-red)' }}>
                          <i className="fa-solid fa-user-minus"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>Aucune personne dans ce voyage — cliquez sur "Ajouter une personne"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 4, fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <i className="fa-solid fa-circle-info" style={{ marginTop: 2 }}/>
        <span>Les personnes <b>liées à un compte utilisateur</b> ont leurs prénom/nom/licence verrouillés. Vous pouvez surcharger leur <b>poids</b> et leurs <b>avions autorisés</b> pour ce voyage uniquement (indiqué par une teinte ambre).</span>
      </div>
    </div>
  );
}
