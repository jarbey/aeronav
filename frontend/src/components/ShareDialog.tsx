import React, { useState } from 'react';
import type { Voyage, User } from '../types';
import { USERS, aeroclubById, userById } from '../data/mockData';
import { UserAvatar } from './UserAvatar';

interface Props {
  voyage: Voyage;
  currentUser: User;
  onClose: () => void;
  onUpdate: (voyageId: string, sharedIds: string[]) => void;
}

export default function ShareDialog({ voyage, currentUser, onClose, onUpdate }: Props) {
  const [shared, setShared] = useState<string[]>(voyage.sharedWith || []);
  const candidates = USERS.filter(u => u.aeroclubId === voyage.aeroclubId && u.id !== voyage.ownerId);

  function toggle(uid: string) {
    setShared(s => s.includes(uid) ? s.filter(x => x !== uid) : [...s, uid]);
  }
  function save() { onUpdate(voyage.id, shared); onClose(); }

  return (
    <div onClick={onClose} className="modal-backdrop">
      <div onClick={e => e.stopPropagation()} className="modal" style={{ width: 520, maxHeight: '80vh' }}>
        <div className="modal-head">
          <h2><i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }}/> Partager le voyage</h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{ padding: '16px 18px' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{voyage.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Propriétaire : <b>{currentUser.first} {currentUser.last}</b></div>
          </div>
          <div className="cap-sm" style={{ marginBottom: 8 }}>
            Membres de l'aéroclub <b>{aeroclubById(voyage.aeroclubId)?.code}</b> <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>({candidates.length} disponibles)</span>
          </div>
          <div className="scroll" style={{ maxHeight: 360, overflow: 'auto', border: '1px solid var(--hairline-soft)', borderRadius: 4 }}>
            {candidates.map(u => {
              const isShared = shared.includes(u.id);
              return (
                <div key={u.id} onClick={() => toggle(u.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer',
                  borderBottom: '1px solid var(--hairline-soft)',
                  background: isShared ? 'var(--paper-2)' : 'transparent',
                }}>
                  <span style={{ width: 18, height: 18, borderRadius: 3, border: `1.5px solid ${isShared ? 'var(--aero-green-2)' : 'var(--hairline)'}`, background: isShared ? 'var(--aero-green)' : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                    {isShared ? '✓' : ''}
                  </span>
                  <UserAvatar user={u} size={28}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{u.first} {u.last}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{u.email} · {u.role}</div>
                  </div>
                  <span className="chip" style={{ fontSize: 9 }}>{u.provider}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 4, fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
            <i className="fa-solid fa-circle-info" style={{ marginTop: 2 }}/>
            <span>Les personnes invitées pourront consulter le voyage et voir le décompte des frais.</span>
          </div>
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontSize: 11, color: 'var(--ink-3)' }}>
            {shared.length} personne{shared.length > 1 ? 's' : ''} invitée{shared.length > 1 ? 's' : ''}
          </div>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save}><i className="fa-solid fa-check"/> Enregistrer le partage</button>
        </div>
      </div>
    </div>
  );
}
