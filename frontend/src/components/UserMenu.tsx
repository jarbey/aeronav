import React from 'react';
import type { User } from '../types';
import { aeroclubById } from '../data/mockData';
import { UserAvatar } from './UserAvatar';

interface Props {
  currentUser: User;
  onClose: () => void;
  onLogout: () => void;
}

export default function UserMenu({ currentUser, onClose, onLogout }: Props) {
  const club = aeroclubById(currentUser.aeroclubId);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'transparent' }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 60, right: 14, width: 340,
        background: 'var(--surface-card)', border: '1px solid var(--hairline)',
        borderRadius: 8, boxShadow: '0 16px 48px -8px rgba(11,34,64,0.4)', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #1a3556, #0b2240)', color: '#f3ecd6', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserAvatar user={currentUser} size={42}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUser.first} {currentUser.last}</div>
            <div style={{ fontSize: 10.5, color: '#c4b88a' }}>{currentUser.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              {currentUser.provider === 'google' && <i className="fa-brands fa-google" style={{ fontSize: 10, color: '#ffcf52' }}/>}
              {currentUser.provider === 'microsoft' && <i className="fa-brands fa-microsoft" style={{ fontSize: 10, color: '#ffcf52' }}/>}
              {currentUser.provider === 'apple' && <i className="fa-brands fa-apple" style={{ fontSize: 10, color: '#ffcf52' }}/>}
              {currentUser.provider === 'facebook' && <i className="fa-brands fa-facebook-f" style={{ fontSize: 10, color: '#ffcf52' }}/>}
              {currentUser.provider === 'local' && <i className="fa-solid fa-envelope" style={{ fontSize: 10, color: '#ffcf52' }}/>}
              <span style={{ fontSize: 9.5, color: '#c4b88a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>connecté via {currentUser.provider === 'local' ? 'email' : currentUser.provider}</span>
            </div>
          </div>
        </div>
        {club && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 4, background: club.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{club.code}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{club.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                <span className="mono">{club.base}</span> · {currentUser.role}
              </div>
            </div>
          </div>
        )}
        <div style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
          <button onClick={onLogout} className="btn" style={{ width: '100%', justifyContent: 'center', color: 'var(--aero-red)' }}>
            <i className="fa-solid fa-arrow-right-from-bracket"/> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
