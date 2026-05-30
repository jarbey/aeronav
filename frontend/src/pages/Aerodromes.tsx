import React, { useState } from 'react';
import type { User, Aerodrome } from '../types';
import { aerodromesForUser, AERODROMES, aeroclubById } from '../data/mockData';
import { useAerodromes } from '../api/aerodromes';

interface AerodromesPageProps {
  currentUser: User;
  onOpenVAC: (icao: string) => void;
  onAdd: () => void;
  onEdit: (ad: Aerodrome) => void;
  version?: number;
}

export default function AerodromesPage({ currentUser, onOpenVAC, onAdd, onEdit, version }: AerodromesPageProps) {
  const [q, setQ] = useState('');
  const [filterNight, setFilterNight] = useState(false);
  const [filterJetA1, setFilterJetA1] = useState(false);
  void version;

  const { data: aerodromesData } = useAerodromes();

  // Prefer API data; fall back to mock data
  const allAerodromes: Aerodrome[] = aerodromesData ?? AERODROMES;
  const visible = allAerodromes;

  const club = aeroclubById(currentUser.aeroclubId);
  const rows = visible.filter(a => {
    if (q && !`${a.icao} ${a.name} ${a.city}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterNight && !a.night) return false;
    if (filterJetA1 && !a.fuel.includes('Jet-A1')) return false;
    return true;
  });

  return (
    <div style={{ padding: '10px 14px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Aérodromes</h2>
        <span className="chip">{visible.length}</span>
        {club && <span className="chip info"><i className="fa-solid fa-building" style={{ marginRight: 3 }}/> Bibliothèque {club.code}</span>}
        <div style={{ flex: 1 }}/>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Code OACI, nom, ville…" value={q} onChange={e => setQ(e.target.value)}/>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <div className={`toggle ${filterNight ? 'on' : ''}`} onClick={() => setFilterNight(!filterNight)}/>
          <span>Nuit</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <div className={`toggle ${filterJetA1 ? 'on' : ''}`} onClick={() => setFilterJetA1(!filterJetA1)}/>
          <span>Jet-A1</span>
        </label>
        <button className="btn btn-primary" onClick={onAdd}><i className="fa-solid fa-plus"/> Nouvel aérodrome</button>
      </div>
      <div className="card" style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="scroll" style={{ flex: 1 }}>
          <table className="table">
            <thead>
              <tr>
                <th>OACI</th>
                <th>Aérodrome</th>
                <th>Piste</th>
                <th>Surface</th>
                <th style={{ textAlign: 'right' }}>Alt.</th>
                <th>Carburant</th>
                <th>Nuit</th>
                <th>PPR</th>
                <th style={{ textAlign: 'right' }}>Taxes</th>
                <th>Position GPS</th>
                <th style={{ width: 170 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(ad => (
                <tr key={ad.icao}>
                  <td className="mono" style={{ fontWeight: 700 }}>{ad.icao}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ad.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{ad.city} · {ad.atc}</div>
                  </td>
                  <td className="mono">{ad.runways[0]?.qfu ?? '—'} · {ad.runways[0]?.lengthM ?? '—'}m</td>
                  <td>{ad.runways[0] && <span className="chip">{ad.runways[0].surface}</span>}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{ad.elevation}<span style={{ color: 'var(--ink-3)', fontSize: 10 }}> ft</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {ad.fuel.map(f => (
                        <span key={f} className={`chip ${f === 'Jet-A1' ? 'info' : 'ok'}`}>{f}</span>
                      ))}
                    </div>
                  </td>
                  <td>{ad.night ? <span className="dot ok"/> : <span className="dot danger"/>}</td>
                  <td>{ad.ppr ? <span className="chip warn">PPR</span> : <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                  <td style={{ textAlign: 'right' }} className="mono">
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{(ad.taxLandingEUR || 0) + (ad.taxParkingEUR || 0)}<span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 500 }}>€</span></div>
                    <div style={{ fontSize: 9, color: 'var(--ink-3)' }}>{ad.taxLandingEUR || 0}+{ad.taxParkingEUR || 0}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                    {ad.coord[1].toFixed(3)}°N<br/>
                    {Math.abs(ad.coord[0]).toFixed(3)}°{ad.coord[0] >= 0 ? 'E' : 'W'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => onOpenVAC(ad.icao)}>
                        <i className="fa-solid fa-map"/> VAC
                      </button>
                      <button className="btn btn-sm" onClick={() => onEdit(ad)}>
                        <i className="fa-solid fa-pen"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
