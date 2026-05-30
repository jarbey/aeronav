import React, { useState, useEffect } from 'react';
import type { Person, Variant } from '../../types';
import { userForPerson, userByEmail, personById, aeroclubById, AC_MODELS } from '../../data/mockData';
import { Drawer, Field, Grid, Section, ChipSelect } from './Drawer';

type SaveResult =
  | { kind: 'linked'; personId: string; override: { weightKg?: number; authorizedModels?: string[] } }
  | { kind: 'standalone'; person: Person };

interface Props {
  person: Partial<Person> & { id?: string };
  variant: Variant;
  onClose: () => void;
  onSave: (result: SaveResult) => void;
  onDelete: () => void;
}

export default function VoyagePersonForm({ person, variant, onClose, onSave, onDelete }: Props) {
  const isNew = !person.id;
  const linkedUserInit = !isNew && person.id ? userForPerson(person.id) : null;

  const [email, setEmail] = useState(linkedUserInit?.email || '');
  const [emailTouched, setEmailTouched] = useState(false);
  const matchedUser = !isNew ? linkedUserInit : (emailTouched && email ? userByEmail(email) : undefined);
  const linkedPerson = matchedUser?.personId ? personById(matchedUser.personId) : null;
  const basePerson = linkedPerson || (person as Person);

  const existingOverride = (variant.personOverrides && basePerson.id ? variant.personOverrides[basePerson.id] : null) || {};

  const [first, setFirst] = useState(basePerson.first || '');
  const [last, setLast] = useState(basePerson.last || '');
  const [license, setLicense] = useState(basePerson.license || '');
  const [rolePref, setRolePref] = useState<'CDB' | 'PAX'>(basePerson.rolePref || 'PAX');
  const [globalWeight, setGlobalWeight] = useState(basePerson.weightKg || 75);
  const [globalAuth, setGlobalAuth] = useState<string[]>(basePerson.authorizedModels || []);
  const [voyageWeight, setVoyageWeight] = useState(existingOverride.weightKg != null ? existingOverride.weightKg : (basePerson.weightKg || 75));
  const [voyageAuth, setVoyageAuth] = useState<string[]>(existingOverride.authorizedModels || basePerson.authorizedModels || []);

  useEffect(() => {
    if (linkedPerson) {
      setFirst(linkedPerson.first);
      setLast(linkedPerson.last);
      setLicense(linkedPerson.license);
      setRolePref(linkedPerson.rolePref);
      setGlobalWeight(linkedPerson.weightKg);
      setGlobalAuth(linkedPerson.authorizedModels);
      const ov = (variant.personOverrides && variant.personOverrides[linkedPerson.id]) || {};
      setVoyageWeight(ov.weightKg != null ? ov.weightKg : linkedPerson.weightKg);
      setVoyageAuth(ov.authorizedModels || linkedPerson.authorizedModels);
    }
  }, [linkedPerson?.id]);

  const acOptions = Object.entries(AC_MODELS).map(([k, m]) => ({
    value: k, label: m.icon + ' — ' + m.label.split(' ').slice(0, 2).join(' '),
  }));

  const locked = !!matchedUser;
  const canDelete = !isNew && !matchedUser;

  function handleSave() {
    if (matchedUser) {
      const override: { weightKg?: number; authorizedModels?: string[] } = {};
      if (voyageWeight !== basePerson.weightKg) override.weightKg = voyageWeight;
      if (JSON.stringify(voyageAuth) !== JSON.stringify(basePerson.authorizedModels)) override.authorizedModels = voyageAuth;
      onSave({ kind: 'linked', personId: basePerson.id, override });
    } else {
      onSave({
        kind: 'standalone',
        person: {
          ...person,
          first: first.trim(), last: last.trim(),
          weightKg: globalWeight, license, rolePref,
          authorizedModels: globalAuth,
        } as Person,
      });
    }
  }

  return (
    <Drawer
      title={isNew ? 'Ajouter une personne au voyage' : `Modifier ${basePerson.first} ${basePerson.last}`}
      subtitle={matchedUser
        ? `Compte ${aeroclubById(matchedUser.aeroclubId)?.code || ''} · ${matchedUser.email}`
        : (isNew ? 'Inviter ou créer un nouveau profil' : 'Profil libre (non lié à un compte)')}
      onClose={onClose}
      onSave={handleSave}
      onDelete={onDelete}
      canDelete={canDelete}>

      <Section title="Identification" icon="fa-envelope">
        <Field label="Email" hint={
          matchedUser ? '✓ Compte trouvé — les infos d\'identité sont synchronisées.' :
          (email && emailTouched ? 'Aucun compte avec cet email — un profil libre sera créé.' :
            'Saisissez l\'email pour rechercher un compte existant.')
        }>
          <div style={{ position: 'relative' }}>
            <input type="email" className="input"
              placeholder="prenom.nom@aero-club.fr"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailTouched(true); }}
              autoFocus={isNew}
              disabled={!isNew && !!linkedUserInit}
              style={{ paddingRight: 30 }}/>
            {matchedUser && <i className="fa-solid fa-check-circle" style={{ position: 'absolute', right: 8, top: 9, color: 'var(--aero-green)' }}/>}
            {!matchedUser && email && emailTouched && <i className="fa-solid fa-circle-plus" style={{ position: 'absolute', right: 8, top: 9, color: 'var(--aero-amber)' }}/>}
          </div>
        </Field>
        {matchedUser && (
          <div style={{ padding: '10px 12px', background: '#e3efe6', border: '1px solid #c5dbcc', borderRadius: 4, marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: `var(--plane-${(basePerson.id?.charCodeAt(1) || 0) % 6 + 1})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
              {((basePerson.first?.[0] || '') + (basePerson.last?.[0] || '')).toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{matchedUser.first} {matchedUser.last}</div>
              <div style={{ fontSize: 10.5, color: 'var(--aero-green-2)' }}>{matchedUser.role} · ID utilisateur {matchedUser.id.toUpperCase()}</div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Identité" icon="fa-user">
        {locked && (
          <div style={{ padding: '8px 10px', background: '#fff7df', border: '1px solid #e6cf83', borderRadius: 4, marginBottom: 10, fontSize: 11, color: 'var(--ink-2)' }}>
            <i className="fa-solid fa-lock" style={{ marginRight: 5, color: 'var(--aero-amber)' }}/>
            <b>Prénom, nom et licence</b> sont gérés par l'utilisateur lui-même et ne sont pas modifiables ici.
          </div>
        )}
        <Grid cols={2}>
          <Field label="Prénom">
            <input className="input" value={first} disabled={locked} onChange={e => setFirst(e.target.value)}/>
          </Field>
          <Field label="Nom">
            <input className="input" value={last} disabled={locked} onChange={e => setLast(e.target.value)}/>
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Licence" hint={locked ? 'Saisie par l\'utilisateur' : 'PPL, LAPL, …'}>
            <input className="input" value={license} disabled={locked} onChange={e => setLicense(e.target.value)}/>
          </Field>
          <Field label="Rôle préférentiel">
            <ChipSelect multi={false}
              options={[{ value: 'CDB', label: 'CDB' }, { value: 'PAX', label: 'PAX' }]}
              value={rolePref}
              onChange={v => !locked && setRolePref(v as 'CDB' | 'PAX')}/>
          </Field>
        </Grid>
      </Section>

      <Section title="Pour ce voyage" icon="fa-route">
        {locked && (
          <div style={{ padding: '8px 10px', background: '#d8e6f3', border: '1px solid #b9d0e6', borderRadius: 4, marginBottom: 10, fontSize: 11, color: 'var(--aero-blue-2)' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: 5 }}/>
            Le <b>poids et les avions autorisés</b> ci-dessous ne s'appliquent qu'à <b>ce voyage</b> ; le profil global n'est pas modifié.
          </div>
        )}
        <Field label={locked ? 'Poids pour ce voyage' : 'Poids'}
          hint={locked && voyageWeight !== basePerson.weightKg ? `Profil global : ${basePerson.weightKg} kg — surchargé à ${voyageWeight} kg` : 'Pour le devis de masse'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" className="input" min="20" max="200" style={{ flex: 1 }}
              value={locked ? voyageWeight : globalWeight}
              onChange={e => locked ? setVoyageWeight(Number(e.target.value)) : setGlobalWeight(Number(e.target.value))}/>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }} className="mono">kg</span>
            {locked && voyageWeight !== basePerson.weightKg && (
              <button className="btn btn-sm btn-ghost" onClick={() => setVoyageWeight(basePerson.weightKg)} title="Revenir au poids du profil">
                <i className="fa-solid fa-rotate-left"/>
              </button>
            )}
          </div>
        </Field>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            {locked ? 'Avions autorisés pour ce voyage' : 'Avions autorisés à bord'}
          </label>
          <ChipSelect options={acOptions}
            value={locked ? voyageAuth : globalAuth}
            onChange={v => locked ? setVoyageAuth(v as string[]) : setGlobalAuth(v as string[])}/>
          {locked && JSON.stringify(voyageAuth) !== JSON.stringify(basePerson.authorizedModels) && (
            <div style={{ fontSize: 10, color: 'var(--aero-amber)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-triangle-exclamation"/> Surchargé pour ce voyage.
              <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}
                onClick={() => setVoyageAuth(basePerson.authorizedModels)}>
                <i className="fa-solid fa-rotate-left"/> Réinitialiser
              </button>
            </div>
          )}
        </div>
      </Section>
    </Drawer>
  );
}
