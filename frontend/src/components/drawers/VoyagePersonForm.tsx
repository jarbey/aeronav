import React, { useState, useEffect, useRef } from 'react';
import type { Person, Variant, User } from '../../types';
import { userForPerson, userByEmail, personById, aeroclubById, AC_MODELS, USERS } from '../../data/mockData';
import { Drawer, Field, Grid, Section, ChipSelect } from './Drawer';

function MemberAutocomplete({ value, onChange, disabled, autoFocus }: {
  value: string; onChange: (email: string) => void; disabled?: boolean; autoFocus?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = query.trim()
    ? USERS.filter(u => {
        const q = query.toLowerCase();
        return `${u.first} ${u.last}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  function select(u: User) { onChange(u.email); setQuery(u.email); setOpen(false); }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input type="text" className="input" autoFocus={autoFocus} disabled={disabled}
          placeholder="Nom, prénom ou email…" value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ paddingRight: 28 }}/>
        {query && !disabled && (
          <button onClick={() => { onChange(''); setQuery(''); }}
            style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}>
            <i className="fa-solid fa-xmark" style={{ fontSize: 11 }}/>
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: 'var(--paper)', border: '1px solid var(--hairline)', borderTop: 0, borderRadius: '0 0 4px 4px', boxShadow: '0 6px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
          {suggestions.map(u => (
            <div key={u.id} onMouseDown={() => select(u)}
              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `var(--plane-${(u.id.charCodeAt(1) % 6) + 1})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                {(u.first[0] + (u.last?.[0] ?? '')).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{u.first} {u.last}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              </div>
              <span className={`chip ${u.role === 'Admin' ? 'info' : ''}`} style={{ fontSize: 9 }}>{u.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  // "locked" only when a Person record is actually linked — not just because a User account was found
  const locked = !!linkedPerson;
  const basePerson = linkedPerson || (person as Person);

  const existingOverride = (variant.personOverrides && basePerson.id ? variant.personOverrides[basePerson.id] : null) || {};

  // Pre-fill name from User account when no linked Person exists yet
  const [first, setFirst] = useState(basePerson.first || matchedUser?.first || '');
  const [last, setLast] = useState(basePerson.last || matchedUser?.last || '');
  const [license, setLicense] = useState(basePerson.license || '');
  const [rolePref, setRolePref] = useState<'CDB' | 'PAX' | 'EP'>(basePerson.rolePref || 'PAX');
  const [globalWeight, setGlobalWeight] = useState(basePerson.weightKg || 75);
  const [globalAuth, setGlobalAuth] = useState<string[]>(basePerson.authorizedModels || []);
  const [voyageWeight, setVoyageWeight] = useState(existingOverride.weightKg != null ? existingOverride.weightKg : (basePerson.weightKg || 75));
  const [voyageAuth, setVoyageAuth] = useState<string[]>((existingOverride.authorizedModels && existingOverride.authorizedModels.length > 0) ? existingOverride.authorizedModels : (basePerson.authorizedModels || []));

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
    } else if (matchedUser) {
      // User found but no Person yet — pre-fill name fields
      setFirst(matchedUser.first || '');
      setLast(matchedUser.last || '');
    }
  }, [linkedPerson?.id, matchedUser?.id]);

  const acOptions = Object.entries(AC_MODELS).map(([k, m]) => ({
    value: k, label: m.icon + ' — ' + m.label.split(' ').slice(0, 2).join(' '),
  }));

  const canDelete = !isNew && !matchedUser;

  const canSave = first.trim().length > 0; // only first name required

  function handleSave() {
    if (!canSave) return;
    if (matchedUser) {
      const override: { weightKg?: number; authorizedModels?: string[]; rolePref?: 'CDB' | 'PAX' | 'EP' } = {};
      if (voyageWeight !== basePerson.weightKg) override.weightKg = voyageWeight;
      if (JSON.stringify(voyageAuth) !== JSON.stringify(basePerson.authorizedModels)) override.authorizedModels = voyageAuth;
      if (rolePref !== basePerson.rolePref) override.rolePref = rolePref;
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
      title={isNew ? 'Ajouter une personne au voyage' : `Modifier ${[basePerson.first, basePerson.last].filter(Boolean).join(' ')}`}
      subtitle={matchedUser
        ? `Compte ${aeroclubById(matchedUser.aeroclubId)?.code || ''} · ${matchedUser.email}`
        : (isNew ? 'Inviter ou créer un nouveau profil' : 'Profil libre (non lié à un compte)')}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={canSave ? 'Enregistrer' : 'Prénom requis'}
      onDelete={onDelete}
      canDelete={canDelete}>

      <Section title="Identification" icon="fa-envelope">
        <Field label="Email" hint={
          linkedPerson ? '✓ Compte lié — identité synchronisée.' :
          matchedUser ? '✓ Compte trouvé — complétez le profil pilote ci-dessous.' :
          (email && emailTouched ? 'Aucun compte avec cet email — un profil libre sera créé.' :
            'Saisissez l\'email pour rechercher un compte existant.')
        }>
          <MemberAutocomplete
            value={email}
            autoFocus={isNew}
            disabled={!isNew && !!linkedUserInit}
            onChange={v => { setEmail(v); setEmailTouched(true); }}
          />
          {matchedUser && (
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--aero-green-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-check-circle"/> Membre trouvé
            </div>
          )}
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
        {matchedUser && !linkedPerson && (
          <div style={{ padding: '8px 10px', background: '#e3efe6', border: '1px solid #c5dbcc', borderRadius: 4, marginBottom: 10, fontSize: 11, color: 'var(--ink-2)' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: 5, color: 'var(--aero-green-2)' }}/>
            Compte trouvé mais pas encore de profil pilote. Complétez les informations ci-dessous pour créer sa fiche.
          </div>
        )}
        <Grid cols={2}>
          <Field label="Prénom *">
            <input className="input" value={first} disabled={locked} onChange={e => setFirst(e.target.value)} placeholder="Prénom"/>
          </Field>
          <Field label="Nom" hint="Optionnel">
            <input className="input" value={last} disabled={locked} onChange={e => setLast(e.target.value)} placeholder="Nom de famille"/>
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Licence" hint={locked ? 'Saisie par l\'utilisateur' : 'PPL, LAPL, …'}>
            <input className="input" value={license} disabled={locked} onChange={e => setLicense(e.target.value)}/>
          </Field>
          {!locked && (
            <Field label="Rôle préférentiel">
              <ChipSelect multi={false}
                options={[{ value: 'CDB', label: 'CDB' }, { value: 'PAX', label: 'PAX' }, { value: 'EP', label: 'Élève Pilote (EP)' }]}
                value={rolePref}
                onChange={v => setRolePref(v as 'CDB' | 'PAX' | 'EP')}/>
            </Field>
          )}
        </Grid>
      </Section>

      <Section title="Pour ce voyage" icon="fa-route">
        {locked && (
          <>
            <div style={{ padding: '8px 10px', background: '#d8e6f3', border: '1px solid #b9d0e6', borderRadius: 4, marginBottom: 10, fontSize: 11, color: 'var(--aero-blue-2)' }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: 5 }}/>
              Le <b>rôle, poids et avions autorisés</b> ci-dessous s'appliquent à <b>tout ce voyage</b> (toutes les étapes) ; le profil global n'est pas modifié.
            </div>
            <Field label="Rôle pour ce voyage">
              <ChipSelect multi={false}
                options={[{ value: 'CDB', label: 'CDB (pilote)' }, { value: 'PAX', label: 'PAX (passager)' }, { value: 'EP', label: 'Élève Pilote (EP)' }]}
                value={rolePref}
                onChange={v => setRolePref(v as 'CDB' | 'PAX' | 'EP')}/>
            </Field>
          </>
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
              <i className="fa-solid fa-triangle-exclamation"/> Surchargé pour tout le voyage.
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
