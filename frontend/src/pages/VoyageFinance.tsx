import React, { useState } from 'react';
import type { Variant, FinanceResult } from '../types';
import { acById, personById, AC_MODELS, PEOPLE, fmtHr } from '../data/mockData';

function fmtEUR(x: number) {
  return `${Math.round(x).toLocaleString('fr-FR')} €`;
}

export default function VoyageFinance({ variant, finance: fin }: { variant: Variant; finance: FinanceResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function expandAll() { setExpanded(new Set(Object.keys(fin.byPerson))); }
  function collapseAll() { setExpanded(new Set()); }

  const pilotBills = Object.values(fin.byPerson).sort((a, b) => b.total - a.total);
  const unassigned = fin.items.filter(it => !it.personId);
  const avgPerPilot = pilotBills.length > 0 ? (fin.totals.total - fin.totals.unassignedCost) / pilotBills.length : 0;
  const maxAbsDelta = Math.max(1, ...pilotBills.map(b => Math.abs(b.total - avgPerPilot)));

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Finance</h2>
        <span className="chip info">Plan {variant.id} · {variant.label}</span>
        <span className="chip"><i className="fa-solid fa-circle-info" style={{ marginRight: 3 }}/> Seul le CDB d'une branche paye pour cette branche</span>
        <div style={{ flex: 1 }}/>
        <button className="btn"><i className="fa-solid fa-file-pdf"/> Exporter le décompte</button>
      </div>

      <div className="card" style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
        <div>
          <div className="cap-sm">Total du voyage</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--aero-red)' }}>{fmtEUR(fin.totals.total)}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            <span className="mono">{fin.totals.hours.toFixed(1)} h</span> de vol cumulées · {Object.keys(fin.byAircraft).length} avions
          </div>
        </div>
        <BreakdownStat label="Heures de vol (coût)" value={fmtEUR(fin.totals.flightCost)}
          sub={`${fin.totals.hours.toFixed(1)}h × tarif horaire`} color="var(--aero-blue)"/>
        <BreakdownStat label="Taxes aérodromes" value={fmtEUR(fin.totals.taxesCost)}
          sub="atter. + parking" color="var(--aero-amber)"/>
        <BreakdownStat label="Pilotes facturés" value={`${pilotBills.length}/${PEOPLE.filter(p => p.rolePref === 'CDB').length}`}
          sub={unassigned.length ? `${unassigned.length} branche(s) sans CDB` : 'Toutes branches affectées'}
          color={unassigned.length ? 'var(--aero-red)' : 'var(--aero-green)'}/>
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="cap-sm" style={{ marginBottom: 10 }}>Répartition par avion</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, Object.keys(fin.byAircraft).length))}, 1fr)`, gap: 14 }}>
          {Object.keys(fin.byAircraft).map(acId => {
            const ac = acById(acId); if (!ac) return null;
            const data = fin.byAircraft[ac.id];
            const m = AC_MODELS[ac.model];
            const pct = fin.totals.total > 0 ? (data.total / fin.totals.total) * 100 : 0;
            return (
              <div key={ac.id} style={{ padding: '10px 12px', border: '1px solid var(--hairline-soft)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: ac.color }}/>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{ac.reg}</span>
                  <span style={{ fontSize: 10, color: 'var(--ink-3)' }} className="mono">{m.hourlyEUR}€/h</span>
                </div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{fmtEUR(data.total)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                  <span className="mono">{data.hours.toFixed(1)}h</span> · vol {fmtEUR(data.flightCost)} · taxes {fmtEUR(data.taxesCost)}
                </div>
                <div className="bar" style={{ marginTop: 8 }}>
                  <span style={{ width: `${pct}%`, background: ac.color }}/>
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--ink-3)', marginTop: 2, textAlign: 'right' }} className="mono">{pct.toFixed(0)}% du total</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="section-title">Décompte par pilote <span className="badge">{pilotBills.length}</span></div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Moyenne : <b className="mono">{fmtEUR(avgPerPilot)}</b> par pilote</span>
        <div style={{ flex: 1 }}/>
        <button className="btn btn-sm btn-ghost" onClick={expandAll}><i className="fa-solid fa-chevron-down"/> Tout déplier</button>
        <button className="btn btn-sm btn-ghost" onClick={collapseAll}><i className="fa-solid fa-chevron-up"/> Tout replier</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12, alignContent: 'start' }}>
        {pilotBills.map(bill => {
          const p = personById(bill.personId); if (!p) return null;
          const isOpen = expanded.has(p.id);
          const delta = bill.total - avgPerPilot;
          const deltaPct = avgPerPilot > 0 ? (delta / avgPerPilot) * 100 : 0;
          const deltaColor = delta > 1 ? 'var(--aero-red)' : (delta < -1 ? 'var(--aero-green-2)' : 'var(--ink-3)');
          const colorIdx = (p.id.charCodeAt(1) % 6) + 1;
          const initials = (p.first[0] + p.last[0]).toUpperCase();
          const barPct = Math.abs(delta) / maxAbsDelta * 50;
          return (
            <div key={p.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => toggleExpanded(p.id)} style={{
                background: isOpen ? 'var(--paper-2)' : 'var(--surface-2)',
                border: 0, borderBottom: '1px solid var(--hairline-soft)',
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: `var(--plane-${colorIdx})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.first} {p.last}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                    <span className="mono">{bill.hours.toFixed(1)}h</span> · {bill.items.length} branche{bill.items.length > 1 ? 's' : ''} · {p.license}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--aero-red)' }}>{fmtEUR(bill.total)}</div>
                  <div style={{ fontSize: 10, color: deltaColor, fontWeight: 600 }} className="mono">
                    {delta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(delta))}
                    <span style={{ color: 'var(--ink-3)', fontWeight: 500, marginLeft: 4 }}>vs moy. ({delta >= 0 ? '+' : ''}{deltaPct.toFixed(0)}%)</span>
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 4 }}/>
              </button>

              <div style={{ padding: '6px 14px', borderBottom: '1px dashed var(--hairline-soft)', background: isOpen ? 'var(--paper)' : 'var(--surface-card)' }}>
                <div style={{ position: 'relative', height: 10, background: 'var(--paper-2)', borderRadius: 99, border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--ink-3)' }}/>
                  <div style={{
                    position: 'absolute', top: 1, bottom: 1,
                    left: delta < 0 ? `${50 - barPct}%` : '50%',
                    width: `${barPct}%`,
                    background: delta > 1 ? 'var(--aero-red)' : (delta < -1 ? 'var(--aero-green)' : 'var(--ink-soft)'),
                    borderRadius: 99, opacity: 0.85,
                  }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-3)', marginTop: 3 }} className="mono">
                  <span>− sous la moyenne</span>
                  <span>moyenne {fmtEUR(avgPerPilot)}</span>
                  <span>+ au-dessus</span>
                </div>
              </div>

              {isOpen && <BillDetail bill={bill}/>}
            </div>
          );
        })}

        {unassigned.length > 0 && (
          <div className="card" style={{ padding: '14px 16px', borderColor: 'var(--aero-red)', background: '#fff7df' }}>
            <div className="cap-sm" style={{ color: 'var(--aero-red)' }}>
              <i className="fa-solid fa-triangle-exclamation"/> Branches sans CDB désigné
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              {unassigned.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: i < unassigned.length - 1 ? '1px dashed var(--hairline-soft)' : 'none' }}>
                  <span className="mono" style={{ fontSize: 11 }}>Branche {it.legIdx + 1}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{it.acId.slice(-3)}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--aero-red)' }} className="mono">{fmtEUR(it.total)} non affecté</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BillDetail({ bill }: { bill: FinanceResult['byPerson'][string] }) {
  return (
    <div style={{ padding: '0 0 4px' }}>
      <table className="table" style={{ fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ width: 38 }}>#</th>
            <th>Branche</th>
            <th>Avion</th>
            <th style={{ textAlign: 'right' }}>Durée</th>
            <th style={{ textAlign: 'right' }}>Vol</th>
            <th style={{ textAlign: 'right' }}>Taxes</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((it, i) => {
            const ac = acById(it.acId);
            if (!ac) return null;
            const m = AC_MODELS[ac.model];
            return (
              <tr key={i}>
                <td>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', color: '#fff8df', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700 }}>{it.legIdx + 1}</span>
                </td>
                <td>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 11 }}>{it.from}</span>
                  <i className="fa-solid fa-arrow-right" style={{ margin: '0 4px', fontSize: 8, color: 'var(--ink-3)' }}/>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 11 }}>{it.to}</span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 4, height: 14, background: ac.color, borderRadius: 1 }}/>
                    <span className="mono" style={{ fontSize: 11 }}>{ac.reg.slice(-3)}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--ink-3)' }} className="mono">{m.hourlyEUR}€/h</span>
                  </span>
                </td>
                <td style={{ textAlign: 'right' }} className="mono">{fmtHr(it.durMin)}</td>
                <td style={{ textAlign: 'right' }} className="mono">{fmtEUR(it.flightCost)}</td>
                <td style={{ textAlign: 'right' }} className="mono">
                  {it.landingTax + it.parkingTax > 0 ? (
                    <span title={`Atter. ${it.landingTax}€ · Park. ${it.parkingTax}€`}>{fmtEUR(it.landingTax + it.parkingTax)}</span>
                  ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono">{fmtEUR(it.total)}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={3} style={{ borderBottom: 0, fontWeight: 600, paddingTop: 10 }}>Total</td>
            <td style={{ textAlign: 'right', borderBottom: 0, paddingTop: 10 }} className="mono"><b>{fmtHr(bill.hours * 60)}</b></td>
            <td style={{ textAlign: 'right', borderBottom: 0, paddingTop: 10 }} className="mono">{fmtEUR(bill.flightCost)}</td>
            <td style={{ textAlign: 'right', borderBottom: 0, paddingTop: 10 }} className="mono">{fmtEUR(bill.taxesCost)}</td>
            <td style={{ textAlign: 'right', borderBottom: 0, paddingTop: 10 }} className="mono">
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--aero-red)' }}>{fmtEUR(bill.total)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BreakdownStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ padding: '0 16px', borderLeft: '1px solid var(--hairline-soft)' }}>
      <div className="cap-sm">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }}/>
        <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      </div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
