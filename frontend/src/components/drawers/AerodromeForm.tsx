import React, { useState } from 'react';
import type { Aerodrome } from '../../types';
import { Drawer, Field, Grid, Section, Toggle, ChipSelect, UnitInput } from './Drawer';

interface Props {
  aerodrome: Partial<Aerodrome> & { __isNew?: boolean };
  onClose: () => void;
  onSave: (ad: Aerodrome) => void;
  onDelete: () => void;
}

export default function AerodromeForm({ aerodrome, onClose, onSave, onDelete }: Props) {
  const isNew = !aerodrome.icao || aerodrome.__isNew;
  const [draft, setDraft] = useState<Partial<Aerodrome>>(() => {
    const d = { ...aerodrome } as Partial<Aerodrome> & { __isNew?: boolean };
    delete d.__isNew;
    if (!d.runways) d.runways = [{ qfu: '', lengthM: 0, surface: 'Revêtue' }];
    return d;
  });
  const set = <K extends keyof Aerodrome>(k: K, v: Aerodrome[K]) => setDraft(d => ({ ...d, [k]: v }));
  const setRunway = (k: string, v: string | number) => setDraft(d => ({ ...d, runways: [{ ...(d.runways?.[0] || { qfu: '', lengthM: 0, surface: 'Revêtue' }), [k]: v }] }));

  return (
    <Drawer
      title={isNew ? 'Nouvel aérodrome' : `Modifier ${aerodrome.icao} — ${aerodrome.name}`}
      subtitle={isNew ? 'Référence terrain' : aerodrome.city}
      onClose={onClose}
      onSave={() => onSave({ __isNew: isNew, ...draft } as Aerodrome)}
      onDelete={onDelete}
      canDelete={!isNew}
      width={560}>

      <Section title="Identité" icon="fa-tower-control">
        <Grid cols={3}>
          <Field label="Code OACI" hint="4 lettres">
            <input className="input" autoFocus value={draft.icao || ''}
              onChange={e => set('icao', e.target.value.toUpperCase())}
              maxLength={4} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}/>
          </Field>
          <Field label="Nom" span={2}>
            <input className="input" value={draft.name || ''} onChange={e => set('name', e.target.value)}/>
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Ville">
            <input className="input" value={draft.city || ''} onChange={e => set('city', e.target.value)}/>
          </Field>
          <Field label="Service ATS">
            <select className="select" value={draft.atc || 'Aucun'} onChange={e => set('atc', e.target.value)}>
              <option>Aucun</option>
              <option>AFIS</option>
              <option>Tour</option>
              <option>Tour+Approche</option>
              <option>MIL</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Position" icon="fa-location-dot">
        <Grid cols={3}>
          <Field label="Latitude" hint="° N (décimaux)">
            <input type="number" step="0.0001" className="input" value={draft.coord ? draft.coord[1] : 0}
              onChange={e => setDraft(d => ({ ...d, coord: [(d.coord?.[0] || 0), Number(e.target.value)] }))}/>
          </Field>
          <Field label="Longitude" hint="° E (négatif=W)">
            <input type="number" step="0.0001" className="input" value={draft.coord ? draft.coord[0] : 0}
              onChange={e => setDraft(d => ({ ...d, coord: [Number(e.target.value), (d.coord?.[1] || 0)] }))}/>
          </Field>
          <Field label="Altitude (ft)">
            <UnitInput value={draft.elevation || 0} unit="ft" onChange={v => set('elevation', v)}/>
          </Field>
        </Grid>
      </Section>

      <Section title="Piste principale" icon="fa-road">
        <Grid cols={3}>
          <Field label="QFU" hint="ex. 03/21">
            <input className="input" value={draft.runways?.[0]?.qfu || ''}
              onChange={e => setRunway('qfu', e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}/>
          </Field>
          <Field label="Longueur">
            <UnitInput value={draft.runways?.[0]?.lengthM || 0} unit="m" onChange={v => setRunway('lengthM', v)}/>
          </Field>
          <Field label="Nature">
            <select className="select" value={draft.runways?.[0]?.surface || 'Revêtue'}
              onChange={e => setRunway('surface', e.target.value)}>
              <option>Revêtue</option>
              <option>Herbe</option>
              <option>Stabilisée</option>
              <option>Eau</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Carburants & Services" icon="fa-gas-pump">
        <Field label="Carburants disponibles">
          <ChipSelect options={['100LL', 'Jet-A1', 'MOGAS / UL91']}
            value={draft.fuel || []} onChange={v => set('fuel', v as string[])}/>
        </Field>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Toggle label="Utilisable de nuit" value={draft.night || false} onChange={v => set('night', v)}/>
          <Toggle label="PPR (autorisation préalable)" value={draft.ppr || false} onChange={v => set('ppr', v)}/>
        </div>
      </Section>

      <Section title="Taxes" icon="fa-coins">
        <Grid cols={2}>
          <Field label="Atterrissage (par avion)" hint="Forfait facturé à chaque CDB">
            <UnitInput value={draft.taxLandingEUR || 0} unit="€" onChange={v => set('taxLandingEUR', v)}/>
          </Field>
          <Field label="Parking (par avion)" hint="Appliqué aux escales intermédiaires">
            <UnitInput value={draft.taxParkingEUR || 0} unit="€" onChange={v => set('taxParkingEUR', v)}/>
          </Field>
        </Grid>
      </Section>

      <Section title="Notes" icon="fa-note-sticky">
        <Field label="Remarques opérationnelles">
          <textarea className="input" rows={3} value={draft.note || ''}
            onChange={e => set('note', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
        </Field>
      </Section>
    </Drawer>
  );
}
