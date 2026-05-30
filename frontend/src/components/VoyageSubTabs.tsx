import React from 'react';
import type { Voyage, Variant, VoyageResult, FinanceResult } from '../types';
import type { VoyageSubTab } from '../types';

interface Props {
  subTab: VoyageSubTab;
  onSubTab: (sub: VoyageSubTab) => void;
  voyage: Voyage;
  variant: Variant;
  computed: VoyageResult;
  finance: FinanceResult;
}


function SubTabBtn({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: string; label: string; badge?: string | number }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 0,
      padding: '10px 16px', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: active ? 'var(--ink)' : 'var(--ink-3)',
      borderBottom: `2px solid ${active ? 'var(--aero-red)' : 'transparent'}`,
      position: 'relative', top: 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: 11 }}/>
      {label}
      {badge !== undefined && (
        <span style={{
          fontSize: 9.5, padding: '1px 6px',
          background: active ? 'var(--ink)' : 'var(--paper-2)',
          color: active ? '#fff8df' : 'var(--ink-2)',
          borderRadius: 99, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: 0,
        }}>{badge}</span>
      )}
    </button>
  );
}

export default function VoyageSubTabs({ subTab, onSubTab, voyage, variant, finance }: Props) {
  const participantCount = voyage.peopleIds?.length ?? 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '0 16px',
      background: 'var(--surface-2)',
      borderBottom: '1px solid var(--hairline)',
    }}>
      <SubTabBtn active={subTab === 'map'} onClick={() => onSubTab('map')} icon="fa-map" label="Carte & branches"/>
      <SubTabBtn active={subTab === 'people'} onClick={() => onSubTab('people')} icon="fa-users" label="Personnes" badge={participantCount}/>
      <SubTabBtn active={subTab === 'finance'} onClick={() => onSubTab('finance')} icon="fa-coins" label="Finance" badge={`${new Intl.NumberFormat('fr-FR').format(Math.round(finance.totals.total))}€`}/>
      <SubTabBtn active={subTab === 'recap'} onClick={() => onSubTab('recap')} icon="fa-list-check" label="Récapitulatif"/>
      <div style={{ flex: 1 }}/>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="mono">{voyage.title}</span>
      </span>
    </div>
  );
}
