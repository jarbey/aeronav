import React from 'react';
import { Popover, PopoverHeader } from './Popover';
import type { Aircraft, Variant, CrewAssignment } from '../../types';
import { PEOPLE, AC_MODELS, acById } from '../../data/mockData';

interface Props {
  anchor: DOMRect;
  onClose: () => void;
  ac: Aircraft;
  legIdx: number;
  variant: Variant;
  voyagePeopleIds: string[];
  onChange: (crew: CrewAssignment) => void;
}

export default function CrewPicker({ anchor, onClose, ac, legIdx, variant, voyagePeopleIds, onChange }: Props) {
  const m = AC_MODELS[ac.model];
  const crew: CrewAssignment = (variant.crewsByLeg[legIdx] && variant.crewsByLeg[legIdx][ac.id]) || { cdb: null, pax: [] };
  const voyagePeople = voyagePeopleIds.length > 0
    ? PEOPLE.filter(p => voyagePeopleIds.includes(p.id))
    : PEOPLE;
  // CDB must be explicitly qualified for this aircraft model
  const authorized = voyagePeople.filter(p => p.authorizedModels.includes(ac.model));
  // PAX: any voyage member can be a passenger — no aircraft qualification required
  const paxCandidates = voyagePeople;
  const otherAcIds = Object.keys(variant.crewsByLeg[legIdx] || {}).filter(id => id !== ac.id);
  const otherCrews = otherAcIds.reduce<Record<string, string>>((acc, aid) => {
    const a = acById(aid);
    const c = variant.crewsByLeg[legIdx][aid] || { cdb: null, pax: [] };
    if (a && c.cdb) acc[c.cdb] = a.reg;
    c.pax.forEach(pid => { if (a) acc[pid] = a.reg; });
    return acc;
  }, {});
  const pilots = authorized.filter(p => p.rolePref === 'CDB');
  const paxSeats = m.seats - 1;

  function setCdb(pid: string | null) { onChange({ ...crew, cdb: pid }); }
  function togglePax(pid: string) {
    let np: string[];
    if (crew.pax.includes(pid)) np = crew.pax.filter(x => x !== pid);
    else if (crew.pax.length < paxSeats) np = [...crew.pax, pid];
    else return;
    onChange({ ...crew, pax: np });
  }
  function clearAll() { onChange({ cdb: null, pax: [] }); }

  return (
    <Popover anchor={anchor} onClose={onClose} width={400}>
      <PopoverHeader
        title={`Équipage — ${ac.reg}`}
        sub={`${m.label} · ${m.seats} sièges · branche ${legIdx + 1}`}
        onClose={onClose}/>
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center' }}>
          <div className="cap-sm">Commandant de bord</div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={clearAll}>
            <i className="fa-solid fa-rotate-left"/> Effacer
          </button>
        </div>
        <div style={{ padding: '0 8px 6px' }}>
          {pilots.length === 0 && (
            <div style={{ padding: 8, fontSize: 11, color: 'var(--aero-red)' }}>
              <i className="fa-solid fa-triangle-exclamation"/> Aucun pilote qualifié pour {m.icon}
            </div>
          )}
          {pilots.map(p => {
            const sel = crew.cdb === p.id;
            const conflict = otherCrews[p.id] && otherCrews[p.id] !== ac.reg;
            return (
              <button key={p.id} onClick={() => setCdb(sel ? null : p.id)} style={{
                width: '100%', textAlign: 'left', border: 0,
                background: sel ? '#fff7df' : 'transparent',
                padding: '6px 10px', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                borderLeft: `3px solid ${sel ? '#c89e23' : 'transparent'}`,
              }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--ink-2)', background: sel ? 'var(--ink)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <span style={{ width: 6, height: 6, background: '#ffcf52', borderRadius: '50%' }}/>}
                </span>
                <span style={{ fontSize: 12, fontWeight: sel ? 600 : 500 }}>{p.first} {p.last}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.weightKg}kg</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <span className="chip" style={{ fontSize: 9 }}>{p.license}</span>
                  {conflict && <span className="chip warn" style={{ fontSize: 9 }} title={`Sera retiré de ${otherCrews[p.id]}`}>{otherCrews[p.id]}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '10px 12px 6px' }}>
          <div className="cap-sm">Passagers · {crew.pax.length}/{paxSeats}</div>
        </div>
        <div style={{ padding: '0 8px 12px' }}>
          {paxCandidates.filter(p => p.id !== crew.cdb).map(p => {
            const sel = crew.pax.includes(p.id);
            const full = !sel && crew.pax.length >= paxSeats;
            const conflict = otherCrews[p.id] && otherCrews[p.id] !== ac.reg;
            return (
              <button key={p.id} onClick={() => togglePax(p.id)} disabled={full}
                style={{
                  width: '100%', textAlign: 'left', border: 0,
                  background: sel ? 'var(--paper-2)' : 'transparent',
                  padding: '6px 10px', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: full ? 'not-allowed' : 'pointer',
                  opacity: full ? 0.5 : 1,
                }}>
                <span style={{ width: 14, height: 14, borderRadius: 2, border: '1.5px solid var(--ink-2)', background: sel ? 'var(--ink)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ffcf52', fontSize: 9 }}>
                  {sel ? '✓' : ''}
                </span>
                <span style={{ fontSize: 12, fontWeight: sel ? 600 : 500 }}>{p.first} {p.last}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.weightKg}kg</span>
                {p.rolePref === 'CDB' && <span className="chip info" style={{ fontSize: 9 }}>pilote</span>}
                {conflict && <span className="chip warn" style={{ fontSize: 9, marginLeft: 'auto' }} title={`Sera retiré de ${otherCrews[p.id]}`}>{otherCrews[p.id]}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
