import React from 'react';
import type { Voyage, Variant, VoyageResult } from '../types';
import { acById, personById, AC_MODELS, fmtHr, computeVoyage } from '../data/mockData';
import { useAerodromes } from '../api/aerodromes';

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function formatTime(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

function towColor(tow: number, mtow: number): string {
  const margin = mtow - tow;
  if (margin < 20) return 'var(--aero-red)';
  if (margin < 50) return 'var(--aero-amber)';
  return 'var(--aero-green)';
}

function fuelLeftColor(fuelLeftL: number, burnLh: number): string {
  const endurMin = fuelLeftL / burnLh * 60;
  if (endurMin < 30) return 'var(--aero-red)';
  if (endurMin < 60) return 'var(--aero-amber)';
  return 'var(--aero-green)';
}

interface Props {
  voyage: Voyage;
}

export default function VoyageRecap({ voyage }: Props) {
  const { data: aerodromes } = useAerodromes();

  const acCount = voyage.aircraftIds.length;

  // Compute totals across all variants
  const allComputed = voyage.variants.map(va => computeVoyage(va, voyage.aircraftIds, aerodromes));
  const totalFlightMin = allComputed.reduce((s, c) => s + c.flightMin, 0);
  const totalStopMin = allComputed.reduce((s, c) => s + c.stopMin, 0);
  const totalMin = allComputed.reduce((s, c) => s + c.totalMin, 0);
  const uniquePeople = new Set(
    voyage.variants.flatMap(va =>
      va.crewsByLeg.flatMap(leg =>
        Object.values(leg).flatMap(crew => [crew.cdb, ...crew.pax].filter(Boolean) as string[])
      )
    )
  ).size;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 24px 40px' }}>

      {/* Header voyage */}
      <div style={{
        background: 'var(--ink)', color: '#fff', borderRadius: 10,
        padding: '16px 20px', marginBottom: 24,
        display: 'flex', flexWrap: 'wrap', gap: '20px 40px', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 2 }}>Voyage</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{voyage.title}</div>
        </div>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <Stat label="Vol total" value={fmtHr(totalFlightMin)} />
          <Stat label="Escales" value={fmtHr(totalStopMin)} />
          <Stat label="Durée totale" value={fmtHr(totalMin)} />
          <Stat label="Avions" value={String(acCount)} />
          <Stat label="Participants" value={String(uniquePeople)} />
          <Stat label="Étapes" value={String(voyage.variants.length)} />
        </div>
      </div>

      {/* Une section par étape (variant) */}
      {voyage.variants.map((va, vaIdx) => (
        <VariantSection
          key={va.id}
          variantIdx={vaIdx}
          variant={va}
          computed={allComputed[vaIdx]}
          aircraftIds={voyage.aircraftIds}
        />
      ))}
    </div>
  );
}

function VariantSection({ variantIdx, variant, computed, aircraftIds }: {
  variantIdx: number;
  variant: Variant;
  computed: VoyageResult;
  aircraftIds: string[];
}) {
  const hasTimes = !!variant.departureTime;
  const legTimes: { dep: number; arr: number }[] = [];
  if (hasTimes) {
    let cursor = parseTime(variant.departureTime!);
    computed.legs.forEach((leg, i) => {
      const durMin = Object.values(leg.perAc).reduce((max, p) => Math.max(max, p.durMin), 0);
      legTimes.push({ dep: cursor, arr: cursor + durMin });
      cursor = cursor + durMin + (variant.stopMin[i + 1] ?? 0);
    });
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Étape header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', marginBottom: 8,
        background: 'var(--surface-2)', borderRadius: 6,
        border: '1px solid var(--hairline)',
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--aero-red)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, flexShrink: 0,
        }}>{variantIdx + 1}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{variant.label}</div>
          {variant.weather && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>{variant.weather}</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center' }}>
          <BadgeInfo icon="fa-clock" label={fmtHr(computed.totalMin)} />
          {hasTimes && legTimes.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>
              {formatTime(legTimes[0].dep)}
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 9, color: 'var(--ink-3)', margin: '0 5px' }}/>
              {formatTime(legTimes[legTimes.length - 1].arr)}
            </span>
          )}
        </div>
      </div>

      {/* Branches de cette étape */}
      {computed.legs.map((leg, legIdx) => {
        const acIds = Object.keys(leg.perAc);
        const altFt = variant.cruiseAltFt[legIdx];
        const stop = variant.stopMin[legIdx + 1];
        const times = legTimes[legIdx];

        return (
          <React.Fragment key={legIdx}>
            <div style={{ background: '#fff', border: '1px solid var(--hairline)', borderRadius: 6, marginBottom: 0, overflow: 'hidden' }}>
              {/* Branch header */}
              <div style={{
                padding: '8px 14px', background: 'var(--paper-2)',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: 'var(--ink)', color: '#fff',
                  borderRadius: 3, padding: '1px 6px',
                }}>{legIdx + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{leg.fromIcao}</span>
                <i className="fa-solid fa-arrow-right" style={{ fontSize: 9, color: 'var(--ink-3)' }}/>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{leg.toIcao}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{leg.from.name} → {leg.to.name}</span>
                <div style={{ flex: 1 }}/>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {times && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>
                      {formatTime(times.dep)} → {formatTime(times.arr)}
                    </span>
                  )}
                  <BadgeInfo icon="fa-route" label={`${Math.round(leg.distance)} NM`}/>
                  <BadgeInfo icon="fa-compass" label={`${Math.round(leg.bearing)}°`}/>
                  {altFt != null && <BadgeInfo icon="fa-mountain" label={`FL${Math.round(altFt / 100)}`}/>}
                </div>
              </div>

              {/* Avions */}
              {acIds.map((acId, acIdx) => {
                const ac = acById(acId);
                const res = leg.perAc[acId];
                if (!ac || !res) return null;
                const model = AC_MODELS[ac.model];
                const fuelLoadL = variant.fuelLoadL[legIdx]?.[acId] || 0;
                const cdbPerson = res.crew.cdb ? personById(res.crew.cdb) : null;
                const paxPeople = res.crew.pax.map(id => personById(id)).filter(Boolean);
                const mtow = model?.mtowKg ?? res.mtow;

                return (
                  <div key={acId} style={{
                    padding: '5px 14px',
                    borderTop: acIdx > 0 ? '1px solid var(--hairline)' : undefined,
                    display: 'flex', alignItems: 'center', gap: 10, fontSize: 11,
                  }}>
                    {/* Immat (sans modèle) */}
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: ac.color, minWidth: 64, flexShrink: 0 }}>{ac.reg}</span>

                    {/* Équipage */}
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '3px 5px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {cdbPerson
                        ? <span style={{ fontSize: 10.5, padding: '0 6px', background: 'var(--ink)', color: '#fff8df', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap' }}>{cdbPerson.first} {cdbPerson.last}</span>
                        : <span style={{ fontSize: 10.5, color: 'var(--aero-red)', whiteSpace: 'nowrap' }}>Sans CDB</span>}
                      {paxPeople.map(p => p && (
                        <span key={p.id} style={{ fontSize: 10.5, padding: '0 6px', background: 'var(--paper-2)', color: 'var(--ink-2)', borderRadius: 99, whiteSpace: 'nowrap' }}>{p.first} {p.last}</span>
                      ))}
                    </div>

                    {/* TOW / MTOW · Départ · Brûlé · Restant · Durée — tout sur une ligne */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, fontSize: 11 }} className="mono">
                      <span style={{ color: towColor(res.tow, mtow), fontWeight: 700 }} title="TOW / MTOW">
                        {Math.round(res.tow)}<span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>/{Math.round(mtow)}</span> kg
                      </span>
                      <span style={{ color: 'var(--ink-3)' }}>·</span>
                      <span title="Carb. départ">{Math.round(fuelLoadL)} L</span>
                      <span style={{ color: 'var(--ink-4)' }}>→</span>
                      <span title="Brûlé">-{Math.round(res.burnL)} L</span>
                      <span style={{ color: 'var(--ink-4)' }}>→</span>
                      <span title="Restant" style={{ color: fuelLeftColor(res.fuelLeftL, model?.burnLh || 1), fontWeight: 700 }}>{Math.round(res.fuelLeftL)} L</span>
                      <span style={{ color: 'var(--ink-3)' }}>·</span>
                      <span style={{ color: 'var(--aero-red)', fontWeight: 700 }} title="Durée">{fmtHr(res.durMin)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Escale */}
            {stop != null && stop > 0 && legIdx < computed.legs.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
                <i className="fa-solid fa-clock" style={{ fontSize: 10 }}/>
                Escale à {leg.toIcao} — +{fmtHr(stop)}
                {legTimes[legIdx + 1] && (
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                    → départ {formatTime(legTimes[legIdx + 1].dep)}
                  </span>
                )}
                <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
              </div>
            )}
            {(stop == null || stop === 0) && legIdx < computed.legs.length - 1 && <div style={{ height: 6 }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function BadgeInfo({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-2)' }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: 10, color: 'var(--ink-3)' }}/>
      <span className="mono">{label}</span>
    </span>
  );
}
