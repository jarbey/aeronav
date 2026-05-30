import React, { useState, useRef, useEffect } from 'react';
import type { User, Voyage, Aerodrome } from '../types';
import { USERS, aeroclubById, aircraftForUser, adByIcao, acById, AC_MODELS, distNM } from '../data/mockData';
import { useAerodromes } from '../api/aerodromes';
import { UserAvatar } from './UserAvatar';

interface Props {
  currentUser: User;
  onClose: () => void;
  onCreate: (voyage: Voyage) => void;
}

// Searchable aerodrome picker
function AerodromePicker({ value, onChange, aerodromes, exclude, placeholder, autoFocus }: {
  value: string;
  onChange: (icao: string) => void;
  aerodromes: Aerodrome[];
  exclude?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const selected = aerodromes.find(a => a.icao === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const candidates = aerodromes.filter(a => {
    if (a.icao === exclude) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return a.icao.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
  }).slice(0, 12);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(icao: string) {
    onChange(icao);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const displayValue = selected ? `${selected.icao} — ${selected.name}` : '';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          className="input"
          style={{ fontFamily: selected ? 'var(--font-mono)' : 'inherit', fontWeight: selected ? 600 : 400, paddingRight: selected ? 28 : undefined }}
          value={open ? query : displayValue}
          placeholder={placeholder || 'Rechercher OACI, nom, ville…'}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            if (e.key === 'Enter' && candidates.length > 0) select(candidates[0].icao);
          }}
        />
        {selected && !open && (
          <button onClick={clear} style={{ position: 'absolute', right: 6, background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 2, lineHeight: 1 }}>
            <i className="fa-solid fa-xmark" style={{ fontSize: 11 }}/>
          </button>
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--paper)', border: '1px solid var(--hairline)',
          borderTop: 0, borderRadius: '0 0 4px 4px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {candidates.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucun aérodrome trouvé</div>
          ) : candidates.map(a => (
            <div
              key={a.icao}
              onMouseDown={() => select(a.icao)}
              style={{
                padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 10,
                background: a.icao === value ? 'var(--surface-2)' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = a.icao === value ? 'var(--surface-2)' : '')}
            >
              <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)', minWidth: 44 }}>{a.icao}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{a.city}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewVoyageDialog({ currentUser, onClose, onCreate }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: apiAerodromes } = useAerodromes();
  const visibleAerodromes = apiAerodromes ?? [];
  const visibleAircraft = aircraftForUser(currentUser);
  const homeBase = aeroclubById(currentUser.aeroclubId)?.base;
  const defaultFrom = visibleAerodromes.find(a => a.icao === homeBase)?.icao || visibleAerodromes[0]?.icao || '';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [fromIcao, setFromIcao] = useState(defaultFrom);
  const [toIcao, setToIcao] = useState('');
  const [acSel, setAcSel] = useState<string[]>(() => visibleAircraft.slice(0, 2).map(a => a.id));
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  const fromAd = visibleAerodromes.find(a => a.icao === fromIcao);
  const toAd = visibleAerodromes.find(a => a.icao === toIcao);
  const distance = fromAd && toAd ? distNM(fromAd.coord, toAd.coord) : 0;

  const candidates = USERS.filter(u => u.aeroclubId === currentUser.aeroclubId && u.id !== currentUser.id);

  function toggleAircraft(id: string) {
    setAcSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }
  function toggleShared(uid: string) {
    setSharedWith(s => s.includes(uid) ? s.filter(x => x !== uid) : [...s, uid]);
  }

  const canSubmit = title.trim() && fromIcao && toIcao && fromIcao !== toIcao && acSel.length > 0;

  function submit() {
    if (!canSubmit) return;
    const id = 'vy-' + Date.now().toString(36);
    const crewsByLeg = [acSel.reduce<Record<string, { cdb: null; pax: string[] }>>((acc, aid) => { acc[aid] = { cdb: null, pax: [] }; return acc; }, {})];
    const fuelLoadL = [acSel.reduce<Record<string, number>>((acc, aid) => {
      const ac = acById(aid);
      const m = ac && AC_MODELS[ac.model];
      acc[aid] = m ? Math.floor(m.fuelCapL * 0.85) : 80;
      return acc;
    }, {})];
    const bagsByLeg = [acSel.reduce<Record<string, { count: number; unitKg: number }>>((acc, aid) => { acc[aid] = { count: 0, unitKg: 12 }; return acc; }, {})];
    const newV: Voyage = {
      id, title: title.trim(), date,
      aeroclubId: currentUser.aeroclubId, ownerId: currentUser.id,
      sharedWith, status: 'draft', activeVariantId: 'A',
      aircraftIds: acSel,
      peopleIds: [],
      variants: [{
        id: 'A', label: 'Plan A — Initial', weather: 'À planifier', tag: 'draft',
        route: [fromIcao, toIcao], stopMin: [null, null], cruiseAltFt: [3500],
        taxiOutMin: [10], taxiInMin: [10],
        crewsByLeg, fuelLoadL, bagsByLeg,
      }],
    };
    onCreate(newV);
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,34,64,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="modal" style={{ width: 720, maxHeight: '90vh' }}>
        <div className="modal-head">
          <h2><i className="fa-solid fa-plus" style={{ marginRight: 6 }}/> Nouveau voyage</h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>Identité du voyage</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
              <div className="field"><label>Titre</label>
                <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Sortie côtière en Bretagne"/>
              </div>
              <div className="field"><label>Date</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)}/>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>Itinéraire (initial)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'end', gap: 8 }}>
              <div className="field"><label>Aérodrome de départ</label>
                <AerodromePicker value={fromIcao} onChange={setFromIcao} exclude={toIcao} aerodromes={visibleAerodromes}/>
              </div>
              <div style={{ paddingBottom: 8, textAlign: 'center', color: 'var(--ink-3)' }}>
                <i className="fa-solid fa-arrow-right" style={{ fontSize: 16 }}/>
              </div>
              <div className="field"><label>Aérodrome d'arrivée</label>
                <AerodromePicker value={toIcao} onChange={setToIcao} exclude={fromIcao} aerodromes={visibleAerodromes} placeholder="Rechercher…"/>
              </div>
            </div>
            <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 4, fontSize: 11, color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between' }}>
              <span><i className="fa-solid fa-circle-info" style={{ marginRight: 4, color: 'var(--ink-3)' }}/> Vous pourrez ajouter des escales une fois le voyage créé.</span>
              {distance > 0 && <b className="mono">{distance.toFixed(0)} NM</b>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              Avions à embarquer <span style={{ fontWeight: 400, opacity: 0.7 }}>({acSel.length}/{visibleAircraft.length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {visibleAircraft.map(ac => {
                const m = AC_MODELS[ac.model];
                const sel = acSel.includes(ac.id);
                return (
                  <div key={ac.id} onClick={() => toggleAircraft(ac.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    border: `1px solid ${sel ? 'var(--ink)' : 'var(--hairline-soft)'}`,
                    borderRadius: 4, background: sel ? 'var(--paper)' : 'transparent', cursor: 'pointer',
                  }}>
                    <span style={{ width: 18, height: 18, borderRadius: 3, border: `1.5px solid ${sel ? 'var(--aero-green-2)' : 'var(--hairline)'}`, background: sel ? 'var(--aero-green)' : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{sel ? '✓' : ''}</span>
                    <span style={{ width: 6, height: 22, background: ac.color, borderRadius: 1 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{ac.reg}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{m?.label} — {m?.seats} pl. · {m?.hourlyEUR}€/h</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {candidates.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>
                Partager dès la création <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>(optionnel · {sharedWith.length} invité{sharedWith.length > 1 ? 's' : ''})</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {candidates.map(u => {
                  const sel = sharedWith.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleShared(u.id)} style={{
                      padding: '4px 10px 4px 4px', borderRadius: 999,
                      border: `1px solid ${sel ? 'var(--ink)' : 'var(--hairline)'}`,
                      background: sel ? 'var(--paper-2)' : 'var(--surface-card)',
                      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    }}>
                      <UserAvatar user={u} size={20}/>
                      <span style={{ fontSize: 11, fontWeight: sel ? 600 : 500 }}>{u.first} {u.last}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontSize: 10.5, color: 'var(--ink-3)' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: 3 }}/> Le voyage sera créé en brouillon.
          </div>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit} style={!canSubmit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
            <i className="fa-solid fa-plus"/> Créer le voyage
          </button>
        </div>
      </div>
    </div>
  );
}
