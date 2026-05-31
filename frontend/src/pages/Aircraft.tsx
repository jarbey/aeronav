import React, { useState } from 'react';
import type { User, Aircraft, AircraftModel } from '../types';
import { aircraftForUser, aeroclubById, AC_MODELS, AIRCRAFT } from '../data/mockData';
import { useAircraft, useAircraftModels } from '../api/aircraft';

interface AircraftPageProps {
  currentUser: User;
  onAddAircraft: () => void;
  onEditAircraft: (ac: Aircraft) => void;
  onAddModel: () => void;
  onEditModel: (key: string, model: AircraftModel) => void;
  version?: number;
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div>
      <div className="cap-sm">{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
        {value}<span style={{ fontSize: 9.5, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

export default function AircraftPage({ currentUser, onAddAircraft, onEditAircraft, onAddModel, onEditModel, version }: AircraftPageProps) {
  const [view, setView] = useState<'fleet' | 'models'>('fleet');
  const { data: aircraftData } = useAircraft();
  const { data: modelsData } = useAircraftModels();
  void version;

  // Prefer API data; fall back to mock data
  const allAircraft: Aircraft[] = aircraftData ?? AIRCRAFT;
  const models: Record<string, AircraftModel> = modelsData ?? AC_MODELS;

  const visibleAircraft = aircraftData
    ? allAircraft.filter(ac => ac.aeroclubId === currentUser.aeroclubId)
    : aircraftForUser(currentUser);

  const club = aeroclubById(currentUser.aeroclubId);

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Avions</h2>
        <span className="chip">{view === 'fleet' ? `${visibleAircraft.length} appareils` : `${Object.keys(models).length} modèles`}</span>
        {club && (
          <span className="chip info" title={club.name}>
            <i className="fa-solid fa-building" style={{ marginRight: 3 }}/> {club.code}
          </span>
        )}
        <div style={{ flex: 1 }}/>
        <div className="seg">
          <button className={view === 'fleet' ? 'active' : ''} onClick={() => setView('fleet')}>Flotte</button>
          <button className={view === 'models' ? 'active' : ''} onClick={() => setView('models')}>Modèles</button>
        </div>
        <button className="btn btn-primary" onClick={view === 'fleet' ? onAddAircraft : onAddModel}>
          <i className="fa-solid fa-plus"/> {view === 'fleet' ? 'Nouvel avion' : 'Nouveau modèle'}
        </button>
      </div>
      {view === 'fleet' ? (
        <FleetGrid aircraft={visibleAircraft} models={models} onEdit={onEditAircraft}/>
      ) : (
        <ModelsGrid models={models} allAircraft={allAircraft} onEdit={onEditModel}/>
      )}
    </div>
  );
}

function FleetGrid({ aircraft, models, onEdit }: { aircraft: Aircraft[]; models: Record<string, AircraftModel>; onEdit: (ac: Aircraft) => void }) {
  return (
    <div className="scroll" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))', gap: 14, alignContent: 'start', paddingBottom: 16 }}>
      {aircraft.map(ac => {
        const m = models[ac.model];
        const club = aeroclubById(ac.aeroclubId);
        if (!m) return null;
        return (
          <div key={ac.id} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', background: 'linear-gradient(110deg, var(--surface-2), var(--paper))', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 32, background: ac.color, borderRadius: 1 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{ac.reg}</div>
                  {club && <span className="chip" style={{ fontSize: 9, background: club.color, color: '#fff', border: '0' }}>{club.code}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.label}</div>
              </div>
              <svg width="64" height="36" viewBox="0 0 80 40" style={{ opacity: 0.85 }}>
                <g fill={ac.color}>
                  <path d="M40 4 L42 22 L58 26 L58 28 L42 28 L40 36 L38 36 L38 28 L22 28 L22 26 L38 22 Z"/>
                  <path d="M36 30 L44 30 L43 35 L37 35 Z"/>
                </g>
              </svg>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Stat label="Croisière" value={m.cruiseKt} unit="kt"/>
                <Stat label="Conso." value={m.burnLh} unit="L/h"/>
                <Stat label="Sièges" value={m.seats} unit="pl."/>
                <Stat label="Carb." value={m.fuelCapL} unit="L"/>
                <Stat label="MTOW" value={m.mtowKg} unit="kg"/>
                <Stat label="MV pesée" value={ac.massEmptyKg} unit="kg"/>
              </div>
              <div style={{ paddingTop: 10, marginTop: 10, borderTop: '1px dashed var(--hairline-soft)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="cap-sm">Tarif horaire</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--aero-red)' }}>
                    {m.hourlyEUR}<span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500, marginLeft: 2 }}>€/h</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="cap-sm">Coût par NM</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
                    {(m.hourlyEUR / m.cruiseKt).toFixed(2)}<span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500, marginLeft: 2 }}>€/NM</span>
                  </div>
                </div>
              </div>
              <div style={{ paddingTop: 10, marginTop: 10, borderTop: '1px dashed var(--hairline-soft)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <i className="fa-solid fa-gas-pump" style={{ color: m.fuelType.includes('Jet') ? 'var(--aero-blue)' : 'var(--aero-green)' }}/>
                <span style={{ fontWeight: 600 }}>{m.fuelType}</span>
                <span style={{ color: 'var(--ink-3)' }}>· Piste min. {m.minRunwayM}m</span>
                <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => onEdit(ac)}>
                  <i className="fa-solid fa-pen"/> Modifier
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelsGrid({ models, allAircraft, onEdit }: { models: Record<string, AircraftModel>; allAircraft: Aircraft[]; onEdit: (key: string, model: AircraftModel) => void }) {
  return (
    <div className="scroll" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 12, alignContent: 'start', paddingBottom: 16 }}>
      {Object.entries(models).map(([k, m]) => {
        const instances = allAircraft.filter(a => a.model === k);
        return (
          <div key={k} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="chip" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10 }}>{m.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{m.type} · {instances.length} appareil{instances.length > 1 ? 's' : ''}</div>
              </div>
              <button className="btn btn-sm" onClick={() => onEdit(k, m)}><i className="fa-solid fa-pen"/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11, marginBottom: 10 }}>
              <Stat label="Croisière" value={m.cruiseKt} unit="kt"/>
              <Stat label="Conso." value={m.burnLh} unit="L/h"/>
              <Stat label="MTOW" value={m.mtowKg} unit="kg"/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, paddingTop: 8, borderTop: '1px dashed var(--hairline-soft)' }}>
              <i className="fa-solid fa-gas-pump" style={{ color: m.fuelType.includes('Jet') ? 'var(--aero-blue)' : 'var(--aero-green)' }}/>
              <span>{m.fuelType}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--aero-red)' }} className="mono">{m.hourlyEUR}€/h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
