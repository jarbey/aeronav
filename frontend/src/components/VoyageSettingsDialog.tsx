import React, { useState } from 'react';
import type { Voyage, User } from '../types';
import { aircraftForUser } from '../data/mockData';

interface Props {
  voyage: Voyage;
  currentUser: User;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Voyage>) => void;
  onDelete: (id: string) => void;
}

export default function VoyageSettingsDialog({ voyage, currentUser, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(voyage.title);
  const [date, setDate] = useState(voyage.date?.slice(0, 10) ?? '');
  const [status, setStatus] = useState(voyage.status);
  const [aircraftIds, setAircraftIds] = useState<string[]>(voyage.aircraftIds || []);
  const isOwner = voyage.ownerId === currentUser.id;

  const clubAircraft = aircraftForUser(currentUser);

  function toggleAircraft(acId: string) {
    setAircraftIds(prev =>
      prev.includes(acId) ? prev.filter(id => id !== acId) : [...prev, acId]
    );
  }

  function save() {
    const basePatch: Partial<Voyage> = {
      title: title.trim() || voyage.title,
      date,
      status,
    };
    // Always include aircraftIds — save in one call so syncVariantCrewsToAircraft runs
    onSave(voyage.id, { ...basePatch, aircraftIds });
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,34,64,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="modal" style={{ width: 520 }}>
        <div className="modal-head">
          <h2><i className="fa-solid fa-gear" style={{ marginRight: 6 }}/> Paramètres du voyage</h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Titre</label>
            <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}>
            <div className="field">
              <label>Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)}/>
            </div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={status} onChange={e => setStatus(e.target.value as Voyage['status'])}>
                <option value="draft">Brouillon</option>
                <option value="planning">En préparation</option>
                <option value="ongoing">En cours</option>
                <option value="completed">Terminé</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Avions du voyage</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {clubAircraft.map(ac => {
                const checked = aircraftIds.includes(ac.id);
                return (
                  <label key={ac.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px',
                    border: `1px solid ${checked ? 'var(--ink)' : 'var(--hairline)'}`,
                    borderRadius: 4,
                    background: checked ? 'var(--surface-card)' : 'var(--paper)',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAircraft(ac.id)}
                      style={{ accentColor: ac.color, width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <span style={{ width: 8, height: 20, borderRadius: 2, background: ac.color, flexShrink: 0 }}/>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>{ac.reg}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ac.callsign}</span>
                  </label>
                );
              })}
              {clubAircraft.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucun avion disponible pour votre aéroclub.</div>
              )}
            </div>
          </div>

          {!isOwner && (
            <div style={{ padding: '8px 12px', background: '#fff7df', border: '1px solid #e6cf83', borderRadius: 4, fontSize: 11, color: 'var(--ink-2)' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4, color: 'var(--aero-amber)' }}/>
              Vous n'êtes pas propriétaire — seules vos suggestions peuvent être appliquées.
            </div>
          )}
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOwner && (
            <button className="btn" style={{ color: 'var(--aero-red)' }}
              onClick={() => { if (window.confirm(`Supprimer le voyage "${voyage.title}" ? Cette action est définitive.`)) { onDelete(voyage.id); onClose(); } }}>
              <i className="fa-solid fa-trash"/> Supprimer le voyage
            </button>
          )}
          <div style={{ flex: 1 }}/>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save}><i className="fa-solid fa-check"/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
