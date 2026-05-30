import React, { useState } from 'react';
import type { User } from '../types';
import { LS_TOKEN } from '../stores/authStore';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

async function apiLogin(email: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? 'Erreur de connexion');
  }
  return res.json() as Promise<{ user: User; token: string }>;
}

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  async function loginWithProvider(provider: string) {
    // OAuth not implemented yet — show email login
    console.warn('OAuth not configured for provider:', provider);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      background: 'radial-gradient(ellipse at top, #1a3556 0%, #0b2240 35%, #061629 100%)',
      color: '#f3ecd6', overflow: 'hidden',
    }}>
      {/* Background atmosphere — sketched route lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="lp-grid" patternUnits="userSpaceOnUse" width="80" height="80">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#ffcf52" strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#lp-grid)"/>
        <g stroke="#ffcf52" fill="none" strokeWidth="1.2" strokeDasharray="8 4">
          <path d="M 100 800 Q 400 600 700 650 Q 1000 700 1300 400 Q 1450 280 1550 200"/>
          <path d="M 50 200 Q 350 250 600 180 Q 900 100 1200 280"/>
        </g>
        {([[180,780],[700,650],[1300,400],[1550,200],[50,200],[600,180],[1200,280]] as [number,number][]).map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="6" fill="#ffcf52"/>
        ))}
      </svg>

      {/* Left brand panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8% 0 8%', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <svg width="56" height="56" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" stroke="#ffcf52" strokeWidth="1.5" fill="none" opacity="0.4"/>
            <circle cx="20" cy="20" r="13" stroke="#ffcf52" strokeWidth="0.8" fill="none" opacity="0.6"/>
            <path d="M20 5 L24 22 L20 28 L16 22 Z" fill="#ffcf52"/>
            <path d="M20 28 L20 36" stroke="#ffcf52" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="20" cy="20" r="2" fill="#0b2240" stroke="#ffcf52" strokeWidth="1"/>
          </svg>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.02em' }}>AeroNav</div>
            <div style={{ fontSize: 12, color: '#c4b88a', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Voyage Planner</div>
          </div>
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.15, margin: 0, marginBottom: 16, maxWidth: 540 }}>
          Planifiez vos voyages en formation, en toute simplicité.
        </h1>
        <p style={{ fontSize: 15, color: '#c4b88a', maxWidth: 480, lineHeight: 1.5, margin: 0, marginBottom: 32 }}>
          Carburant, masse, équipages, taxes d'aérodrome, finances : tout est calculé pour chaque branche, sur toute la flotte de votre aéroclub.
        </p>
        <div style={{ display: 'flex', gap: 18, fontSize: 12, color: '#8c8569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span><i className="fa-solid fa-route" style={{ marginRight: 6, color: '#ffcf52' }}/> Multi-avions</span>
          <span><i className="fa-solid fa-map" style={{ marginRight: 6, color: '#ffcf52' }}/> Cartes VAC</span>
          <span><i className="fa-solid fa-coins" style={{ marginRight: 6, color: '#ffcf52' }}/> Finances</span>
        </div>
      </div>

      {/* Right login card */}
      <div style={{ width: 480, padding: '0 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: 'rgba(255,253,245,0.97)',
          color: 'var(--ink)',
          borderRadius: 12,
          padding: '36px 28px',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,207,82,0.15)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Connexion</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Choisissez votre méthode d'authentification</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* TODO: OAuth buttons — currently mock login */}
            <ProviderButton provider="google" onClick={() => loginWithProvider('google')}/>
            <ProviderButton provider="facebook" onClick={() => loginWithProvider('facebook')}/>
            <ProviderButton provider="microsoft" onClick={() => loginWithProvider('microsoft')}/>
            <ProviderButton provider="apple" onClick={() => loginWithProvider('apple')}/>
          </div>

          <div style={{ margin: '20px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
            <span style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
          </div>

          {/* Email login */}
          <EmailLogin onLogin={onLogin} />

          <div style={{ marginTop: 20, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>
            En vous connectant, vous acceptez les <a href="#" style={{ color: 'var(--aero-blue)' }}>CGU</a> et la <a href="#" style={{ color: 'var(--aero-blue)' }}>politique de confidentialité</a>.
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 10.5, color: '#8c8569', textAlign: 'center' }}>
          Pas encore de compte ? <a href="#" style={{ color: '#ffcf52', fontWeight: 600 }}>Demander l'accès à mon aéroclub</a>
        </div>
      </div>
    </div>
  );
}

function EmailLogin({ onLogin }: { onLogin: (user: User) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError('');
    setLoading(true);
    try {
      const { user, token } = await apiLogin(trimmed);
      localStorage.setItem(LS_TOKEN, token);
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aucun compte trouvé pour cet email.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        marginTop: 14,
        background: 'transparent', border: '1px solid var(--hairline)',
        padding: '10px 14px',
        width: '100%',
        borderRadius: 8,
        fontSize: 12, fontWeight: 500,
        color: 'var(--ink-2)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <i className="fa-regular fa-envelope" style={{ fontSize: 13 }}/> Connexion par email
      </button>
    );
  }

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="email"
        className="input"
        autoFocus
        placeholder="votre@email.fr"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') { void submit(); } }}
      />
      {error && <div style={{ fontSize: 11, color: 'var(--aero-red)' }}>{error}</div>}
      <button onClick={() => { void submit(); }} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? <i className="fa-solid fa-spinner fa-spin"/> : <i className="fa-solid fa-arrow-right"/>} Se connecter
      </button>
    </div>
  );
}

function ProviderButton({ provider, onClick }: { provider: string; onClick: () => void }) {
  const map: Record<string, { label: string; icon: string; bg: string; fg: string; border: string }> = {
    google:    { label: 'Continuer avec Google',    icon: 'fa-brands fa-google',      bg: '#fff',     fg: '#222', border: '1px solid #ddd' },
    facebook:  { label: 'Continuer avec Facebook',  icon: 'fa-brands fa-facebook-f',  bg: '#1877f2',  fg: '#fff', border: '0' },
    microsoft: { label: 'Continuer avec Microsoft', icon: 'fa-brands fa-microsoft',   bg: '#fff',     fg: '#222', border: '1px solid #ddd' },
    apple:     { label: 'Continuer avec Apple',     icon: 'fa-brands fa-apple',       bg: '#000',     fg: '#fff', border: '0' },
  };
  const m = map[provider];
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: '10px 14px',
      background: m.bg, color: m.fg, border: m.border,
      borderRadius: 8,
      fontSize: 13, fontWeight: 600,
      cursor: 'pointer',
      transition: 'transform 80ms ease',
      width: '100%',
    }}
    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
    onMouseUp={e => (e.currentTarget.style.transform = '')}>
      <i className={m.icon} style={{ fontSize: 15 }}/> {m.label}
    </button>
  );
}
