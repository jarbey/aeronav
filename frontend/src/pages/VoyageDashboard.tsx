import React, { useState, useEffect } from 'react';
import type { Voyage, Variant, VoyageResult, LegResult, Aircraft, User, CrewAssignment } from '../types';
import { acById, AC_MODELS, personById, userById, fmtHr, aeroclubById, PEOPLE } from '../data/mockData';

// Extract short display code from a variant ID (e.g. "var-A-nantes-propriano" → "A")
function variantCode(id: string): string {
  const parts = id.split('-');
  if (parts.length >= 2 && /^[A-Z]$/i.test(parts[1])) return parts[1].toUpperCase();
  return id.charAt(0).toUpperCase();
}
import { UserAvatar } from '../components/UserAvatar';
import VoyageMap from '../components/VoyageMap';

interface DashboardProps {
  voyage: Voyage;
  variant: Variant;
  computed: VoyageResult;
  selectedLeg: LegResult | undefined;
  selectedLegIdx: number;
  onSelectLeg: (i: number) => void;
  handleSelectAerodrome: (icao: string) => void;
  setVacIcao: (icao: string) => void;
  onReplaceLeg: (legIdx: number, which: 'from' | 'to', anchor: DOMRect) => void;
  onCrewEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onBagsEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onFuelEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onVariantSelect: (id: string) => void;
  onVariantDuplicate: () => void;
  onVariantDelete: (id: string) => void;
  onVariantRename: (id: string, label: string) => void;
  onVariantReorder: (orderedIds: string[]) => void;
  onStopMinChange: (routeIdx: number, mins: number | null) => void;
  onTaxiChange: (legIdx: number, taxiOut: number, taxiIn: number) => void;
  onAltChange: (legIdx: number, alt: number) => void;
  onAutoAssign: () => void;
  onDeleteLeg: (legIdx: number) => void;
  onDepartureTimeChange: (time: string) => void;
  onWaypointsChange: (legIdx: number, wps: [number, number][]) => void;
  onSplitLeg: (legIdx: number, icao: string) => void;
  onAddStop: (legIdx: number, anchor: DOMRect) => void;
  onShare: () => void;
  onSettings: () => void;
  onRenameVoyage: (id: string, title: string) => void;
  currentUser: User;
}

export default function VoyageDashboard(props: DashboardProps) {
  const { voyage, variant, computed, selectedLeg, selectedLegIdx, onSelectLeg,
    handleSelectAerodrome, setVacIcao,
    onReplaceLeg, onCrewEdit, onBagsEdit, onFuelEdit,
    onVariantSelect, onVariantDuplicate, onVariantDelete, onVariantRename, onVariantReorder,
    onStopMinChange, onTaxiChange, onAltChange, onAutoAssign, onDeleteLeg, onDepartureTimeChange, onWaypointsChange, onSplitLeg, onAddStop, onShare, onSettings, onRenameVoyage, currentUser } = props;

  const voyagePanel = (
    <VoyagePanel
      voyage={voyage} variant={variant} computed={computed}
      selectedLegIdx={selectedLegIdx} onSelectLeg={onSelectLeg}
      onReplaceLeg={onReplaceLeg}
      onVariantSelect={onVariantSelect}
      onVariantDuplicate={onVariantDuplicate}
      onVariantDelete={onVariantDelete}
      onVariantRename={onVariantRename}
      onVariantReorder={onVariantReorder}
      onStopMinChange={onStopMinChange}
      onAutoAssign={onAutoAssign}
      onDeleteLeg={onDeleteLeg}
      onDepartureTimeChange={onDepartureTimeChange}
      onAddStop={onAddStop}
      onShare={onShare}
      onSettings={onSettings}
      onRenameVoyage={(title) => onRenameVoyage(voyage.id, title)}
      currentUser={currentUser}
    />
  );

  const legDetail = selectedLeg ? (
    <LegDetail
      leg={selectedLeg} legIdx={selectedLegIdx} variant={variant}
      voyagePeopleIds={voyage.peopleIds}
      onTaxiChange={onTaxiChange}
      onAltChange={onAltChange}
      onOpenVAC={setVacIcao}
      onCrewEdit={onCrewEdit} onBagsEdit={onBagsEdit} onFuelEdit={onFuelEdit}
    />
  ) : null;

  const selectedAerodromeIcao = variant.route[selectedLegIdx];

  const mapBlock = (
    <div style={{ flex: 1, position: 'relative', margin: 12, marginLeft: 6, marginRight: 6, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-card)', minWidth: 320 }}>
      <div className="map-stage">
        <VoyageMap
          variant={variant}
          selectedAerodromeIcao={selectedAerodromeIcao}
          selectedLegIdx={selectedLegIdx}
          onSelectAerodrome={handleSelectAerodrome}
          onOpenVAC={setVacIcao}
          onWaypointsChange={onWaypointsChange}
          onSplitLeg={onSplitLeg}
        />
        <MapOverlay variant={variant}/>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {voyagePanel}
      {mapBlock}
      {legDetail}
    </div>
  );
}

// --- Map Overlay ---
function MapOverlay({ variant }: { variant: Variant }) {
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'none' }}>
      <div className="card" style={{ padding: '6px 8px', display: 'flex', gap: 4, alignItems: 'center', pointerEvents: 'auto' }}>
        <button className="btn btn-sm" title="Zoomer"><i className="fa-solid fa-plus"/></button>
        <button className="btn btn-sm" title="Dézoomer"><i className="fa-solid fa-minus"/></button>
        <button className="btn btn-sm" title="Recentrer"><i className="fa-solid fa-crosshairs"/></button>
        <div className="divider-v" style={{ margin: '0 2px' }}/>
        <button className="btn btn-sm" title="Couches"><i className="fa-solid fa-layer-group"/></button>
        <button className="btn btn-sm" title="Mesurer"><i className="fa-solid fa-ruler"/></button>
      </div>
      <div className="card" style={{ padding: '8px 10px', pointerEvents: 'auto', maxWidth: 230, fontSize: 10.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ width: 18, height: 18, borderRadius: 3, background: 'var(--ink)', color: '#ffcf52', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10 }}>{variantCode(variant.id)}</span>
          <span style={{ fontWeight: 600 }}>{variant.label}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic' }}>{variant.weather}</div>
      </div>
      <div className="card" style={{ padding: '8px 10px', pointerEvents: 'auto', maxWidth: 230 }}>
        <div className="cap-sm" style={{ marginBottom: 6 }}>Légende</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', fontSize: 10.5, alignItems: 'center' }}>
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#b8323a" stroke="#0b2240" strokeWidth="1.8"/></svg>
          <span>Aérodrome de la route</span>
          <svg width="14" height="14">
            <path d="M7,7 L7,2 A5,5 0 0,1 11.33,9.5Z" fill="#2468c8"/>
            <path d="M7,7 L11.33,9.5 A5,5 0 0,1 2.67,9.5Z" fill="#2d9e5f"/>
            <path d="M7,7 L2.67,9.5 A5,5 0 0,1 7,2Z" fill="#8e44ad"/>
            <circle cx="7" cy="7" r="5" fill="none" stroke="#6a7a8a" strokeWidth="1"/>
          </svg>
          <span>Carburant disponible</span>
          <svg width="14" height="14"><circle cx="7" cy="7" r="3" fill="#2468c8" stroke="#6a7a8a" strokeWidth="1"/></svg>
          <span style={{ color: '#2468c8' }}>Jet-A1</span>
          <svg width="14" height="14"><circle cx="7" cy="7" r="3" fill="#2d9e5f" stroke="#6a7a8a" strokeWidth="1"/></svg>
          <span style={{ color: '#2d9e5f' }}>100LL</span>
          <svg width="14" height="14"><circle cx="7" cy="7" r="3" fill="#8e44ad" stroke="#6a7a8a" strokeWidth="1"/></svg>
          <span style={{ color: '#8e44ad' }}>MOGAS / UL91</span>
          <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 2"/></svg>
          <span>Branche de navigation</span>
        </div>
      </div>
    </div>
  );
}

// --- Variant tabs inline ---
function VariantTabsInline({ voyage, onSelect, onDuplicate, onDelete, onRename, onReorder }: {
  voyage: Voyage; onSelect: (id: string) => void; onDuplicate: () => void;
  onDelete: (id: string) => void; onRename: (id: string, label: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDrop(targetId: string, draggedId: string) {
    if (draggedId === targetId) return;
    const ids = voyage.variants.map(v => v.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggedId);
    onReorder(next);
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div className="cap-sm">Trajets</div>
        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', fontSize: 10 }} onClick={onDuplicate}>
          <i className="fa-solid fa-plus"/> Nouveau
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {voyage.variants.map((v, idx) => {
          const isActive = v.id === voyage.activeVariantId;
          const isDragOver = dragOverId === v.id;
          return (
            <div key={v.id}
              draggable
              onDragStart={e => e.dataTransfer.setData('text/plain', v.id)}
              onDragOver={e => { e.preventDefault(); setDragOverId(v.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={e => { e.preventDefault(); setDragOverId(null); handleDrop(v.id, e.dataTransfer.getData('text/plain')); }}
              onDragEnd={() => setDragOverId(null)}
              onClick={() => onSelect(v.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 7px',
                border: `1px solid ${isDragOver ? 'var(--aero-blue)' : isActive ? 'var(--ink)' : 'var(--hairline-soft)'}`,
                background: isDragOver ? 'var(--surface-2)' : isActive ? 'var(--surface-card)' : 'transparent',
                borderRadius: 4, cursor: 'grab',
                opacity: 1,
              }}>
              <i className="fa-solid fa-grip-vertical" style={{ fontSize: 8, color: 'var(--ink-4)', cursor: 'grab', flexShrink: 0 }}/>
              <span style={{ width: 20, height: 20, borderRadius: 3, background: isActive ? 'var(--ink)' : 'var(--paper-2)', color: isActive ? '#ffcf52' : 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === v.id ? (
                  <input className="input" autoFocus value={v.label}
                    onClick={e => e.stopPropagation()}
                    onChange={e => onRename(v.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={e => { if (e.key === 'Enter') setEditingId(null); }}
                    style={{ fontSize: 11, padding: '2px 4px' }}/>
                ) : (
                  <div style={{ fontSize: 11, fontWeight: isActive ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.label}</div>
                )}
              </div>
              {isActive && (
                <>
                  <button className="btn btn-sm btn-ghost" style={{ padding: '0 4px', minWidth: 0 }} title="Renommer"
                    onClick={e => { e.stopPropagation(); setEditingId(v.id); }}>
                    <i className="fa-solid fa-pen" style={{ fontSize: 8 }}/>
                  </button>
                  {voyage.variants.length > 1 && (
                    <button className="btn btn-sm btn-ghost" style={{ padding: '0 4px', minWidth: 0 }} title="Supprimer"
                      onClick={e => { e.stopPropagation(); if (window.confirm(`Supprimer "${v.label}" ?`)) onDelete(v.id); }}>
                      <i className="fa-solid fa-trash" style={{ fontSize: 8, color: 'var(--aero-red)' }}/>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Aerodrome pill ---
function AeroPill({ icao, onClick }: { icao: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button onClick={onClick} title="Cliquer pour remplacer cet aérodrome" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span className="mono" style={{ fontWeight: 700, fontSize: 13, borderBottom: '1px dashed var(--ink-soft)' }}>{icao}</span>
    </button>
  );
}

// --- Voyage Panel ---
function VoyagePanel({ voyage, variant, computed, selectedLegIdx, onSelectLeg,
  onReplaceLeg, onVariantSelect, onVariantDuplicate, onVariantDelete, onVariantRename, onVariantReorder,
  onStopMinChange, onAutoAssign, onDeleteLeg, onDepartureTimeChange, onAddStop, onShare, onSettings, onRenameVoyage, currentUser }: {
  voyage: Voyage; variant: Variant; computed: VoyageResult;
  selectedLegIdx: number; onSelectLeg: (i: number) => void;
  onReplaceLeg: (legIdx: number, which: 'from' | 'to', anchor: DOMRect) => void;
  onVariantSelect: (id: string) => void; onVariantDuplicate: () => void;
  onVariantDelete: (id: string) => void; onVariantRename: (id: string, label: string) => void;
  onVariantReorder: (orderedIds: string[]) => void;
  onStopMinChange: (routeIdx: number, mins: number | null) => void;
  onAutoAssign: () => void;
  onDeleteLeg: (legIdx: number) => void;
  onDepartureTimeChange: (time: string) => void;
  onAddStop: (legIdx: number, anchor: DOMRect) => void;
  onShare: () => void; onSettings: () => void;
  onRenameVoyage: (title: string) => void; currentUser: User;
}) {
  const isOwner = voyage.ownerId === currentUser.id;
  const sharedUsers = (voyage.sharedWith || []).map(id => userById(id)).filter(Boolean) as NonNullable<ReturnType<typeof userById>>[];
  const owner = userById(voyage.ownerId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(voyage.title);

  useEffect(() => { setTitleDraft(voyage.title); }, [voyage.title]);

  function commitTitle() {
    const next = titleDraft.trim();
    if (next && next !== voyage.title) onRenameVoyage(next);
    else setTitleDraft(voyage.title);
    setEditingTitle(false);
  }

  return (
    <aside className="card" style={{ width: 328, margin: 12, marginRight: 6, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - var(--topbar-h) - 24px)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--hairline-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div className="cap-sm">Voyage</div>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }} className="mono">
            {new Date(voyage.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
          </span>
          {isOwner && onSettings && (
            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', minWidth: 0 }} onClick={onSettings} title="Paramètres du voyage">
              <i className="fa-solid fa-gear" style={{ fontSize: 11 }}/>
            </button>
          )}
        </div>
        {editingTitle ? (
          <input className="input" autoFocus value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setTitleDraft(voyage.title); setEditingTitle(false); } }}
            style={{ fontSize: 13, fontWeight: 600, padding: '4px 6px', marginBottom: 8 }}/>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: isOwner ? 'text' : 'default' }}
            onClick={() => isOwner && setEditingTitle(true)} title={isOwner ? 'Cliquer pour renommer' : ''}>
            <span>{voyage.title}</span>
            {isOwner && <i className="fa-solid fa-pen" style={{ fontSize: 9, color: 'var(--ink-3)', opacity: 0.6 }}/>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 4 }}>
          {owner && <UserAvatar user={owner} size={20}/>}
          <div style={{ fontSize: 10.5, color: 'var(--ink-2)', flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner ? `${owner.first} ${owner.last}` : '—'}</div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{isOwner ? 'Propriétaire' : 'Partagé avec vous'}</div>
          </div>
          {sharedUsers.length > 0 && (
            <div style={{ display: 'flex' }}>
              {sharedUsers.slice(0, 4).map((u, i) => (
                <div key={u.id} style={{ marginLeft: i > 0 ? -6 : 0, border: '2px solid var(--surface-2)', borderRadius: '50%' }}>
                  <UserAvatar user={u} size={20}/>
                </div>
              ))}
            </div>
          )}
          {isOwner && (
            <button className="btn btn-sm" style={{ padding: '3px 6px' }} onClick={onShare} title="Partager">
              <i className="fa-solid fa-share-nodes"/>
            </button>
          )}
        </div>

        <VariantTabsInline voyage={voyage}
          onSelect={onVariantSelect} onDuplicate={onVariantDuplicate}
          onDelete={onVariantDelete} onRename={onVariantRename} onReorder={onVariantReorder}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <div>
            <div className="cap-sm">Vol</div>
            <div className="big-num" style={{ fontSize: 18 }}>{fmtHr(computed.flightMin)}</div>
          </div>
          <div>
            <div className="cap-sm">Escales</div>
            <div className="big-num" style={{ fontSize: 18 }}>{fmtHr(computed.stopMin)}</div>
          </div>
          <div style={{ gridColumn: '1 / -1', paddingTop: 8, borderTop: '1px dashed var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div className="cap-sm">Durée totale</div>
              <div className="big-num" style={{ fontSize: 22, color: 'var(--aero-red)' }}>{fmtHr(computed.totalMin)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="cap-sm">Taxes</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{computed.taxTotalEUR}€</div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)' }} className="mono">{computed.taxLandingTotal}€ atter. + {computed.taxParkingTotal}€ park.</div>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', paddingTop: 8, borderTop: '1px dashed var(--hairline-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="cap-sm" style={{ whiteSpace: 'nowrap' }}>Départ</div>
            <input
              type="time"
              className="input"
              value={variant.departureTime ?? ''}
              onChange={e => onDepartureTimeChange(e.target.value)}
              style={{ width: 88, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, padding: '3px 5px' }}
            />
            {variant.departureTime && (() => {
              const [h, m] = variant.departureTime!.split(':').map(Number);
              const arrMin = ((h * 60 + m + computed.totalMin) % 1440 + 1440) % 1440;
              const ah = Math.floor(arrMin / 60);
              const am = Math.round(arrMin % 60);
              const arrStr = `${String(ah).padStart(2, '0')}:${String(am).padStart(2, '0')}`;
              return <>
                <i className="fa-solid fa-arrow-right" style={{ fontSize: 9, color: 'var(--ink-3)' }}/>
                <div className="cap-sm" style={{ whiteSpace: 'nowrap' }}>Arrivée</div>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--aero-red)' }}>{arrStr}</span>
              </>;
            })()}
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="section-title">Branches <span className="badge">{computed.legs.length}</span></div>
        <button
          className="btn btn-sm"
          style={{ marginLeft: 'auto', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
          title={`Répartir automatiquement les ${voyage.peopleIds.length} personnes dans les ${voyage.aircraftIds.length} avions`}
          onClick={onAutoAssign}
          disabled={voyage.peopleIds.length === 0 || voyage.aircraftIds.length === 0}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 9 }}/> Répartition auto
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, padding: '0 6px 12px' }}>
        {computed.legs.map((leg, i) => {
          const issueEntries = Object.entries(leg.perAc).filter(([, p]) => p.mtowExceeded || !p.fuelOK || !p.compatFuel || !p.compatRunway || !p.cdbOK || !p.paxOK);
          const issues = issueEntries.map(([, p]) => p);
          const issueTooltip = issueEntries.map(([acId, p]) => {
            const ac = acById(acId);
            const labels: string[] = [];
            if (p.mtowExceeded) labels.push('MTOW dépassé');
            if (!p.fuelOK) labels.push('Réserve insuffisante');
            if (!p.compatFuel) labels.push('Carburant indisponible');
            if (!p.compatRunway) labels.push('Piste trop courte');
            if (!p.cdbOK) labels.push('CDB non qualifié');
            if (!p.paxOK) labels.push('PAX non autorisé');
            return `${ac?.reg ?? acId} : ${labels.join(', ')}`;
          }).join('\n');
          const totalDur = Object.values(leg.perAc).reduce((max, p) => Math.max(max, p.durMin), 0);
          const isSel = selectedLegIdx === i;

          // Compute departure and arrival times per leg
          let depTime: string | null = null;
          let arrTime: string | null = null;
          if (variant.departureTime) {
            const [h, m] = variant.departureTime.split(':').map(Number);
            let acc = h * 60 + m;
            for (let j = 0; j < i; j++) {
              const dur = Object.values(computed.legs[j]?.perAc || {}).reduce((max, p) => Math.max(max, p.durMin), 0);
              acc += dur + (variant.stopMin[j + 1] ?? 0);
            }
            const fmt = (v: number) => { const vn = ((v % 1440) + 1440) % 1440; return `${String(Math.floor(vn/60)).padStart(2,'0')}:${String(Math.round(vn%60)).padStart(2,'0')}`; };
            depTime = fmt(acc);
            arrTime = fmt(acc + totalDur);
          }

          // Fuel warning at next stop: check if any aircraft can't refuel
          const nextStopIcao = i < computed.legs.length - 1 ? variant.route[i + 1] : null;
          const fuelMissingAtStop = nextStopIcao
            ? Object.entries(leg.perAc)
                .filter(([, p]) => !p.compatFuel)
                .map(([acId]) => acById(acId)?.reg ?? acId)
            : [];

          return (
            <div key={i}>
              <div onClick={() => onSelectLeg(i)} style={{
                width: '100%', textAlign: 'left', background: isSel ? 'var(--paper)' : 'transparent',
                padding: '10px 10px', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6,
                borderLeft: `3px solid ${isSel ? 'var(--aero-red)' : 'transparent'}`,
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', color: '#fff8df', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                  <span onClick={e => e.stopPropagation()}>
                    <AeroPill icao={leg.fromIcao} onClick={(e) => onReplaceLeg(i, 'from', (e.currentTarget as HTMLElement).getBoundingClientRect())}/>
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 9, color: 'var(--ink-3)' }}/>
                  <span onClick={e => e.stopPropagation()}>
                    <AeroPill icao={leg.toIcao} onClick={(e) => onReplaceLeg(i, 'to', (e.currentTarget as HTMLElement).getBoundingClientRect())}/>
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{leg.distance.toFixed(0)} NM</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{fmtHr(totalDur)}</span>
                    {variant.route.length > 2 && (
                      <button className="btn btn-sm btn-ghost" style={{ padding: '0 4px', minWidth: 0 }}
                        title="Supprimer cette branche"
                        onClick={e => { e.stopPropagation(); onDeleteLeg(i); }}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 9, color: 'var(--aero-red)' }}/>
                      </button>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--ink-3)' }}>
                  {depTime && arrTime ? (
                    <>
                      <i className="fa-regular fa-clock" style={{ fontSize: 9 }}/>
                      <span className="mono">{depTime}</span>
                      <i className="fa-solid fa-arrow-right" style={{ fontSize: 8 }}/>
                      <span className="mono">{arrTime}</span>
                    </>
                  ) : (
                    <span style={{ fontStyle: 'italic' }}>Heure départ non définie</span>
                  )}
                  {issues.length > 0 ? (
                    <span className="chip danger" style={{ marginLeft: 'auto', cursor: 'help' }} title={issueTooltip}>
                      <i className="fa-solid fa-triangle-exclamation"/> {issues.length} {issues.length > 1 ? 'alertes' : 'alerte'}
                    </span>
                  ) : (
                    <span className="chip ok" style={{ marginLeft: 'auto' }}>
                      <i className="fa-solid fa-check"/> OK
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  {Object.keys(leg.perAc).map(acId => {
                    const ac = acById(acId); if (!ac) return null;
                    const p = leg.perAc[acId];
                    const m = AC_MODELS[ac.model];
                    const pctTow = Math.min(1, p.tow / m.mtowKg);
                    const cls = p.mtowExceeded ? 'danger' : (pctTow > 0.92 ? 'warn' : '');
                    return (
                      <div key={ac.id} style={{ flex: 1 }} title={`${ac.reg} — TOW ${p.tow.toFixed(0)} kg / ${m.mtowKg}`}>
                        <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: ac.color, fontWeight: 600, marginBottom: 2 }}>{ac.reg}</div>
                        <div className="bar"><span className={cls} style={{ width: `${pctTow * 100}%` }}/></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {nextStopIcao && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 12px 4px 24px', fontSize: 10.5, color: 'var(--ink-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-gas-pump" style={{ color: variant.stopMin[i + 1] != null ? 'var(--aero-amber)' : 'var(--ink-4)' }}/>
                    Escale à <b className="mono" style={{ color: 'var(--ink-2)' }}>{nextStopIcao}</b>
                    {fuelMissingAtStop.length > 0 && (
                      <span className="chip danger" style={{ fontSize: 9, cursor: 'help' }}
                        title={`Carburant indisponible à ${nextStopIcao} pour : ${fuelMissingAtStop.join(', ')}`}>
                        <i className="fa-solid fa-triangle-exclamation"/> Carb. indispo
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {variant.stopMin[i + 1] != null ? (
                        <>
                          <button className="btn btn-sm btn-ghost" style={{ padding: '0 4px', minWidth: 0 }}
                            onClick={() => onStopMinChange(i + 1, Math.max(0, (variant.stopMin[i + 1] || 0) - 15))}>
                            <i className="fa-solid fa-minus" style={{ fontSize: 9 }}/>
                          </button>
                          <span className="mono" style={{ minWidth: 36, textAlign: 'center' }}>+{variant.stopMin[i + 1]}min</span>
                          <button className="btn btn-sm btn-ghost" style={{ padding: '0 4px', minWidth: 0 }}
                            onClick={() => onStopMinChange(i + 1, (variant.stopMin[i + 1] || 0) + 15)}>
                            <i className="fa-solid fa-plus" style={{ fontSize: 9 }}/>
                          </button>
                          <button className="btn btn-sm btn-ghost" style={{ padding: '0 4px', minWidth: 0, color: 'var(--ink-4)' }}
                            title="Supprimer l'escale"
                            onClick={() => onStopMinChange(i + 1, null)}>
                            <i className="fa-solid fa-xmark" style={{ fontSize: 9 }}/>
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, color: 'var(--ink-3)' }}
                          onClick={() => onStopMinChange(i + 1, 30)}>
                          <i className="fa-solid fa-plus" style={{ fontSize: 9 }}/> Ajouter escale
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--hairline-soft)', display: 'flex', gap: 6 }}>
        <button className="btn btn-sm" style={{ flex: 1 }}
          onClick={e => onAddStop(computed.legs.length - 1, (e.currentTarget as HTMLElement).getBoundingClientRect())}>
          <i className="fa-solid fa-plus"/> Ajouter une escale
        </button>
        <button className="btn btn-sm btn-ghost" title="Inverser"><i className="fa-solid fa-shuffle"/></button>
      </div>
    </aside>
  );
}

// --- Leg Detail ---
function LegDetail({ leg, legIdx, variant, voyagePeopleIds, onTaxiChange, onAltChange, onOpenVAC, onCrewEdit, onBagsEdit, onFuelEdit }: {
  leg: LegResult; legIdx: number; variant: Variant; voyagePeopleIds: string[];
  onTaxiChange: (legIdx: number, taxiOut: number, taxiIn: number) => void;
  onAltChange: (legIdx: number, alt: number) => void;
  onOpenVAC: (icao: string) => void;
  onCrewEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onBagsEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onFuelEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
}) {
  const totalDurMin = Object.values(leg.perAc).reduce((max, p) => Math.max(max, p.durMin), 0);
  const taxiOut = variant.taxiOutMin?.[legIdx] ?? 10;
  const taxiIn  = variant.taxiInMin?.[legIdx]  ?? 10;

  const onThisLeg = new Set<string>();
  Object.values(variant.crewsByLeg[legIdx] || {}).forEach(crew => {
    if (crew.cdb) onThisLeg.add(crew.cdb);
    crew.pax.forEach(pid => onThisLeg.add(pid));
  });
  const unpositioned = voyagePeopleIds
    .filter(id => !onThisLeg.has(id))
    .map(id => personById(id))
    .filter((p): p is import('../types').Person => !!p);

  return (
    <aside className="scroll" style={{ width: 480, margin: 12, marginLeft: 6, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - var(--topbar-h) - 24px)', flexShrink: 0 }}>
      <div className="card" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff8df', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}>{legIdx + 1}</span>
          <div className="cap-sm">Branche {legIdx + 1} sur {variant.route.length - 1}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" onClick={() => onOpenVAC(leg.from.icao)} title="VAC départ">
              <i className="fa-solid fa-map"/> {leg.from.icao}
            </button>
            <button className="btn btn-sm" onClick={() => onOpenVAC(leg.to.icao)} title="VAC arrivée">
              <i className="fa-solid fa-map"/> {leg.to.icao}
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => onOpenVAC(leg.fromIcao)}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{leg.fromIcao}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{leg.from.name}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="fa-solid fa-plane" style={{ fontSize: 14, color: 'var(--aero-red)' }}/>
              <div style={{ flex: 1, height: 1, background: 'var(--ink)', minWidth: 30 }}/>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>{leg.distance.toFixed(0)} NM</div>
          </div>
          <div style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => onOpenVAC(leg.toIcao)}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{leg.toIcao}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{leg.to.name}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--hairline-soft)' }}>
          <MetricCell label="Distance" value={`${leg.distance.toFixed(0)}`} unit="NM"/>
          <MetricCell label="Cap" value={`${leg.bearing.toFixed(0).padStart(3, '0')}`} unit="°"/>
          <AltCell alt={variant.cruiseAltFt[legIdx] ?? 3500} onChange={a => onAltChange(legIdx, a)}/>
          <MetricCell label="Durée groupe" value={fmtHr(totalDurMin)} red/>
          <MetricCell label="Taxe arr." value={`${(leg.to.taxLandingEUR || 0) * Object.keys(leg.perAc).length}`} unit="€"/>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--hairline-soft)', alignItems: 'center' }}>
          <TaxiStepper label="Roulage dép." icon="fa-solid fa-road" value={taxiOut}
            onChange={v => onTaxiChange(legIdx, v, taxiIn)}/>
          <div style={{ width: 1, height: 28, background: 'var(--hairline-soft)' }}/>
          <TaxiStepper label="Intégration arr." icon="fa-solid fa-plane-arrival" value={taxiIn}
            onChange={v => onTaxiChange(legIdx, taxiOut, v)}/>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
        <div className="section-title">Équipages · Calculs <span className="badge">{Object.keys(leg.perAc).length} avions</span></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.keys(leg.perAc).map(acId => {
          const ac = acById(acId); if (!ac) return null;
          return (
            <AircraftLegCard key={ac.id} ac={ac} legIdx={legIdx} legResult={leg.perAc[ac.id]}
              onCrewEdit={onCrewEdit} onBagsEdit={onBagsEdit} onFuelEdit={onFuelEdit}/>
          );
        })}
      </div>

      {unpositioned.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
            <div className="section-title">
              Non positionnés <span className="badge warn">{unpositioned.length}</span>
            </div>
          </div>
          <div className="card" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unpositioned.map(p => (
                <PersonChip key={p.id} person={p}/>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function TaxiStepper({ label, icon, value, onChange }: { label: string; icon: string; value: number; onChange: (v: number) => void }) {
  const STEP = 5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      <i className={icon} style={{ fontSize: 10, color: 'var(--ink-3)' }}/>
      <div className="cap-sm" style={{ fontSize: 9, flex: 1 }}>{label}</div>
      <button className="btn btn-sm btn-ghost" style={{ padding: '0 5px', minWidth: 20 }}
        onClick={() => onChange(Math.max(0, value - STEP))}>−</button>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 32, textAlign: 'center' }}>{value}<span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 500 }}>min</span></span>
      <button className="btn btn-sm btn-ghost" style={{ padding: '0 5px', minWidth: 20 }}
        onClick={() => onChange(value + STEP)}>+</button>
    </div>
  );
}

function AltCell({ alt, onChange }: { alt: number; onChange: (v: number) => void }) {
  const STEP = 500;
  return (
    <div>
      <div className="cap-sm">Altitude</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 1 }}>
        <button className="btn btn-sm btn-ghost" style={{ padding: '0 3px', minWidth: 16, fontSize: 10 }}
          onClick={() => onChange(Math.max(500, alt - STEP))}>−</button>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
          {alt}<span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 500, marginLeft: 1 }}>ft</span>
        </span>
        <button className="btn btn-sm btn-ghost" style={{ padding: '0 3px', minWidth: 16, fontSize: 10 }}
          onClick={() => onChange(alt + STEP)}>+</button>
      </div>
    </div>
  );
}

function MetricCell({ label, value, unit, red }: { label: string; value: string; unit?: string; red?: boolean }) {
  return (
    <div>
      <div className="cap-sm">{label}</div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: red ? 'var(--aero-red)' : 'var(--ink)' }}>
        {value}{unit && <span style={{ fontSize: 9, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}

function AircraftLegCard({ ac, legIdx, legResult, onCrewEdit, onBagsEdit, onFuelEdit }: {
  ac: Aircraft; legIdx: number; legResult: import('../types').AircraftLegResult;
  onCrewEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onBagsEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
  onFuelEdit: (ac: Aircraft, legIdx: number, anchor: DOMRect) => void;
}) {
  const m = AC_MODELS[ac.model];
  const p = legResult;
  const cdb = p.crew.cdb ? personById(p.crew.cdb) : null;
  const towPct = Math.min(1, p.tow / m.mtowKg);
  const towMargin = m.mtowKg - p.tow;
  const towCls = towMargin < 20 ? 'danger' : (towMargin < 50 ? 'warn' : '');
  const fuelTotal = p.fuelReserve + p.burnL;
  const fuelPct = Math.min(1, p.fuelLeftL / m.fuelCapL);
  const fuelEndurMin = p.fuelLeftL / m.burnLh * 60;
  const fuelCls = fuelEndurMin < 30 ? 'danger' : (fuelEndurMin < 60 ? 'warn' : '');
  const paxSeats = m.seats - 1;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--hairline-soft)', background: 'var(--surface-2)' }}>
        <span style={{ width: 6, height: 24, background: ac.color, borderRadius: 1 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{ac.reg}</span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-2)', marginLeft: 4 }}>· {m.label}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {p.mtowExceeded && <span className="chip danger" title="MTOW dépassé"><i className="fa-solid fa-triangle-exclamation"/></span>}
          {!p.fuelOK && <span className="chip danger" title="Réserve insuffisante"><i className="fa-solid fa-gas-pump"/></span>}
          {!p.compatFuel && <span className="chip warn" title="Carb. indispo à destination"><i className="fa-solid fa-fuel-pump"/></span>}
          {!p.compatRunway && <span className="chip warn" title="Piste trop courte"><i className="fa-solid fa-road"/></span>}
          {!p.cdbOK && <span className="chip danger" title={p.crew.cdb ? 'CDB non qualifié pour cet avion' : 'CDB manquant'}><i className="fa-solid fa-user-shield"/></span>}
          {!p.mtowExceeded && p.fuelOK && p.compatFuel && p.compatRunway && p.cdbOK && p.paxOK && (
            <span className="chip ok"><i className="fa-solid fa-check"/></span>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px dashed var(--hairline-soft)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={(e) => onCrewEdit(ac, legIdx, (e.currentTarget as HTMLElement).getBoundingClientRect())}>
        <span className="cap-sm" style={{ marginRight: 2 }}>Équipage</span>
        {cdb ? <PersonChip person={cdb} isCdb/> : <span className="chip danger">+ CDB manquant</span>}
        {p.crew.pax.map(pid => {
          const pp = personById(pid); return pp ? <PersonChip key={pid} person={pp}/> : null;
        })}
        {Array.from({ length: Math.max(0, paxSeats - p.crew.pax.length) }).map((_, i) => (
          <span key={i} className="chip" style={{ opacity: 0.6, borderStyle: 'dashed' }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 8, marginRight: 2 }}/> siège
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-3)' }} className="mono">
          <i className="fa-solid fa-pen" style={{ fontSize: 8, marginRight: 3 }}/>{p.peopleMass.toFixed(0)} kg
        </span>
      </div>

      <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <Metric label="Durée" value={fmtHr(p.durMin)}/>
        <Metric label="Brûlé" value={`${p.burnL.toFixed(0)}`} unit="L"/>
        <Metric label="Restant" value={`${p.fuelLeftL.toFixed(0)}`} unit="L" cls={!p.fuelOK ? 'danger' : ''}/>
        <Metric label="TOW" value={`${p.tow.toFixed(0)}`} unit={`/${m.mtowKg}`} cls={p.mtowExceeded ? 'danger' : ''}/>
        <Metric label="LDW" value={`${p.ldw.toFixed(0)}`} unit="kg"/>
      </div>

      <div style={{ padding: '0 10px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          {(() => {
            const color = towCls === 'danger' ? 'var(--aero-red)' : towCls === 'warn' ? 'var(--aero-amber)' : 'var(--ink-3)';
            const bold = towCls !== '' ? 700 : undefined;
            const usableRange = m.mtowKg - ac.massEmptyKg;
            const payloadPct = Math.min(100, Math.max(0, p.tow - ac.massEmptyKg) / usableRange * 100);
            return (<>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginBottom: 3, color, fontWeight: bold }}>
                <span className="cap-sm" style={{ fontSize: 9, color: 'inherit', fontWeight: 'inherit' }}>Masse décollage</span>
                <span className="mono">{p.tow.toFixed(0)}<span style={{ opacity: 0.6 }}>/{m.mtowKg} kg</span></span>
              </div>
              <div className="bar">
                <span className={towCls} style={{ width: `${payloadPct}%` }}/>
              </div>
            </>);
          })()}
        </div>
        <div>
          {(() => {
            const color = fuelCls === 'danger' ? 'var(--aero-red)' : fuelCls === 'warn' ? 'var(--aero-amber)' : 'var(--ink-3)';
            const bold = fuelCls !== '' ? 700 : undefined;
            return (<>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginBottom: 3, color, fontWeight: bold }}>
                <span className="cap-sm" style={{ fontSize: 9, color: 'inherit', fontWeight: 'inherit' }}>Carb. à l'arrivée</span>
                <span className="mono">{p.fuelLeftL.toFixed(0)}L<span style={{ opacity: 0.6 }}> / {fmtHr(p.fuelLeftL / m.burnLh * 60)}</span></span>
              </div>
              <div className="bar"><span className={fuelCls} style={{ width: `${fuelPct * 100}%` }}/></div>
            </>);
          })()}
        </div>
      </div>

      <div style={{ padding: '8px 10px', background: 'var(--paper)', borderTop: '1px dashed var(--hairline-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={(e) => onBagsEdit(ac, legIdx, (e.currentTarget as HTMLElement).getBoundingClientRect())}
          style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} title="Modifier les bagages">
          <i className="fa-solid fa-suitcase" style={{ color: 'var(--ink-3)', fontSize: 11 }}/>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
            {p.bag.count}×{p.bag.unitKg}<span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>kg</span> = <b>{p.bagMass}</b><span style={{ color: 'var(--ink-3)', fontSize: 9 }}>kg</span>
          </span>
          <i className="fa-solid fa-pen" style={{ fontSize: 8, color: 'var(--ink-3)' }}/>
        </button>
        <div className="divider-v" style={{ height: 18, alignSelf: 'center' }}/>
        <button onClick={(e) => onFuelEdit(ac, legIdx, (e.currentTarget as HTMLElement).getBoundingClientRect())}
          style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} title="Modifier le carburant au départ">
          <i className="fa-solid fa-gas-pump" style={{ color: m.fuelType.includes('Jet') ? 'var(--aero-blue)' : 'var(--aero-green)', fontSize: 11 }}/>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 9 }}>départ </span>
            <b>{fuelTotal.toFixed(0)}</b>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 9 }}>L</span>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> → {p.fuelReserve.toFixed(0)}</span>
            <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 9 }}>L arr.</span>
          </span>
          <i className="fa-solid fa-pen" style={{ fontSize: 8, color: 'var(--ink-3)' }}/>
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-3)' }} className="mono">
          MV {ac.massEmptyKg}kg + pax {p.peopleMass.toFixed(0)} + bag {p.bagMass} + carb {p.fuelKg.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, cls }: { label: string; value: string; unit?: string; cls?: string }) {
  return (
    <div>
      <div className="cap-sm" style={{ fontSize: 9 }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: cls === 'danger' ? 'var(--aero-red)' : 'var(--ink)' }}>
        {value}{unit && <span style={{ fontSize: 9, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}

function PersonChip({ person, isCdb }: { person: import('../types').Person; isCdb?: boolean }) {
  const displayName = person.last || person.first;
  const initials = (person.first[0] + (person.last?.[0] || '')).toUpperCase();
  const colorIdx = (person.id.charCodeAt(1) % 6) + 1;
  return (
    <span className={`person ${isCdb ? 'cdb' : ''}`} title={`${[person.first, person.last].filter(Boolean).join(' ')} — ${person.weightKg} kg${isCdb ? ' (CDB)' : ''}`} style={{ cursor: 'pointer' }}>
      <span className="av" style={{ background: `var(--plane-${colorIdx})` }}>{initials}</span>
      <span style={{ fontSize: 10.5 }}>{isCdb ? <b>{displayName}</b> : displayName}</span>
      <span style={{ color: 'var(--ink-3)', fontSize: 9.5 }} className="mono">{person.weightKg}</span>
    </span>
  );
}
