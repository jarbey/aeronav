import React from 'react';
import type { Voyage, Variant, VoyageResult } from '../types';
import { acById, personById, AC_MODELS, fmtHr } from '../data/mockData';

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

interface Props {
  voyage: Voyage;
  variant: Variant;
  computed: VoyageResult;
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

function countUniqueParticipants(variant: Variant): number {
  const ids = new Set<string>();
  variant.crewsByLeg.forEach(leg => {
    Object.values(leg).forEach(crew => {
      if (crew.cdb) ids.add(crew.cdb);
      crew.pax.forEach(pid => ids.add(pid));
    });
  });
  return ids.size;
}

export default function VoyageRecap({ voyage, variant, computed }: Props) {
  const uniquePeople = countUniqueParticipants(variant);
  const acCount = voyage.aircraftIds.length;

  // Build per-leg departure/arrival times if departureTime is set
  const hasTimes = !!variant.departureTime;
  const legTimes: { dep: number; arr: number }[] = [];
  if (hasTimes) {
    let cursor = parseTime(variant.departureTime!);
    computed.legs.forEach((leg, i) => {
      const durMin = Object.values(leg.perAc).reduce((max, p) => Math.max(max, p.durMin), 0);
      const dep = cursor;
      const arr = cursor + durMin;
      legTimes.push({ dep, arr });
      cursor = arr + (variant.stopMin[i + 1] ?? 0);
    });
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 24px 40px' }}>

      {/* Header */}
      <div style={{
        background: 'var(--ink)',
        color: '#fff',
        borderRadius: 10,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px 40px',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 2 }}>Voyage</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{voyage.title}</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{voyage.date || '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <Stat label="Vol" value={fmtHr(computed.flightMin)} />
          <Stat label="Escales" value={fmtHr(computed.stopMin)} />
          <Stat label="Total" value={fmtHr(computed.totalMin)} />
          {hasTimes && legTimes.length > 0 && <>
            <Stat label="Départ" value={formatTime(legTimes[0].dep)} />
            <Stat label="Arrivée" value={formatTime(legTimes[legTimes.length - 1].arr)} />
          </>}
          <Stat label="Avions" value={String(acCount)} />
          <Stat label="Participants" value={String(uniquePeople)} />
        </div>
      </div>

      {/* Legs */}
      {computed.legs.map((leg, legIdx) => {
        const acIds = Object.keys(leg.perAc);
        const altFt = variant.cruiseAltFt[legIdx];
        const stop = variant.stopMin[legIdx + 1];
        const times = legTimes[legIdx];

        return (
          <React.Fragment key={legIdx}>
            <div style={{
              background: '#fff',
              border: '1px solid var(--hairline)',
              borderRadius: 8,
              marginBottom: 0,
              overflow: 'hidden',
            }}>
              {/* Leg header */}
              <div style={{
                padding: '10px 16px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  background: 'var(--ink)', color: '#fff',
                  borderRadius: 4, padding: '2px 7px',
                }}>
                  {legIdx + 1}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  {leg.fromIcao}
                </span>
                <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, color: 'var(--ink-3)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  {leg.toIcao}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 4 }}>
                  {leg.from.name} → {leg.to.name}
                </span>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {times && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>
                      {formatTime(times.dep)}
                      <i className="fa-solid fa-arrow-right" style={{ fontSize: 9, color: 'var(--ink-3)' }}/>
                      {formatTime(times.arr)}
                    </span>
                  )}
                  <BadgeInfo icon="fa-route" label={`${Math.round(leg.distance)} NM`} />
                  <BadgeInfo icon="fa-compass" label={`${Math.round(leg.bearing)}°`} />
                  {altFt != null && <BadgeInfo icon="fa-mountain" label={`FL${Math.round(altFt / 100)}`} />}
                </div>
              </div>

              {/* Aircraft rows */}
              {acIds.map((acId, acIdx) => {
                const ac = acById(acId);
                const res = leg.perAc[acId];
                if (!ac || !res) return null;
                const model = AC_MODELS[ac.model];
                const fuelLoadL = (variant.fuelLoadL[legIdx] && variant.fuelLoadL[legIdx][acId]) || 0;
                const cdbPerson = res.crew.cdb ? personById(res.crew.cdb) : null;
                const paxPeople = res.crew.pax.map(id => personById(id)).filter(Boolean);
                const mtow = model?.mtowKg ?? res.mtow;
                const fuelCapL = model?.fuelCapL ?? 0;

                return (
                  <div
                    key={acId}
                    style={{
                      padding: '10px 16px',
                      borderTop: acIdx > 0 ? '1px solid var(--hairline)' : undefined,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                      gap: '0 12px',
                      alignItems: 'center',
                      fontSize: 12,
                    }}
                  >
                    {/* Immat + modèle */}
                    <div>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 12, color: ac.color }}>{ac.reg}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 1 }}>{model?.label ?? ac.model}</div>
                    </div>

                    {/* CDB + PAX */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px', alignItems: 'center' }}>
                        {cdbPerson ? (
                          <span style={{
                            fontSize: 10.5, padding: '1px 7px',
                            background: 'var(--ink)', color: '#fff8df',
                            borderRadius: 99, fontWeight: 700,
                          }}>
                            {cdbPerson.first} {cdbPerson.last}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Sans CDB</span>
                        )}
                        {paxPeople.map(p => p && (
                          <span key={p.id} style={{
                            fontSize: 10.5, padding: '1px 7px',
                            background: 'var(--paper-2)', color: 'var(--ink-2)',
                            borderRadius: 99,
                          }}>
                            {p.first} {p.last}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* TOW / MTOW */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 1 }}>TOW / MTOW</div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: towColor(res.tow, mtow) }}>
                        {Math.round(res.tow)}
                      </span>
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        {' / '}{Math.round(mtow)} kg
                      </span>
                    </div>

                    {/* Carburant départ */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 1 }}>Départ</div>
                      <span className="mono" style={{ fontWeight: 600 }}>{Math.round(fuelLoadL)}</span>
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}> L</span>
                    </div>

                    {/* Brûlé */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 1 }}>Brûlé</div>
                      <span className="mono" style={{ fontWeight: 600 }}>{Math.round(res.burnL)}</span>
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}> L</span>
                    </div>

                    {/* Restant + durée */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 1 }}>Restant</div>
                      <span
                        className="mono"
                        style={{ fontWeight: 700, color: fuelLeftColor(res.fuelLeftL, model?.burnLh || 1) }}
                      >
                        {Math.round(res.fuelLeftL)}
                      </span>
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}> L</span>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 1 }}>{fmtHr(res.durMin)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stopover separator */}
            {stop != null && stop > 0 && legIdx < computed.legs.length - 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                margin: '0',
                color: 'var(--ink-3)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
                <i className="fa-solid fa-clock" style={{ fontSize: 10 }} />
                <span>
                  Escale à {leg.toIcao} — +{fmtHr(stop)}
                  {legTimes[legIdx + 1] && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginLeft: 8, color: 'var(--ink)' }}>
                      → départ {formatTime(legTimes[legIdx + 1].dep)}
                    </span>
                  )}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
              </div>
            )}

            {/* Visual separation between legs when no stopover shown */}
            {(stop == null || stop === 0) && legIdx < computed.legs.length - 1 && (
              <div style={{ height: 8 }} />
            )}
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
      <i className={`fa-solid ${icon}`} style={{ fontSize: 10, color: 'var(--ink-3)' }} />
      <span className="mono">{label}</span>
    </span>
  );
}
