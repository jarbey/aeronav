import React, { useEffect } from 'react';

interface DrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  canDelete?: boolean;
  width?: number;
  children: React.ReactNode;
}

export function Drawer({ title, subtitle, onClose, onSave, onDelete, saveLabel = 'Enregistrer', canDelete = false, width = 480, children }: DrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,34,64,0.40)', zIndex: 90,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth: '94vw',
        background: 'var(--surface)',
        boxShadow: '-24px 0 64px -16px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        height: '100vh',
        animation: 'drawerSlide 220ms cubic-bezier(.2,.6,.2,1)',
      }}>
        <style>{`@keyframes drawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <div style={{ background: 'var(--ink)', color: '#f3ecd6', padding: '12px 18px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: '#c4b88a', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="close" onClick={onClose} style={{ background: 'transparent', border: 0, color: '#c4b88a', width: 28, height: 28, borderRadius: 4, cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark" style={{ fontSize: 14 }}/>
          </button>
        </div>
        <div className="scroll" style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
          {children}
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {canDelete && (
            <button className="btn" style={{ color: 'var(--aero-red)' }}
              onClick={() => { if (window.confirm('Confirmer la suppression ?')) { onDelete?.(); onClose(); } }}>
              <i className="fa-solid fa-trash"/> Supprimer
            </button>
          )}
          <div style={{ flex: 1 }}/>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { onSave(); onClose(); }}>
            <i className="fa-solid fa-check"/> {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children, span = 1 }: { label: string; hint?: string; children: React.ReactNode; span?: number }) {
  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      <label>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

export function Grid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 14 }}>
      {children}
    </div>
  );
}

export function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: '1px solid var(--hairline-soft)' }}>
        {icon && <i className={`fa-solid ${icon}`}/>}
        {title}
      </div>
      {children}
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}/>
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}

export function ChipSelect({ options, value, onChange, multi = true }: {
  options: string[] | { value: string; label: string }[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const v = typeof opt === 'object' ? opt.value : opt;
        const l = typeof opt === 'object' ? opt.label : opt;
        const sel = multi ? (value as string[]).includes(v) : value === v;
        return (
          <button key={v} type="button"
            onClick={() => {
              if (multi) {
                const arr = value as string[];
                onChange(sel ? arr.filter(x => x !== v) : [...arr, v]);
              } else {
                onChange(v);
              }
            }}
            style={{ padding: '4px 10px', borderRadius: 999, border: `1px solid ${sel ? 'var(--ink)' : 'var(--hairline)'}`, background: sel ? 'var(--ink)' : 'var(--surface-card)', color: sel ? '#fff8df' : 'var(--ink)', fontSize: 11, fontWeight: sel ? 600 : 500, cursor: 'pointer' }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function UnitInput({ value, unit, onChange }: { value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <input type="number" className="input" value={value} onChange={e => onChange(Number(e.target.value))} style={{ paddingRight: 36 }}/>
      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{unit}</span>
    </div>
  );
}

export function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
      <div className="mono" style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
}
