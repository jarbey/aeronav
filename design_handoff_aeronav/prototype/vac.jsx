// AeroNav — VAC chart mocks (SVG)

function VACModal({ icao, onClose }) {
  const ad = window.adByIcao(icao);
  if (!ad) return null;
  const chartFn = VAC_CHARTS[icao] || VAC_GENERIC;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{width: "min(1200px, 96vw)"}}>
        <div className="modal-head">
          <h2>
            <span className="mono" style={{marginRight: 8, color:"#ffcf52"}}>{ad.icao}</span>
            {ad.name}
            <span style={{fontSize: 11, marginLeft: 12, color:"#c4b88a", fontWeight: 400}}>Carte VAC · Approche à vue</span>
          </h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{background:"#f1e7c8", padding: 0}}>
          <div style={{padding: 16, display:"grid", gridTemplateColumns:"1fr 280px", gap: 16}}>
            <div className="card" style={{padding: 0, overflow:"hidden", background:"#fbf6e7"}}>
              {chartFn(ad)}
            </div>
            <VACSidebar ad={ad} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VACSidebar({ ad }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap: 12}}>
      <div className="card" style={{padding: "12px 14px"}}>
        <div className="cap-sm">Informations</div>
        <div style={{display:"grid", gridTemplateColumns:"auto 1fr", rowGap: 6, columnGap: 10, fontSize: 12, marginTop: 6}}>
          <span style={{color:"var(--ink-3)"}}>ARP</span>
          <span className="mono">{ad.coord[1].toFixed(4)}°N · {ad.coord[0].toFixed(4)}°{ad.coord[0]>=0?"E":"W"}</span>
          <span style={{color:"var(--ink-3)"}}>Altitude</span>
          <span className="mono">{ad.elevation} ft</span>
          <span style={{color:"var(--ink-3)"}}>Piste</span>
          <span className="mono">{ad.runways[0].qfu} · {ad.runways[0].lengthM} m · {ad.runways[0].surface}</span>
          <span style={{color:"var(--ink-3)"}}>ATC</span>
          <span>{ad.atc}</span>
          <span style={{color:"var(--ink-3)"}}>Nuit</span>
          <span>{ad.night ? "✅ Oui" : "❌ Non"}{ad.ppr ? " · PPR" : ""}</span>
        </div>
      </div>

      <div className="card" style={{padding: "12px 14px"}}>
        <div className="cap-sm">Fréquences</div>
        <div style={{display:"grid", gridTemplateColumns:"auto 1fr", rowGap: 6, columnGap: 10, fontSize: 12, marginTop: 6}}>
          <span style={{color:"var(--ink-3)"}}>{ad.icao === "LFRS" ? "Tour" : "AFIS"}</span>
          <span className="mono"><b>{ad.icao === "LFRS" ? "118.500" : "118.225"}</b> MHz</span>
          {ad.icao === "LFRS" ? <>
            <span style={{color:"var(--ink-3)"}}>Sol</span>
            <span className="mono">121.900 MHz</span>
            <span style={{color:"var(--ink-3)"}}>Approche</span>
            <span className="mono">119.150 MHz</span>
            <span style={{color:"var(--ink-3)"}}>ATIS</span>
            <span className="mono">126.875 MHz</span>
          </> : null}
        </div>
      </div>

      <div className="card" style={{padding: "12px 14px"}}>
        <div className="cap-sm">Services</div>
        <div style={{marginTop: 8, display:"flex", flexDirection:"column", gap: 6, fontSize: 12}}>
          {ad.fuel.map(f => (
            <div key={f} style={{display:"flex", alignItems:"center", gap: 6}}>
              <i className="fa-solid fa-gas-pump" style={{color: f === "Jet-A1" ? "var(--aero-blue)" : "var(--aero-green)", width: 14}}/>
              <span>{f}</span>
              <span className="chip ok" style={{marginLeft:"auto"}}>Dispo</span>
            </div>
          ))}
          <div style={{display:"flex", alignItems:"center", gap: 6}}>
            <i className="fa-solid fa-utensils" style={{width: 14, color:"var(--ink-3)"}}/>
            <span>Restauration</span>
            <span className="chip" style={{marginLeft:"auto"}}>Aéro-club</span>
          </div>
        </div>
      </div>

      <div className="card" style={{padding: "12px 14px"}}>
        <div className="cap-sm">Taxes (par avion)</div>
        <div style={{display:"grid", gridTemplateColumns:"auto 1fr", rowGap: 6, columnGap: 10, fontSize: 12, marginTop: 6}}>
          <span style={{color:"var(--ink-3)"}}>Atterrissage</span>
          <span className="mono">{ad.taxLandingEUR || 0} €</span>
          <span style={{color:"var(--ink-3)"}}>Parking</span>
          <span className="mono">{ad.taxParkingEUR || 0} €</span>
          <span style={{color:"var(--ink-3)", borderTop:"1px dashed var(--hairline-soft)", paddingTop:4}}>Total</span>
          <span className="mono" style={{borderTop:"1px dashed var(--hairline-soft)", paddingTop:4, fontWeight:600}}>{(ad.taxLandingEUR || 0) + (ad.taxParkingEUR || 0)} €</span>
        </div>
      </div>

      {ad.note ? (
        <div className="card" style={{padding: "12px 14px", background: "#fff7df", borderColor:"#e6cf83"}}>
          <div className="cap-sm" style={{color:"var(--aero-amber)"}}>
            <i className="fa-solid fa-triangle-exclamation"/> Note
          </div>
          <div style={{fontSize: 12, marginTop: 6, color:"var(--ink-2)"}}>{ad.note}</div>
        </div>
      ) : null}
    </div>
  );
}

// === VAC for LFRS Nantes Atlantique ===
function VAC_LFRS(ad) {
  return (
    <svg viewBox="0 0 800 540" style={{display:"block", width:"100%", height: "auto", background:"#fbf6e7"}}>
      <defs>
        <pattern id="grass" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="#e3e8c8"/>
          <line x1="0" y1="6" x2="3" y2="3" stroke="#a3b482" strokeWidth="0.6"/>
        </pattern>
        <pattern id="water" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="#d6e7f1"/>
          <line x1="0" y1="4" x2="8" y2="4" stroke="#7ea7c4" strokeWidth="0.3"/>
        </pattern>
        <pattern id="urban" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill="#f0e6c8"/>
          <rect x="2" y="2" width="2.4" height="2.4" fill="#c9b88a"/>
          <rect x="6" y="6" width="2.4" height="2.4" fill="#c9b88a"/>
        </pattern>
      </defs>

      {/* Background terrain */}
      <rect width="800" height="540" fill="#f4ead0"/>
      <g opacity="0.7">
        {/* Loire river / estuary */}
        <path d="M 0 320 Q 100 310 200 300 Q 350 290 500 280 Q 650 260 800 240 L 800 320 L 0 380 Z" fill="url(#water)" />
        {/* Lac de Grand-Lieu */}
        <ellipse cx="280" cy="430" rx="60" ry="35" fill="url(#water)" stroke="#7ea7c4" strokeWidth="0.6"/>
        <text x="280" y="430" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="#143f72" fontStyle="italic">Lac de Grand-Lieu</text>
        {/* Forest patches */}
        <path d="M 80 60 Q 130 50 180 70 Q 200 100 170 130 Q 110 140 70 110 Z" fill="url(#grass)" stroke="#7d8e57" strokeWidth="0.6"/>
        <path d="M 600 80 Q 700 60 780 100 Q 760 160 680 170 Q 600 150 590 110 Z" fill="url(#grass)" stroke="#7d8e57" strokeWidth="0.6"/>
        {/* Urban Nantes */}
        <path d="M 460 100 Q 540 90 600 130 Q 610 200 540 230 Q 480 240 440 200 Q 430 140 460 100 Z" fill="url(#urban)" stroke="#a8967a" strokeWidth="0.6"/>
        <text x="520" y="170" textAnchor="middle" fontFamily="var(--font-sans)" fontSize="12" fontWeight="700" fill="var(--ink)">NANTES</text>
      </g>

      {/* CTR boundary */}
      <g fill="none" stroke="var(--aero-violet)" strokeWidth="1.2" strokeDasharray="6 3" opacity="0.85">
        <path d="M 80 200 Q 250 100 500 90 Q 700 130 740 280 Q 700 460 450 480 Q 200 470 100 350 Z"/>
      </g>
      <text x="120" y="240" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" fill="var(--aero-violet)">CTR LFRS</text>
      <text x="120" y="254" fontFamily="var(--font-mono)" fontSize="9" fill="var(--aero-violet)">SFC — 2500 ft</text>

      {/* Runway 03/21 */}
      <g transform="translate(400 290) rotate(20)">
        <rect x="-180" y="-14" width="360" height="28" fill="#2a2a30" stroke="#000" strokeWidth="0.8"/>
        {/* threshold markings */}
        <g fill="#f5f5f5">
          {[-170,-167,-164,-161,-158,-155].map(x => <rect key={x} x={x} y="-12" width="2" height="24"/>)}
          {[170,167,164,161,158,155].map(x => <rect key={x} x={x-2} y="-12" width="2" height="24"/>)}
        </g>
        {/* centerline */}
        <g stroke="#f5f5f5" strokeWidth="0.8" strokeDasharray="6 4">
          <line x1="-140" y1="0" x2="140" y2="0"/>
        </g>
        {/* QFU labels */}
        <g transform="translate(-160 0)">
          <circle r="9" fill="#fff" stroke="#000" strokeWidth="0.8"/>
          <text textAnchor="middle" y="3" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#000">03</text>
        </g>
        <g transform="translate(160 0) rotate(180)">
          <circle r="9" fill="#fff" stroke="#000" strokeWidth="0.8"/>
          <text textAnchor="middle" y="3" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#000">21</text>
        </g>
      </g>

      {/* Taxiway + apron */}
      <g transform="translate(400 290) rotate(20)">
        <rect x="-60" y="20" width="120" height="8" fill="#bdb392"/>
        <rect x="-100" y="32" width="200" height="40" fill="#d6c594" stroke="#7d6e3a" strokeWidth="0.6"/>
        <text x="0" y="58" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--ink)" transform="rotate(-20 0 58)">APRON</text>
      </g>

      {/* Circuit pattern */}
      <g fill="none" stroke="var(--aero-red)" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.85">
        <path d="M 220 220 L 240 320 L 480 410 L 580 360 L 420 270 Z" />
      </g>
      <g fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--aero-red)">
        <text x="225" y="270">VFR</text>
        <text x="225" y="282">1000 ft AAL</text>
      </g>

      {/* VFR reporting points */}
      {[
        { x: 100, y: 130, label: "N", name: "BLAIN" },
        { x: 720, y: 180, label: "NE", name: "ANCENIS" },
        { x: 130, y: 470, label: "SW", name: "MACHECOUL" },
        { x: 700, y: 460, label: "SE", name: "VERTOU" },
        { x: 690, y: 290, label: "E", name: "BASILIQUE" },
      ].map(p => (
        <g key={p.label} transform={`translate(${p.x} ${p.y})`}>
          <path d="M 0 -10 L 8 0 L 0 10 L -8 0 Z" fill="#fff" stroke="var(--aero-red)" strokeWidth="1.4"/>
          <text textAnchor="middle" y="3" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="var(--aero-red)">{p.label}</text>
          <text textAnchor="middle" y="24" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--ink-2)">{p.name}</text>
        </g>
      ))}

      {/* Obstacles */}
      <g>
        <g transform="translate(560 220)">
          <path d="M 0 0 L -4 -10 L 0 -16 L 4 -10 Z" fill="var(--aero-red)" stroke="#000" strokeWidth="0.4"/>
          <text x="6" y="-6" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="var(--aero-red)">450 ft</text>
        </g>
        <g transform="translate(180 300)">
          <path d="M 0 0 L -4 -10 L 0 -16 L 4 -10 Z" fill="var(--aero-red)" stroke="#000" strokeWidth="0.4"/>
          <text x="6" y="-6" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="var(--aero-red)">320 ft</text>
        </g>
      </g>

      {/* Compass + scale */}
      <g transform="translate(60 70)">
        <circle r="22" fill="rgba(246,239,222,0.95)" stroke="var(--ink-2)" strokeWidth="0.6"/>
        <path d="M 0 -18 L 3 0 L 0 16 L -3 0 Z" fill="var(--aero-red)"/>
        <text textAnchor="middle" y="-12" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="var(--ink)">N</text>
      </g>

      <g transform="translate(580 510)">
        <line x1="0" y1="0" x2="120" y2="0" stroke="var(--ink-2)" strokeWidth="1"/>
        <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--ink-2)"/>
        <line x1="40" y1="-3" x2="40" y2="3" stroke="var(--ink-2)"/>
        <line x1="80" y1="-3" x2="80" y2="3" stroke="var(--ink-2)"/>
        <line x1="120" y1="-4" x2="120" y2="4" stroke="var(--ink-2)"/>
        <text x="60" y="15" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink)">0 — 1 — 2 NM</text>
      </g>

      {/* Title cartouche */}
      <g transform="translate(20 500)">
        <rect width="240" height="30" fill="rgba(255,253,245,0.95)" stroke="var(--ink-2)" strokeWidth="0.8"/>
        <text x="8" y="14" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--ink)">LFRS — NANTES ATLANTIQUE</text>
        <text x="8" y="24" fontFamily="var(--font-sans)" fontSize="8" fill="var(--ink-3)">CTR Classe D · ARP 90 ft · QFU 03/21</text>
      </g>
    </svg>
  );
}

// === VAC for LFKO Propriano ===
function VAC_LFKO(ad) {
  return (
    <svg viewBox="0 0 800 540" style={{display:"block", width:"100%", height: "auto", background:"#fbf6e7"}}>
      <defs>
        <pattern id="grass2" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="#e3e8c8"/>
          <line x1="0" y1="6" x2="3" y2="3" stroke="#a3b482" strokeWidth="0.6"/>
        </pattern>
        <pattern id="sea" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill="#cee0ec"/>
          <path d="M 0 5 Q 2.5 3 5 5 T 10 5" stroke="#7ea7c4" strokeWidth="0.4" fill="none"/>
        </pattern>
        <pattern id="relief" patternUnits="userSpaceOnUse" width="14" height="14">
          <rect width="14" height="14" fill="#e6d6a8"/>
          <path d="M 0 7 L 7 0 L 14 7 L 7 14 Z" fill="#d0b97a" opacity="0.5"/>
        </pattern>
      </defs>

      <rect width="800" height="540" fill="#f4ead0"/>

      {/* Mediterranean Sea on west side */}
      <path d="M 0 0 L 280 0 L 240 100 L 220 200 L 200 320 L 220 440 L 250 540 L 0 540 Z" fill="url(#sea)" stroke="#5d8aa8" strokeWidth="1"/>
      <text x="80" y="280" fontFamily="var(--font-sans)" fontStyle="italic" fontSize="14" fill="#143f72" opacity="0.7">Mer Méditerranée</text>
      <text x="80" y="300" fontFamily="var(--font-sans)" fontStyle="italic" fontSize="11" fill="#143f72" opacity="0.7">Golfe de Valinco</text>

      {/* Mountains (Corsica is mountainous) */}
      <g opacity="0.5">
        <path d="M 500 80 Q 600 60 720 100 Q 760 200 700 280 Q 600 270 540 200 Q 520 140 500 80 Z" fill="url(#relief)"/>
        <path d="M 480 400 Q 600 380 720 420 Q 740 480 680 510 Q 580 510 500 470 Z" fill="url(#relief)"/>
      </g>

      {/* Spot heights */}
      <g fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--aero-red)">
        <text x="640" y="160">★ 4200</text>
        <text x="700" y="230">★ 3850</text>
        <text x="600" y="450">★ 2900</text>
      </g>

      {/* Coastline town - Propriano */}
      <g>
        <circle cx="290" cy="280" r="14" fill="#f0e6c8" stroke="#a8967a" strokeWidth="0.8"/>
        <text x="290" y="310" textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11" fontWeight="700" fill="var(--ink)">PROPRIANO</text>
      </g>

      {/* Runway 18/36 N-S */}
      <g transform="translate(380 290)">
        <rect x="-14" y="-130" width="28" height="260" fill="#2a2a30" stroke="#000" strokeWidth="0.8"/>
        {/* threshold */}
        <g fill="#f5f5f5">
          {[-128,-125,-122,-119,-116,-113].map(y => <rect key={y} x="-12" y={y} width="24" height="2"/>)}
          {[122,119,116,113,110,107].map(y => <rect key={y} x="-12" y={y} width="24" height="2"/>)}
        </g>
        {/* centerline */}
        <g stroke="#f5f5f5" strokeWidth="0.8" strokeDasharray="5 4">
          <line x1="0" y1="-100" x2="0" y2="100"/>
        </g>
        <g transform="translate(0 -120)">
          <circle r="9" fill="#fff" stroke="#000" strokeWidth="0.8"/>
          <text textAnchor="middle" y="3" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#000">36</text>
        </g>
        <g transform="translate(0 120)">
          <circle r="9" fill="#fff" stroke="#000" strokeWidth="0.8"/>
          <text textAnchor="middle" y="3" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#000">18</text>
        </g>
      </g>

      {/* Apron */}
      <g>
        <rect x="395" y="170" width="60" height="80" fill="#d6c594" stroke="#7d6e3a" strokeWidth="0.6"/>
        <text x="425" y="215" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--ink)">APRON</text>
      </g>

      {/* Circuit — left-hand, west over sea (terrain to east) */}
      <g fill="none" stroke="var(--aero-red)" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.85">
        <path d="M 380 130 L 220 180 L 220 380 L 380 430 Z" />
      </g>
      <g fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--aero-red)">
        <text x="240" y="210">VFR LEFT 1000 ft</text>
        <text x="240" y="222">(côté mer obligatoire)</text>
      </g>

      {/* Restricted zone (terrain east) */}
      <g fill="none" stroke="var(--aero-red)" strokeWidth="1.2" opacity="0.5">
        <path d="M 500 80 L 720 100 L 760 280 L 700 380 L 500 380 Z" strokeDasharray="2 3"/>
      </g>
      <text x="560" y="340" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--aero-red)" opacity="0.7">RELIEFS &gt; 3000 ft</text>

      {/* VFR points */}
      {[
        { x: 130, y: 80, label: "W", name: "OLMETO" },
        { x: 150, y: 470, label: "S", name: "CAMPOMORO" },
        { x: 480, y: 110, label: "N", name: "PETRETO" },
      ].map(p => (
        <g key={p.label} transform={`translate(${p.x} ${p.y})`}>
          <path d="M 0 -10 L 8 0 L 0 10 L -8 0 Z" fill="#fff" stroke="var(--aero-red)" strokeWidth="1.4"/>
          <text textAnchor="middle" y="3" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="var(--aero-red)">{p.label}</text>
          <text textAnchor="middle" y="24" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--ink-2)">{p.name}</text>
        </g>
      ))}

      {/* Compass + scale */}
      <g transform="translate(60 70)">
        <circle r="22" fill="rgba(246,239,222,0.95)" stroke="var(--ink-2)" strokeWidth="0.6"/>
        <path d="M 0 -18 L 3 0 L 0 16 L -3 0 Z" fill="var(--aero-red)"/>
        <text textAnchor="middle" y="-12" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="var(--ink)">N</text>
      </g>
      <g transform="translate(580 510)">
        <line x1="0" y1="0" x2="120" y2="0" stroke="var(--ink-2)" strokeWidth="1"/>
        <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--ink-2)"/>
        <line x1="40" y1="-3" x2="40" y2="3" stroke="var(--ink-2)"/>
        <line x1="80" y1="-3" x2="80" y2="3" stroke="var(--ink-2)"/>
        <line x1="120" y1="-4" x2="120" y2="4" stroke="var(--ink-2)"/>
        <text x="60" y="15" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink)">0 — 0.5 — 1 NM</text>
      </g>

      {/* Title */}
      <g transform="translate(20 500)">
        <rect width="240" height="30" fill="rgba(255,253,245,0.95)" stroke="var(--ink-2)" strokeWidth="0.8"/>
        <text x="8" y="14" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--ink)">LFKO — PROPRIANO</text>
        <text x="8" y="24" fontFamily="var(--font-sans)" fontSize="8" fill="var(--ink-3)">AFIS · ARP 13 ft · QFU 18/36 · PPR</text>
      </g>
    </svg>
  );
}

function VAC_GENERIC(ad) {
  return (
    <div style={{padding: 36, textAlign:"center", color:"var(--ink-3)"}}>
      <div style={{fontSize: 48, marginBottom: 12, opacity:0.4}}>
        <i className="fa-solid fa-map" />
      </div>
      <div className="cap-sm" style={{fontSize: 12, color: "var(--ink-2)"}}>Carte VAC non disponible dans ce prototype</div>
      <div style={{marginTop: 6, fontSize: 11}}>
        Mocks disponibles : LFRS Nantes, LFKO Propriano
      </div>
    </div>
  );
}

const VAC_CHARTS = {
  "LFRS": VAC_LFRS,
  "LFKO": VAC_LFKO,
};

window.VACModal = VACModal;
