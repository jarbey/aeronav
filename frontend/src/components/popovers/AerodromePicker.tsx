import React, { useState } from 'react';
import { Popover, PopoverHeader } from './Popover';
import { AERODROMES } from '../../data/mockData';

interface Props {
  anchor: DOMRect;
  onClose: () => void;
  onPick: (icao: string) => void;
  currentIcao: string;
  label?: string;
}

export default function AerodromePicker({ anchor, onClose, onPick, currentIcao, label }: Props) {
  const [q, setQ] = useState('');
  const rows = AERODROMES.filter(a =>
    !q || `${a.icao} ${a.name} ${a.city}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Popover anchor={anchor} onClose={onClose} width={340}>
      <PopoverHeader title={label || "Remplacer l'aérodrome"} sub={`Actuel : ${currentIcao}`} onClose={onClose}/>
      <div style={{ padding: '8px 12px' }}>
        <input className="input" autoFocus placeholder="Rechercher un OACI, ville…"
          value={q} onChange={e => setQ(e.target.value)}/>
      </div>
      <div className="scroll" style={{ flex: 1, overflow: 'auto', padding: '0 6px 8px' }}>
        {rows.map(ad => (
          <button key={ad.icao}
            onClick={() => { onPick(ad.icao); onClose(); }}
            disabled={ad.icao === currentIcao}
            style={{
              width: '100%', textAlign: 'left', border: 0,
              background: ad.icao === currentIcao ? 'var(--paper-2)' : 'transparent',
              padding: '8px 10px', borderRadius: 4,
              cursor: ad.icao === currentIcao ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: ad.icao === currentIcao ? 0.6 : 1,
            }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 12, width: 44 }}>{ad.icao}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                {ad.runways?.[0] ? `${ad.runways[0].lengthM}m · ` : ''}{ad.fuel.join('/') || '—'} · {ad.taxLandingEUR}€
              </div>
            </div>
            {ad.night ? <span className="dot ok" title="Utilisable de nuit"/> : <span className="dot warn" title="Pas la nuit"/>}
          </button>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 12, color: 'var(--ink-3)', fontSize: 11, textAlign: 'center' }}>Aucun résultat</div>
        )}
      </div>
    </Popover>
  );
}
