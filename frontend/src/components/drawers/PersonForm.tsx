import React, { useState } from 'react';
import type { Person } from '../../types';
import { AC_MODELS } from '../../data/mockData';
import { Drawer, Field, Grid, Section, ChipSelect } from './Drawer';

interface Props {
  person: Partial<Person> & { id?: string };
  onClose: () => void;
  onSave: (p: Partial<Person>) => void;
  onDelete: () => void;
}

export default function PersonForm({ person, onClose, onSave, onDelete }: Props) {
  const isNew = !person.id;
  const [draft, setDraft] = useState<Partial<Person>>({ ...person });
  const set = <K extends keyof Person>(k: K, v: Person[K]) => setDraft(d => ({ ...d, [k]: v }));

  const acOptions = Object.entries(AC_MODELS).map(([k, m]) => ({
    value: k,
    label: m.icon + ' — ' + m.label.split(' ').slice(0, 2).join(' '),
  }));

  return (
    <Drawer
      title={isNew ? 'Nouvelle personne' : `Modifier ${person.first} ${person.last}`}
      subtitle={isNew ? 'Pilote ou passager' : `ID ${person.id?.toUpperCase()}`}
      onClose={onClose}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      canDelete={!isNew}>
      <Section title="Identité" icon="fa-user">
        <Grid cols={2}>
          <Field label="Prénom">
            <input className="input" autoFocus value={draft.first || ''} onChange={e => set('first', e.target.value)}/>
          </Field>
          <Field label="Nom">
            <input className="input" value={draft.last || ''} onChange={e => set('last', e.target.value)}/>
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Poids (kg)" hint="Pour le devis de masse">
            <input type="number" className="input" min="20" max="200" value={draft.weightKg || 75}
              onChange={e => set('weightKg', Number(e.target.value))}/>
          </Field>
          <Field label="Rôle préférentiel">
            <ChipSelect multi={false}
              options={[{ value: 'CDB', label: 'CDB' }, { value: 'PAX', label: 'PAX' }, { value: 'EP', label: 'Élève Pilote (EP)' }]}
              value={draft.rolePref || 'PAX'}
              onChange={v => set('rolePref', v as 'CDB' | 'PAX')}/>
          </Field>
        </Grid>
      </Section>

      <Section title="Qualifications" icon="fa-id-card">
        <Field label="Licence" hint="Ex. PPL, LAPL, PPL+CDI, …">
          <input className="input" value={draft.license || ''} onChange={e => set('license', e.target.value)}/>
        </Field>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Avions autorisés à bord
          </label>
          <ChipSelect options={acOptions} value={draft.authorizedModels || []}
            onChange={v => set('authorizedModels', v as string[])}/>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>
            La personne ne pourra être affectée que sur ces types d'avion.
          </div>
        </div>
      </Section>
    </Drawer>
  );
}
