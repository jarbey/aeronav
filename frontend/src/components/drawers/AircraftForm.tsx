import React, { useState } from 'react';
import type { Aircraft } from '../../types';
import { AC_MODELS } from '../../data/mockData';
import { Drawer, Field, Grid, Section, KV, UnitInput } from './Drawer';

interface Props {
  aircraft: Partial<Aircraft> & { id?: string };
  onClose: () => void;
  onSave: (ac: Partial<Aircraft>) => void;
  onDelete: () => void;
}

const COLOR_OPTIONS = [
  'var(--plane-1)', 'var(--plane-2)', 'var(--plane-3)',
  'var(--plane-4)', 'var(--plane-5)', 'var(--plane-6)',
];

export default function AircraftForm({ aircraft, onClose, onSave, onDelete }: Props) {
  const isNew = !aircraft.id;
  const [draft, setDraft] = useState<Partial<Aircraft>>({ ...aircraft });
  const set = <K extends keyof Aircraft>(k: K, v: Aircraft[K]) => setDraft(d => ({ ...d, [k]: v }));
  const m = AC_MODELS[draft.model || ''];

  return (
    <Drawer
      title={isNew ? 'Nouvel avion' : `Modifier ${aircraft.reg}`}
      subtitle={m ? m.label : ''}
      onClose={onClose}
      onSave={() => onSave({ ...draft, ...(aircraft.id ? { id: aircraft.id } : {}) })}
      onDelete={onDelete}
      canDelete={!isNew}>
      <Section title="Immatriculation" icon="fa-plane">
        <Grid cols={2}>
          <Field label="Immatriculation" hint="ex. F-GAAA">
            <input className="input" autoFocus value={draft.reg || ''}
              onChange={e => set('reg', e.target.value.toUpperCase())} maxLength={7}/>
          </Field>
          <Field label="Indicatif radio">
            <input className="input" value={draft.callsign || ''}
              onChange={e => set('callsign', e.target.value.toUpperCase())}/>
          </Field>
        </Grid>
        <Field label="Masse à vide (fiche de pesée)" hint="kg — propre à cet appareil">
          <UnitInput value={draft.massEmptyKg ?? 0} unit="kg" onChange={v => set('massEmptyKg', v)}/>
        </Field>
        <Field label="Couleur d'identification">
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {COLOR_OPTIONS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)} style={{
                width: 28, height: 28, borderRadius: 4, background: c,
                border: `2px solid ${draft.color === c ? 'var(--ink)' : 'transparent'}`,
                cursor: 'pointer',
                boxShadow: draft.color === c ? '0 0 0 2px var(--ink) inset, 0 0 0 4px var(--surface) inset' : 'none',
              }}/>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Modèle" icon="fa-cogs">
        <Field label="Modèle de l'avion">
          <select className="select" value={draft.model || ''} onChange={e => set('model', e.target.value)}>
            {Object.entries(AC_MODELS).map(([k, mm]) => (
              <option key={k} value={k}>{mm.label}</option>
            ))}
          </select>
        </Field>
        {m && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 4, fontSize: 11 }}>
            <div className="cap-sm" style={{ marginBottom: 8 }}>Caractéristiques modèle (lecture seule)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <KV k="Type" v={m.type}/>
              <KV k="Carb." v={m.fuelType}/>
              <KV k="Sièges" v={`${m.seats} pl.`}/>
              <KV k="Croisière" v={`${m.cruiseKt} kt`}/>
              <KV k="Conso." v={`${m.burnLh} L/h`}/>
              <KV k="Capacité" v={`${m.fuelCapL} L`}/>
              <KV k="MTOW" v={`${m.mtowKg} kg`}/>
              <KV k="Tarif" v={`${m.hourlyEUR} €/h`}/>
            </div>
          </div>
        )}
      </Section>
    </Drawer>
  );
}
