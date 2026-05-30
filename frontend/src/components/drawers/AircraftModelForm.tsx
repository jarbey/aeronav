import React, { useState } from 'react';
import type { AircraftModel } from '../../types';
import { Drawer, Field, Grid, Section, UnitInput } from './Drawer';

interface Props {
  modelKey: string;
  model: Partial<AircraftModel>;
  onClose: () => void;
  onSave: (key: string, model: AircraftModel, isNew: boolean) => void;
  onDelete: () => void;
}

export default function AircraftModelForm({ modelKey, model, onClose, onSave, onDelete }: Props) {
  const isNew = !modelKey;
  const [draft, setDraft] = useState<Partial<AircraftModel> & { _key?: string }>({ ...model, _key: modelKey || '' });
  const set = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <Drawer
      title={isNew ? "Nouveau modèle d'avion" : `Modèle — ${model.label}`}
      subtitle={modelKey || ''}
      onClose={onClose}
      onSave={() => {
        const k = (draft._key || '').trim().toUpperCase().replace(/\s+/g, '-');
        const m = { ...draft } as AircraftModel & { _key?: string };
        delete m._key;
        onSave(k, m as AircraftModel, isNew);
      }}
      onDelete={onDelete}
      canDelete={!isNew}>
      <Section title="Identification" icon="fa-tag">
        <Grid cols={2}>
          <Field label="Code interne" hint="Ex. DR400-155">
            <input className="input" value={draft._key || ''} disabled={!isNew}
              onChange={e => set('_key', e.target.value)}/>
          </Field>
          <Field label="Code badge" hint="Affiché sur les chips (3-6 lettres)">
            <input className="input" value={draft.icon || ''}
              onChange={e => set('icon', e.target.value.toUpperCase())} maxLength={8}/>
          </Field>
        </Grid>
        <Field label="Désignation">
          <input className="input" value={draft.label || ''} onChange={e => set('label', e.target.value)}/>
        </Field>
        <Grid cols={2}>
          <Field label="Type">
            <input className="input" value={draft.type || ''} onChange={e => set('type', e.target.value)}/>
          </Field>
          <Field label="Carburant">
            <select className="select" value={draft.fuelType || 'Jet-A1'} onChange={e => set('fuelType', e.target.value)}>
              <option>Jet-A1</option>
              <option>100LL</option>
              <option>MOGAS / UL91</option>
              <option>Jet-A1 / MOGAS</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Performances" icon="fa-gauge-high">
        <Grid cols={3}>
          <Field label="Vitesse croisière">
            <UnitInput value={draft.cruiseKt || 0} unit="kt" onChange={v => set('cruiseKt', v)}/>
          </Field>
          <Field label="Consommation">
            <UnitInput value={draft.burnLh || 0} unit="L/h" onChange={v => set('burnLh', v)}/>
          </Field>
          <Field label="Capacité carb.">
            <UnitInput value={draft.fuelCapL || 0} unit="L" onChange={v => set('fuelCapL', v)}/>
          </Field>
          <Field label="Sièges">
            <UnitInput value={draft.seats || 4} unit="pl." onChange={v => set('seats', v)}/>
          </Field>
          <Field label="Piste min.">
            <UnitInput value={draft.minRunwayM || 0} unit="m" onChange={v => set('minRunwayM', v)}/>
          </Field>
          <Field label="Tarif horaire">
            <UnitInput value={draft.hourlyEUR || 0} unit="€/h" onChange={v => set('hourlyEUR', v)}/>
          </Field>
        </Grid>
      </Section>

      <Section title="Masses" icon="fa-weight-hanging">
        <Grid cols={2}>
          <Field label="MTOW">
            <UnitInput value={draft.mtowKg || 0} unit="kg" onChange={v => set('mtowKg', v)}/>
          </Field>
          <Field label="MLDW">
            <UnitInput value={draft.mldwKg || 0} unit="kg" onChange={v => set('mldwKg', v)}/>
          </Field>
        </Grid>
      </Section>
    </Drawer>
  );
}
