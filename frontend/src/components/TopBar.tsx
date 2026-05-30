import React from 'react';
import type { Voyage, User } from '../types';
import { voyagesForUser, aircraftForUser, aeroclubById, USERS } from '../data/mockData';
import { useAerodromes } from '../api/aerodromes';
import { UserAvatar } from './UserAvatar';
import type { AppTab } from '../types';

interface TopBarProps {
  tab: AppTab;
  onTab: (tab: AppTab) => void;
  voyage: Voyage | null;
  currentUser: User;
  onUserMenu: () => void;
  version?: number;
}

export default function TopBar({ tab, onTab, voyage, currentUser, onUserMenu, version }: TopBarProps) {
  const club = aeroclubById(currentUser.aeroclubId);
  const voyageCount = voyagesForUser(currentUser.id).length;
  const aircraftCount = aircraftForUser(currentUser).length;
  const { data: aerodromes } = useAerodromes();
  const aerodromeCount = aerodromes?.length ?? '…';
  const teamCount = USERS.filter(u => u.aeroclubId === currentUser.aeroclubId).length;
  void version;

  return (
    <header className="topbar">
      <div className="brand">
        <svg className="logo" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="#ffcf52" strokeWidth="1.5" fill="none" opacity="0.4"/>
          <circle cx="20" cy="20" r="13" stroke="#ffcf52" strokeWidth="0.8" fill="none" opacity="0.6"/>
          <path d="M20 5 L24 22 L20 28 L16 22 Z" fill="#ffcf52"/>
          <path d="M20 28 L20 36" stroke="#ffcf52" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="20" cy="20" r="2" fill="#0b2240" stroke="#ffcf52" strokeWidth="1"/>
        </svg>
        <div>
          <div className="name">AeroNav</div>
          <div className="sub">Voyage Planner</div>
        </div>
      </div>
      <nav className="tabs">
        <button className={tab === 'voyages' ? 'active' : ''} onClick={() => onTab('voyages')}>
          <i className="fa-solid fa-folder-open"/> Mes voyages <span className="num">{voyageCount}</span>
        </button>
        <button className={tab === 'voyage' ? 'active' : ''} onClick={() => onTab('voyage')} disabled={!voyage}>
          <i className="fa-solid fa-route"/> Voyage
          {voyage ? <span className="num" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{voyage.title.split('—')[1]?.trim() || voyage.title}</span> : null}
        </button>
        <button className={tab === 'aircraft' ? 'active' : ''} onClick={() => onTab('aircraft')}>
          <i className="fa-solid fa-plane"/> Avions <span className="num">{aircraftCount}</span>
        </button>
        <button className={tab === 'aerodromes' ? 'active' : ''} onClick={() => onTab('aerodromes')}>
          <i className="fa-solid fa-tower-control"/> Aérodromes <span className="num">{aerodromeCount}</span>
        </button>
        <button className={tab === 'team' ? 'active' : ''} onClick={() => onTab('team')}>
          <i className="fa-solid fa-users"/> Équipe <span className="num">{teamCount}</span>
        </button>
      </nav>
      <div className="spacer"/>
      <div className="meta">
        {null /* voyage stats removed */}
        <button onClick={onUserMenu} title={`${currentUser.first} ${currentUser.last}`} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
          padding: '3px 10px 3px 4px',
          borderRadius: 99,
          color: '#f3ecd6',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', height: 30,
          fontFamily: 'inherit',
        }}>
          <UserAvatar user={currentUser} size={22}/>
          <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>{currentUser.first}</span>
            <span style={{ fontSize: 9, color: '#c4b88a', fontWeight: 500 }}>{club?.code}</span>
          </span>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 9, color: '#c4b88a' }}/>
        </button>
      </div>
    </header>
  );
}
