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
          <Stepper value={bag.unitKg} min={0} max={30} unit="kg" step={1} onChange={v => onChange({ ...bag, unitKg: v })}/>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="cap-sm">Total</span>
          <span className="mono" style={{ fontSize: 18, fontWeight: 700, marginLeft: 'auto' }}>
            {bag.count * bag.unitKg} <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500 }}>kg</span>
          </span>
        </div>
      </div>
    </Popover>
  );
}
