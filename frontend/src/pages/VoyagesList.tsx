import React, { useState } from 'react';
import type { Voyage, User } from '../types';
import {
  voyagesForUser, userById, aeroclubById, activeVariant,
  computeVoyage, computeFinance, fmtHr,
} from '../data/mockData';
import { UserAvatar } from '../components/UserAvatar';
import ShareDialog from '../components/ShareDialog';
import NewVoyageDialog from '../components/NewVoyageDialog';

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  draft:     { label: 'Brouillon',       color: 'var(--ink-3)',       icon: 'fa-pencil' },
  planning:  { label: 'En préparation',  color: 'var(--aero-blue)',   icon: 'fa-clipboard-list' },
  ongoing:   { label: 'En cours',        color: 'var(--aero-amber)',  icon: 'fa-plane-departure' },
  completed: { label: 'Terminé',         color: 'var(--aero-green-2)',icon: 'fa-check' },
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface VoyagesListProps {
  currentUser: User;
  activeVoyageId: string | null;
  onOpenVoyage: (id: string) => void;
  onShare: (v: Voyage) => void;
  onDuplicate: (id: string, newTitle: string) => void;
  onNew: () => void;
  version?: number;
}

export default function VoyagesList({ currentUser, activeVoyageId, onOpenVoyage, onShare, onDuplicate, onNew, version }: VoyagesListProps) {
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [q, setQ] = useState('');
  void version;

  const allVoyages = voyagesForUser(currentUser.id);
  let rows = allVoyages.filter(v => {
    if (filter === 'mine' && v.ownerId !== currentUser.id) return false;
    if (filter === 'shared' && v.ownerId === currentUser.id) return false;
    if (q && !v.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const order: Record<string, number> = { ongoing: 0, planning: 1, completed: 2, draft: 3 };
  rows = rows.slice().sort((a, b) => (order[a.status] - order[b.status]) || (new Date(b.date).getTime() - new Date(a.date).getTime()));

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap' }}>Mes voyages</h2>
        <span className="chip">{allVoyages.length}</span>
        <div style={{ flex: 1 }}/>
        <div className="seg">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tous</button>
          <button className={filter === 'mine' ? 'active' : ''} onClick={() => setFilter('mine')}>Mes voyages</button>
          <button className={filter === 'shared' ? 'active' : ''} onClick={() => setFilter('shared')}>Partagés avec moi</button>
        </div>
        <input className="input" style={{ maxWidth: 220 }} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)}/>
        <button className="btn btn-primary" onClick={onNew}><i className="fa-solid fa-plus"/> Nouveau voyage</button>
      </div>

      <div className="scroll" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))', gap: 14, alignContent: 'start', paddingBottom: 16 }}>
        {rows.map(v => (
          <VoyageCard key={v.id} voyage={v} currentUser={currentUser}
            isActive={v.id === activeVoyageId}
            onOpen={() => onOpenVoyage(v.id)}
            onShare={() => onShare(v)}
            onDuplicate={(newTitle) => onDuplicate(v.id, newTitle)}
          />
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 12, gridColumn: '1 / -1', textAlign: 'center' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: 24, marginBottom: 8, opacity: 0.4, display: 'block' }}/>
            <div>Aucun voyage à afficher</div>
          </div>
        )}
      </div>
    </div>
  );
}

function VoyageCard({ voyage, currentUser, isActive, onOpen, onShare, onDuplicate }: {
  voyage: Voyage; currentUser: User; isActive: boolean;
  onOpen: () => void; onShare: () => void;
  onDuplicate: (newTitle: string) => void;
}) {
  const [duplicating, setDuplicating] = useState(false);
  const [dupTitle, setDupTitle] = useState('');
  const meta = STATUS_META[voyage.status] || STATUS_META.draft;
  const owner = userById(voyage.ownerId);
  const isOwner = voyage.ownerId === currentUser.id;
  const sharedUsers = (voyage.sharedWith || []).map(id => userById(id)).filter(Boolean) as NonNullable<ReturnType<typeof userById>>[];
  const variant = activeVariant(voyage);
  const computed = computeVoyage(variant);
  const finance = computeFinance(variant);
  const totalNM = computed.legs.reduce((s, l) => s + l.distance, 0);

  return (
    <div className="card" style={{
      overflow: 'hidden',
      borderColor: isActive ? 'var(--aero-red)' : 'var(--hairline)',
      borderWidth: isActive ? 2 : 1,
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column',
    }} onClick={onOpen}>
      <div style={{
        padding: '12px 14px',
        background: 'linear-gradient(110deg, var(--surface-2), var(--paper))',
        borderBottom: '1px solid var(--hairline-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip" style={{ background: meta.color, color: '#fff', border: '0', fontSize: 10 }}>
            <i className={`fa-solid ${meta.icon}`} style={{ marginRight: 3 }}/> {meta.label}
          </span>
          {isActive && <span className="chip info" style={{ fontSize: 10 }}>actif</span>}
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }} className="mono">{fmtDate(voyage.date)}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.25 }}>{voyage.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--ink-3)' }}>
          {variant.route.map((icao, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{icao}</span>
              {i < variant.route.length - 1 && <i className="fa-solid fa-arrow-right" style={{ fontSize: 8 }}/>}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatCell label="Branches" value={String(computed.legs.length)}/>
        <StatCell label="Distance" value={totalNM.toFixed(0)} unit="NM"/>
        <StatCell label="Durée" value={fmtHr(computed.totalMin)}/>
        <StatCell label="Coût" value={String(Math.round(finance.totals.total))} unit="€" highlight/>
      </div>

      <div style={{
        padding: '10px 14px',
        borderTop: '1px dashed var(--hairline-soft)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {owner && <UserAvatar user={owner} size={26}/>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{owner ? `${owner.first} ${owner.last}` : '—'}</div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{isOwner ? 'Propriétaire' : 'Partagé avec vous'}</div>
          </div>
        </div>
        {sharedUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginRight: 6 }}
            title={sharedUsers.map(u => `${u.first} ${u.last}`).join(', ')}>
            {sharedUsers.slice(0, 4).map((u, i) => (
              <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid var(--surface)', borderRadius: '50%' }}>
                <UserAvatar user={u} size={22}/>
              </div>
            ))}
            {sharedUsers.length > 4 && (
              <span style={{ marginLeft: -8, fontSize: 9.5, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '2px solid var(--surface)', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>+{sharedUsers.length - 4}</span>
            )}
          </div>
        )}
        <button className="btn btn-sm btn-ghost" title="Dupliquer ce voyage"
          onClick={(e) => {
            e.stopPropagation();
            setDupTitle(`Copie de ${voyage.title}`);
            setDuplicating(true);
          }}>
          <i className="fa-solid fa-copy"/>
        </button>
        {isOwner && (
          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onShare(); }}>
            <i className="fa-solid fa-share-nodes"/> Partager
          </button>
        )}
      </div>

      {duplicating && (
        <div onClick={e => e.stopPropagation()}
          style={{ padding: '10px 14px', borderTop: '1px solid var(--hairline-soft)', background: 'var(--surface-2)', display: 'flex', gap: 6 }}>
          <input
            autoFocus
            className="input"
            style={{ flex: 1, fontSize: 12 }}
            placeholder="Nom du nouveau voyage"
            value={dupTitle}
            onChange={e => setDupTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onDuplicate(dupTitle); setDuplicating(false); }
              if (e.key === 'Escape') setDuplicating(false);
            }}
          />
          <button className="btn btn-sm btn-primary"
            onClick={() => { onDuplicate(dupTitle); setDuplicating(false); }}>
            <i className="fa-solid fa-check"/> Dupliquer
          </button>
          <button className="btn btn-sm btn-ghost"
            onClick={() => setDuplicating(false)}>
            <i className="fa-solid fa-xmark"/>
          </button>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="cap-sm">{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: highlight ? 'var(--aero-red)' : 'var(--ink)' }}>
        {value}{unit && <span style={{ fontSize: 9.5, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}
