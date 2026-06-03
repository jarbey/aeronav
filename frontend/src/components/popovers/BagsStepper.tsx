import React from 'react';
import { Popover, PopoverHeader } from './Popover';
import type { Aircraft, BagLoad } from '../../types';

interface Props {
  anchor: DOMRect;
  onClose: () => void;
  ac: Aircraft;
  bag: BagLoad;
  onChange: (bag: BagLoad) => void;
}

export function Stepper({ value, min = 0, max = 999, step = 1, unit, onChange }: {
  value: number; min?: number; max?: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
      <button className="btn btn-sm" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
        <i className="fa-solid fa-minus"/>
      </button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <button className="btn btn-sm" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
        <i className="fa-solid fa-plus"/>
      </button>
    </div>
  );
}

export default function BagsPicker({ anchor, onClose, ac, bag, onChange }: Props) {
  const bagTotal = bag.count * bag.unitKg;
  const extraKg = bag.extraKg || 0;
  const total = bagTotal + extraKg;

  return (
    <Popover anchor={anchor} onClose={onClose} width={280}>
      <PopoverHeader title={`Bagages — ${ac.reg}`} onClose={onClose}/>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="cap-sm" style={{ marginBottom: 6 }}>Nombre de bagages</div>
          <Stepper value={bag.count} min={0} max={20} onChange={v => onChange({ ...bag, count: v })}/>
        </div>
        <div>
          <div className="cap-sm" style={{ marginBottom: 6 }}>Poids unitaire</div>
          <Stepper value={bag.unitKg} min={0} max={50} unit="kg" step={1} onChange={v => onChange({ ...bag, unitKg: v })}/>
        </div>

        {/* Séparateur */}
        <div style={{ borderTop: '1px dashed var(--hairline-soft)' }}/>

        <div>
          <div className="cap-sm" style={{ marginBottom: 6 }}>
            Poids libre supplémentaire
            <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6 }}>
              fret, matériel…
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={0}
              max={500}
              step={1}
              className="input"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, textAlign: 'center' }}
              value={extraKg || ''}
              placeholder="0"
              onChange={e => onChange({ ...bag, extraKg: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0) })}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>kg</span>
            {extraKg > 0 && (
              <button className="btn btn-sm btn-ghost" title="Effacer" onClick={() => onChange({ ...bag, extraKg: 0 })}>
                <i className="fa-solid fa-xmark" style={{ fontSize: 10 }}/>
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: bagTotal > 0 && extraKg > 0 ? 4 : 0 }}>
            <span className="cap-sm">Total</span>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700, marginLeft: 'auto' }}>
              {total} <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500 }}>kg</span>
            </span>
          </div>
          {bagTotal > 0 && extraKg > 0 && (
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }} className="mono">
              {bag.count}×{bag.unitKg} kg + {extraKg} kg libre
            </div>
          )}
        </div>
      </div>
    </Popover>
  );
}
