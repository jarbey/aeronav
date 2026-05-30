import React, { useState } from 'react';
import type { Aerodrome, FuelAvailability } from '../types';
import { vacProxyUrl, useAerodromes, useUpdateAerodrome } from '../api/aerodromes';

const AIRAC_REF = new Date("2025-01-23T00:00:00Z").getTime();
const AIRAC_MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function airacCycle(offset = 0): string {
  const daysSince = Math.floor((Date.now() - AIRAC_REF) / 86_400_000);
  const start = new Date(AIRAC_REF + (Math.floor(daysSince / 28) + offset) * 28 * 86_400_000);
  return `${String(start.getUTCDate()).padStart(2,"0")}_${AIRAC_MONTHS[start.getUTCMonth()]}_${start.getUTCFullYear()}`;
}
const SIA_VAC_DIRECT = (icao: string) =>
  `https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_${airacCycle()}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${icao}.pdf`;

const FUEL_OPTIONS = ['100LL', 'Jet-A1', 'MOGAS / UL91'];
const FUEL_COLOR: Record<string, string> = {
  'Jet-A1': 'var(--aero-blue)',
  '100LL': 'var(--aero-green)',
  'MOGAS / UL91': '#8e44ad',
};

interface FuelDraftEntry { checked: boolean; h24: boolean; schedule: string; }
type FuelDraft = Record<string, FuelDraftEntry>;

interface Props {
  icao: string;
  onClose: () => void;
  onAddLeg?: () => void;
  currentLegTo?: string;
}

export default function VacModal({ icao, onClose, onAddLeg, currentLegTo }: Props) {
  const { data: aerodromes } = useAerodromes();
  const ad = aerodromes?.find(a => a.icao === icao);
  if (!ad) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(1400px, 98vw)', height: '96vh' }}>
        <div className="modal-head">
          <h2>
            <span className="mono" style={{ marginRight: 8, color: '#ffcf52' }}>{ad.icao}</span>
            {ad.name}
            <span style={{ fontSize: 11, marginLeft: 12, color: '#c4b88a', fontWeight: 400 }}>Carte VAC · Approche à vue</span>
          </h2>
          {onAddLeg && currentLegTo && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '4px 12px', marginRight: 8 }}
              onClick={onAddLeg}
            >
              <i className="fa-solid fa-route" style={{ marginRight: 6 }}/>
              {currentLegTo} → {icao}
            </button>
          )}
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{ background: '#f1e7c8', padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'stretch' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#fbf6e7', display: 'flex', flexDirection: 'column' }}>
              <VACChart ad={ad}/>
            </div>
            <VACSidebar ad={ad}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, editing, onEdit, onSave }: {
  title: string; editing: boolean;
  onEdit: () => void; onSave: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
      <span className="cap-sm">{title}</span>
      <button
        className="btn btn-sm btn-ghost"
        style={{ marginLeft: 'auto', padding: '0 4px', minWidth: 0 }}
        onClick={editing ? onSave : onEdit}
        title={editing ? 'Enregistrer' : 'Modifier'}
      >
        <i className={`fa-solid ${editing ? 'fa-check' : 'fa-pen'}`} style={{ fontSize: 10 }}/>
      </button>
    </div>
  );
}

type RunwayDraft = { qfu: string; lengthM: string; surface: string };
const SURFACES = ['Revêtue', 'Herbe', 'Stabilisée', 'Eau'];
const ATC_OPTIONS = ['Tour', 'Tour+Approche', 'AFIS', 'A/A', 'MIL', ''];

function VACSidebar({ ad }: { ad: Aerodrome }) {
  const { mutate: updateAerodrome } = useUpdateAerodrome();

  const [editingInfo, setEditingInfo] = useState(false);
  const [editingFuel, setEditingFuel] = useState(false);
  const [editingTax, setEditingTax] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

  // Info draft state
  const [infoDraft, setInfoDraft] = useState({
    night: ad.night,
    ppr: ad.ppr,
    atc: ad.atc ?? '',
    elevation: String(ad.elevation ?? ''),
  });
  const [runwaysDraft, setRunwaysDraft] = useState<RunwayDraft[]>(
    ad.runways.length > 0
      ? ad.runways.map(r => ({ qfu: r.qfu, lengthM: String(r.lengthM), surface: r.surface }))
      : [{ qfu: '', lengthM: '', surface: 'Revêtue' }]
  );

  function initFuelDraft(): FuelDraft {
    return Object.fromEntries(FUEL_OPTIONS.map(f => [f, {
      checked: ad.fuel.includes(f),
      h24: ad.fuelSchedule?.[f]?.h24 ?? true,
      schedule: ad.fuelSchedule?.[f]?.schedule ?? '',
    }]));
  }
  const [fuelDraft, setFuelDraft] = useState<FuelDraft>(initFuelDraft);
  const [taxLanding, setTaxLanding] = useState(String(ad.taxLandingEUR ?? 0));
  const [taxParking, setTaxParking] = useState(String(ad.taxParkingEUR ?? 0));
  const [note, setNote] = useState(ad.note ?? '');

  function savePatch(patch: Partial<Aerodrome>) {
    updateAerodrome({ icao: ad.icao, data: patch });
  }

  function saveInfo() {
    const elevation = parseInt(infoDraft.elevation);
    const runways = runwaysDraft
      .filter(r => r.qfu.trim())
      .map(r => ({ qfu: r.qfu.trim().toUpperCase(), lengthM: parseInt(r.lengthM) || 0, surface: r.surface }));
    savePatch({
      night: infoDraft.night,
      ppr: infoDraft.ppr,
      atc: infoDraft.atc,
      elevation: isNaN(elevation) ? ad.elevation : elevation,
      runways,
    });
    setEditingInfo(false);
  }

  function patchInfo(patch: Partial<typeof infoDraft>) {
    setInfoDraft(prev => ({ ...prev, ...patch }));
  }

  function patchRunway(i: number, patch: Partial<RunwayDraft>) {
    setRunwaysDraft(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function saveFuel() {
    const fuel = FUEL_OPTIONS.filter(f => fuelDraft[f].checked);
    const fuelSchedule: Record<string, FuelAvailability> = {};
    for (const f of fuel) {
      fuelSchedule[f] = fuelDraft[f].h24
        ? { h24: true }
        : { h24: false, schedule: fuelDraft[f].schedule || undefined };
    }
    savePatch({ fuel, fuelSchedule });
    setEditingFuel(false);
  }

  function patchFuelDraft(f: string, patch: Partial<FuelDraftEntry>) {
    setFuelDraft(prev => ({ ...prev, [f]: { ...prev[f], ...patch } }));
  }

  function saveTax() {
    const land = parseFloat(taxLanding);
    const park = parseFloat(taxParking);
    savePatch({
      taxLandingEUR: isNaN(land) ? ad.taxLandingEUR : land,
      taxParkingEUR: isNaN(park) ? ad.taxParkingEUR : park,
    });
    setEditingTax(false);
  }

  function saveNote() {
    savePatch({ note });
    setEditingNote(false);
  }

  const taxTotal = (parseFloat(taxLanding) || 0) + (parseFloat(taxParking) || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

      {/* Informations opérationnelles */}
      <div className="card" style={{ padding: '12px 14px' }}>
        <SectionHeader title="Informations" editing={editingInfo}
          onEdit={() => {
            setInfoDraft({ night: ad.night, ppr: ad.ppr, atc: ad.atc ?? '', elevation: String(ad.elevation ?? '') });
            setRunwaysDraft(ad.runways.length > 0
              ? ad.runways.map(r => ({ qfu: r.qfu, lengthM: String(r.lengthM), surface: r.surface }))
              : [{ qfu: '', lengthM: '', surface: 'Revêtue' }]);
            setEditingInfo(true);
          }}
          onSave={saveInfo}/>
        {editingInfo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            {/* Altitude */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--ink-3)', width: 70 }}>Altitude</span>
              <input type="number" className="input" value={infoDraft.elevation}
                onChange={e => patchInfo({ elevation: e.target.value })}
                style={{ flex: 1, fontSize: 12, padding: '2px 6px', fontFamily: 'var(--font-mono)' }}/>
              <span style={{ color: 'var(--ink-3)' }}>ft</span>
            </div>
            {/* ATC */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--ink-3)', width: 70 }}>ATC</span>
              <select className="input" value={infoDraft.atc}
                onChange={e => patchInfo({ atc: e.target.value })}
                style={{ flex: 1, fontSize: 12, padding: '2px 6px' }}>
                {ATC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                {!ATC_OPTIONS.includes(infoDraft.atc) && <option value={infoDraft.atc}>{infoDraft.atc}</option>}
              </select>
            </div>
            {/* Nuit + PPR */}
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={infoDraft.night} onChange={e => patchInfo({ night: e.target.checked })}
                  style={{ accentColor: 'var(--aero-green)', width: 14, height: 14 }}/>
                <span>VFR nuit autorisé</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={infoDraft.ppr} onChange={e => patchInfo({ ppr: e.target.checked })}
                  style={{ accentColor: 'var(--aero-amber)', width: 14, height: 14 }}/>
                <span>PPR</span>
              </label>
            </div>
            {/* Pistes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>Pistes</span>
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', fontSize: 10 }}
                  onClick={() => setRunwaysDraft(prev => [...prev, { qfu: '', lengthM: '', surface: 'Revêtue' }])}>
                  <i className="fa-solid fa-plus"/> Ajouter
                </button>
              </div>
              {runwaysDraft.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 20px', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                  <input className="input" placeholder="QFU (ex: 03/21)" value={r.qfu}
                    onChange={e => patchRunway(i, { qfu: e.target.value })}
                    style={{ fontSize: 11, padding: '2px 5px', fontFamily: 'var(--font-mono)' }}/>
                  <input type="number" className="input" placeholder="m" value={r.lengthM}
                    onChange={e => patchRunway(i, { lengthM: e.target.value })}
                    style={{ fontSize: 11, padding: '2px 5px', fontFamily: 'var(--font-mono)' }}/>
                  <select className="input" value={r.surface}
                    onChange={e => patchRunway(i, { surface: e.target.value })}
                    style={{ fontSize: 11, padding: '2px 4px' }}>
                    {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => setRunwaysDraft(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--aero-red)', padding: 0, fontSize: 12 }}>
                    <i className="fa-solid fa-xmark"/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 6, columnGap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--ink-3)' }}>ARP</span>
            <span className="mono">{ad.coord[1].toFixed(4)}°N · {ad.coord[0].toFixed(4)}°{ad.coord[0] >= 0 ? 'E' : 'W'}</span>
            <span style={{ color: 'var(--ink-3)' }}>Altitude</span>
            <span className="mono">{ad.elevation} ft</span>
            {ad.runways.map((r, i) => (
              <React.Fragment key={i}>
                <span style={{ color: 'var(--ink-3)' }}>{i === 0 ? 'Piste' : ''}</span>
                <span className="mono">{r.qfu} · {r.lengthM} m · {r.surface}</span>
              </React.Fragment>
            ))}
            {ad.runways.length === 0 && <><span style={{ color: 'var(--ink-3)' }}>Piste</span><span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>—</span></>}
            <span style={{ color: 'var(--ink-3)' }}>ATC</span>
            <span>{ad.atc || '—'}</span>
            <span style={{ color: 'var(--ink-3)' }}>Nuit</span>
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {ad.night
                ? <span className="chip ok" style={{ fontSize: 10 }}>Autorisé</span>
                : <span className="chip" style={{ fontSize: 10 }}>Non autorisé</span>}
              {ad.ppr && <span className="chip warn" style={{ fontSize: 10 }}>PPR</span>}
            </span>
          </div>
        )}
      </div>

      {/* Carburant */}
      <div className="card" style={{ padding: '12px 14px' }}>
        <SectionHeader title="Carburant disponible" editing={editingFuel}
          onEdit={() => { setFuelDraft(initFuelDraft()); setEditingFuel(true); }}
          onSave={saveFuel}/>
        {editingFuel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FUEL_OPTIONS.map(f => {
              const e = fuelDraft[f];
              const color = FUEL_COLOR[f] ?? 'var(--aero-green)';
              return (
                <div key={f} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={e.checked} onChange={ev => patchFuelDraft(f, { checked: ev.target.checked })}
                      style={{ accentColor: color, width: 14, height: 14 }}/>
                    <i className="fa-solid fa-gas-pump" style={{ color, fontSize: 11, width: 14 }}/>
                    <span style={{ fontWeight: e.checked ? 600 : 400 }}>{f}</span>
                  </label>
                  {e.checked && (
                    <div style={{ marginLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
                        <input type="checkbox" checked={e.h24} onChange={ev => patchFuelDraft(f, { h24: ev.target.checked })}
                          style={{ accentColor: 'var(--aero-amber)', width: 12, height: 12 }}/>
                        <span style={{ color: e.h24 ? 'var(--aero-amber)' : 'var(--ink-3)' }}>H24</span>
                      </label>
                      {!e.h24 && (
                        <input
                          className="input"
                          placeholder="Ex : Lun–Sam 8h–18h"
                          value={e.schedule}
                          onChange={ev => patchFuelDraft(f, { schedule: ev.target.value })}
                          style={{ fontSize: 11, padding: '3px 7px' }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {ad.fuel.length === 0
              ? <span style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>Aucun carburant renseigné</span>
              : ad.fuel.map(f => {
                  const avail = ad.fuelSchedule?.[f];
                  const color = FUEL_COLOR[f] ?? 'var(--aero-green)';
                  return (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <i className="fa-solid fa-gas-pump" style={{ color, fontSize: 11, width: 14 }}/>
                      <span>{f}</span>
                      {avail?.h24
                        ? <span className="chip ok" style={{ fontSize: 9, marginLeft: 'auto' }}>H24</span>
                        : avail?.schedule
                          ? <span style={{ color: 'var(--ink-3)', fontSize: 10, marginLeft: 'auto' }}>{avail.schedule}</span>
                          : null}
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      {/* Taxes */}
      <div className="card" style={{ padding: '12px 14px' }}>
        <SectionHeader title="Taxes (par avion)" editing={editingTax}
          onEdit={() => setEditingTax(true)}
          onSave={saveTax}/>
        {editingTax ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--ink-3)', flex: 1 }}>Atterrissage</span>
              <input type="number" min={0} step={1} value={taxLanding}
                onChange={e => setTaxLanding(e.target.value)}
                className="input" style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 6px' }}/>
              <span style={{ color: 'var(--ink-3)' }}>€</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--ink-3)', flex: 1 }}>Parking</span>
              <input type="number" min={0} step={1} value={taxParking}
                onChange={e => setTaxParking(e.target.value)}
                className="input" style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 6px' }}/>
              <span style={{ color: 'var(--ink-3)' }}>€</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 6, columnGap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--ink-3)' }}>Atterrissage</span>
            <span className="mono">{ad.taxLandingEUR ?? 0} €</span>
            <span style={{ color: 'var(--ink-3)' }}>Parking</span>
            <span className="mono">{ad.taxParkingEUR ?? 0} €</span>
            <span style={{ color: 'var(--ink-3)', borderTop: '1px dashed var(--hairline-soft)', paddingTop: 4 }}>Total</span>
            <span className="mono" style={{ fontWeight: 600, borderTop: '1px dashed var(--hairline-soft)', paddingTop: 4 }}>
              {(ad.taxLandingEUR ?? 0) + (ad.taxParkingEUR ?? 0)} €
            </span>
          </div>
        )}
      </div>

      {/* Commentaire */}
      <div className="card" style={{
        padding: '12px 14px',
        background: (note && !editingNote) ? '#fff7df' : undefined,
        borderColor: (note && !editingNote) ? '#e6cf83' : undefined,
      }}>
        <SectionHeader
          title="Commentaire"
          editing={editingNote}
          onEdit={() => setEditingNote(true)}
          onSave={saveNote}
        />
        {editingNote ? (
          <textarea
            className="input" rows={3} autoFocus
            placeholder="Remarques opérationnelles…"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 12, width: '100%', boxSizing: 'border-box' }}
          />
        ) : note ? (
          <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.6 }}>{note}</p>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>Aucun commentaire</span>
        )}
      </div>
    </div>
  );
}

function VACChart({ ad }: { ad: Aerodrome }) {
  const [blocked, setBlocked] = useState(false);
  const url = vacProxyUrl(ad.icao);
  const directUrl = SIA_VAC_DIRECT(ad.icao);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', borderBottom: '1px solid var(--hairline-soft)',
        background: '#f5efd5', flexShrink: 0, gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="fa-solid fa-circle-info"/>
          Source officielle SIA — cycle AIRAC en vigueur
        </span>
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chip"
          style={{ fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
        >
          <i className="fa-solid fa-arrow-up-right-from-square"/>
          Ouvrir dans un onglet
        </a>
      </div>

      {blocked ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
          <i className="fa-solid fa-file-pdf" style={{ fontSize: 44, color: '#c0392b', opacity: 0.55 }}/>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
            Le PDF ne peut pas être affiché directement.<br/>
            Utilisez le bouton ci-dessus pour l'ouvrir dans un nouvel onglet.
          </div>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chip ok"
            style={{ textDecoration: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fa-solid fa-external-link-alt"/>
            Voir la carte VAC {ad.icao}
          </a>
        </div>
      ) : (
        <iframe
          src={url}
          title={`Carte VAC ${ad.icao} — ${ad.name}`}
          style={{ flex: 1, border: 'none', minHeight: 0, height: '100%' }}
          onError={() => setBlocked(true)}
        />
      )}
    </div>
  );
}
