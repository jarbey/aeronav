import React, { useEffect, useState, useRef } from 'react';

interface PopoverProps {
  onClose: () => void;
  anchor: DOMRect;
  children: React.ReactNode;
  width?: number;
}

export function Popover({ onClose, anchor, children, width = 320 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const margin = 8;
    let top = anchor.bottom + margin;
    let left = anchor.left;
    if (left + width + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    const estHeight = 380;
    if (top + estHeight > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - estHeight - margin);
    }
    setPos({ top, left });
  }, [anchor, width]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!pos) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(11,34,64,0.10)',
    }}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: pos.top, left: pos.left, width,
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 8, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 380,
      }}>
        {children}
      </div>
    </div>
  );
}

export function PopoverHeader({ title, onClose, sub }: { title: string; onClose: () => void; sub?: string }) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--hairline-soft)', background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="cap-sm">{title}</div>
        <button onClick={onClose} className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
          <i className="fa-solid fa-xmark"/>
        </button>
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
