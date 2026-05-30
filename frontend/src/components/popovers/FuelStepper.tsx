import React from 'react';
import { Popover, PopoverHeader } from './Popover';
import { Stepper } from './BagsStepper';
import type { Aircraft } from '../../types';

interface Props {
  anchor: DOMRect;
  onClose: () => void;
  ac: Aircraft;
  fuelL: number;
  fuelCapL: number;
  onChange: (fuelL: number) => void;
}

export default function FuelPicker({ anchor, onClose, ac, fuelL, fuelCapL, onChange }: Props) {
  return (
    <Popover anchor={anchor} onClose={onClose} width={280}>
      <PopoverHeader title={`Carburant au décollage — ${ac.reg}`} onClose={onClose} sub={`Capacité max : ${fuelCapL} L`}/>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Stepper value={fuelL} min={0} max={fuelCapL} step={5} unit="L" onChange={onChange}/>
        <input type="range" min={0} max={fuelCapL} step={5}
          value={fuelL} onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%' }}/>
      </div>
    </Popover>
  );
}
