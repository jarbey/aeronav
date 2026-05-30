// AeroNav — Paper-style OACI map (France + Corsica)
// Uses window.AERODROMES, window.VOYAGE, window.project, window.MAP_VIEW

const FRANCE_PATH = "M 569 20 L 611 15 L 663 49 L 743 122 L 809 147 L 1025 257 L 994 338 L 902 490 L 957 525 L 939 617 L 1007 727 L 989 736 L 885 792 L 841 774 L 774 764 L 726 763 L 650 848 L 542 848 L 288 769 L 306 757 L 325 686 L 328 641 L 335 547 L 337 494 L 288 461 L 259 385 L 230 382 L 166 339 L 92 323 L 59 309 L 77 274 L 117 243 L 269 250 L 302 231 L 300 145 L 275 145 L 300 152 L 433 167 L 509 125 Z";

const CORSICA_PATH = "M 1158 805 L 1158 833 L 1166 892 L 1136 962 L 1106 946 L 1103 909 L 1099 892 L 1103 846 L 1118 838 Z";

// Coast accent details — tiny inland water + lakes
const LAKE_GENEVA = "M 893 489 Q 895 484 905 482 Q 920 483 928 488 Q 920 493 910 493 Q 898 493 893 489 Z";
const LAKE_BOURGET = "M 879 568 Q 882 561 887 559 Q 891 565 891 574 Q 886 575 879 568 Z";

// Rivers (simplified for atmosphere)
const RIVERS = [
  // Loire-ish
  "M 250 388 Q 360 400 470 410 Q 580 405 660 430 Q 740 460 800 510",
  // Rhône
  "M 902 489 Q 900 540 880 600 Q 860 660 825 720 Q 800 750 775 770",
  // Garonne
  "M 525 770 Q 470 760 410 740 Q 360 720 330 690",
  // Seine
  "M 435 168 Q 480 190 520 220 Q 570 245 620 250",
];

// Major cities for context (lng, lat, name)
const CITIES = [
  { lng: 2.35, lat: 48.85, name: "Paris", big: true },
  { lng: 4.84, lat: 45.75, name: "Lyon", big: true },
  { lng: 5.37, lat: 43.30, name: "Marseille", big: true },
  { lng: -0.58, lat: 44.84, name: "Bordeaux", big: false },
  { lng: 1.44, lat: 43.60, name: "Toulouse", big: false },
  { lng: -1.55, lat: 47.22, name: "Nantes", big: false },
  { lng: 7.27, lat: 43.69, name: "Nice", big: false },
  { lng: -1.68, lat: 48.11, name: "Rennes", big: false },
  { lng: 4.36, lat: 50.85, name: "Bruxelles", big: false, foreign: true },
  { lng: 8.74, lat: 41.93, name: "Ajaccio", big: false },
];

// Compass rose
function CompassRose({ x, y, r = 36 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="rgba(246,239,222,0.85)" stroke="var(--ink-2)" strokeWidth="0.8" />
      <circle r={r-6} fill="none" stroke="var(--ink-3)" strokeWidth="0.4" strokeDasharray="2 2" />
      <g fill="none" stroke="var(--ink-2)" strokeWidth="0.6">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => {
          const a = (deg - 90) * Math.PI/180;
          const inner = deg % 90 === 0 ? r-12 : (deg % 30 === 0 ? r-8 : r-5);
          return <line key={deg} x1={Math.cos(a)*inner} y1={Math.sin(a)*inner} x2={Math.cos(a)*(r-2)} y2={Math.sin(a)*(r-2)} />;
        })}
      </g>
      <g fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" fill="var(--ink)" textAnchor="middle">
        <text y={-r+10} dy="3">N</text>
        <text x={r-10} dy="3">E</text>
        <text y={r-6}>S</text>
        <text x={-r+10} dy="3">W</text>
      </g>
      <path d={`M 0 ${-r+14} L 3 0 L 0 ${r-12} L -3 0 Z`} fill="var(--aero-red)" opacity="0.85" />
      <circle r="1.6" fill="var(--ink)" />
    </g>
  );
}

function GraticuleAndGrid() {
  // 1-degree graticule
  const lines = [];
  for (let lng = -5; lng <= 10; lng += 1) {
    const [x] = window.project([lng, 51.2]);
    const [, y2] = window.project([lng, 41]);
    lines.push(<line key={`v${lng}`} x1={x} y1="0" x2={x} y2={y2} stroke="var(--map-grid)" strokeWidth="0.6" />);
  }
  for (let lat = 41; lat <= 51; lat += 1) {
    const [, y] = window.project([-5.5, lat]);
    const [x2] = window.project([10, lat]);
    lines.push(<line key={`h${lat}`} x1="0" y1={y} x2={x2} y2={y} stroke="var(--map-grid)" strokeWidth="0.6" />);
  }
  return <g>{lines}</g>;
}

function AerodromeMarker({ ad, isOnRoute, isEndpoint, idx, selected, onClick, showRangeRing, hideOffRoute, autonomyNM }) {
  const [x, y] = window.project(ad.coord);
  if (hideOffRoute && !isOnRoute) return null;
  const fill = isOnRoute ? "var(--aero-red)" : "var(--surface-card)";
  const stroke = isOnRoute ? "var(--ink)" : "var(--ink-2)";
  const labelOffsetY = -12;
  const label = ad.icao;
  // 1° lat ≈ 60 NM, but our projection: nNM in y direction = nm/60 deg, then * (1000/10.2)
  // For radius we approximate at center latitude (~46°N): 1 NM ≈ a few px
  const nmToPx = 98.04 / 60; // y scale: ~1.63 px per NM
  return (
    <g className="ad-marker" onClick={onClick} style={{ cursor: "pointer" }}>
      {isOnRoute && showRangeRing && autonomyNM ? (
        <circle cx={x} cy={y} r={autonomyNM * nmToPx}
          fill="rgba(184,50,58,0.05)"
          stroke="var(--aero-red)" strokeOpacity="0.35"
          strokeWidth="0.8" strokeDasharray="3 3" />
      ) : null}
      {/* Halo when selected */}
      {selected ? (
        <circle cx={x} cy={y} r="14" fill="rgba(184,50,58,0.15)" />
      ) : null}
      {/* Symbol: circle with cross (revêtue) or filled circle */}
      <circle className="pad" cx={x} cy={y} r={isOnRoute ? 6 : 4} fill={fill} stroke={stroke} strokeWidth={isOnRoute ? 2 : 1.2} />
      {isOnRoute ? (
        <g stroke="#fff8df" strokeWidth="1.4" strokeLinecap="round">
          <line x1={x-3} y1={y} x2={x+3} y2={y} />
          <line x1={x} y1={y-3} x2={x} y2={y+3} />
        </g>
      ) : null}
      {/* Stage number tag */}
      {isOnRoute && idx !== undefined ? (
        <g>
          <circle cx={x+12} cy={y-10} r="8" fill="var(--ink)" stroke="var(--paper)" strokeWidth="1.2" />
          <text x={x+12} y={y-10} dy="3" textAnchor="middle"
            fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="#fff8df">{idx + 1}</text>
        </g>
      ) : null}
      <text x={x} y={y + labelOffsetY}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={isOnRoute ? 11 : 9.5}
        fontWeight="600"
        fill="var(--ink)"
        stroke="var(--paper)"
        strokeWidth="2.4"
        paintOrder="stroke">{label}</text>
      {isOnRoute ? (
        <text x={x} y={y + 16}
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="9"
          fontWeight="500"
          fill="var(--ink-3)"
          stroke="var(--paper)"
          strokeWidth="2.4"
          paintOrder="stroke">{ad.city}</text>
      ) : null}
    </g>
  );
}

function RouteLine({ route, hoveredLeg }) {
  const lines = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = window.adByIcao(route[i]);
    const b = window.adByIcao(route[i+1]);
    const [x1, y1] = window.project(a.coord);
    const [x2, y2] = window.project(b.coord);
    const isHovered = hoveredLeg === i;
    // shadow line under
    lines.push(
      <line key={`s${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(11,34,64,0.18)" strokeWidth="5" strokeLinecap="round" />
    );
    lines.push(
      <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isHovered ? "var(--aero-red)" : "var(--ink)"}
        strokeWidth={isHovered ? 3.5 : 2.2}
        strokeLinecap="round"
        strokeDasharray="8 4" />
    );
    // mid label: distance + bearing
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dist = window.distNM(a.coord, b.coord).toFixed(0);
    const brg = window.bearingDeg(a.coord, b.coord).toFixed(0);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const angleNorm = (angle > 90 || angle < -90) ? angle + 180 : angle;
    lines.push(
      <g key={`t${i}`} transform={`translate(${mx} ${my}) rotate(${angleNorm})`}>
        <rect x="-32" y="-19" width="64" height="14" fill="rgba(246,239,222,0.95)" stroke="var(--ink-2)" strokeWidth="0.6" rx="2"/>
        <text textAnchor="middle" y="-9"
          fontFamily="var(--font-mono)" fontSize="9.5" fontWeight="600" fill="var(--ink)">
          {dist} NM · {brg.padStart(3,'0')}°
        </text>
      </g>
    );
  }
  return <g>{lines}</g>;
}

function PaperMap({ selectedAerodromeIcao, onSelectAerodrome, hoveredLeg, voyage, opts }) {
  const v = window.MAP_VIEW;
  const onRoute = new Set(voyage.route);
  const idxOf = (icao) => voyage.route.indexOf(icao);
  return (
    <svg className="basemap" viewBox={`0 0 ${v.w} ${v.h}`} preserveAspectRatio="xMidYMid meet">
      {/* Paper-color background fills the letterboxed area outside content */}
      <rect x="-200" y="-200" width={v.w + 400} height={v.h + 400} fill="var(--map-bg)" />

      {/* Water background inside the actual viewBox */}
      <rect width={v.w} height={v.h} fill="var(--map-water)" />

      {/* Land mass (France) — multiple subtle shades */}
      <g>
        <path d={FRANCE_PATH} fill="var(--map-land)" stroke="var(--map-coast)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d={CORSICA_PATH} fill="var(--map-land)" stroke="var(--map-coast)" strokeWidth="1.6" strokeLinejoin="round" />
        {/* Subtle inland shading band — terrain hint */}
        <path d={FRANCE_PATH} fill="url(#terrainHatch)" opacity="0.5" />
      </g>

      {/* Lakes */}
      <g fill="var(--map-water)" stroke="var(--map-coast)" strokeWidth="0.6">
        <path d={LAKE_GENEVA} />
        <path d={LAKE_BOURGET} />
      </g>

      {/* Rivers */}
      <g fill="none" stroke="var(--map-coast)" strokeOpacity="0.45" strokeWidth="0.9">
        {RIVERS.map((r, i) => <path key={i} d={r} />)}
      </g>

      {/* Graticule */}
      <GraticuleAndGrid />

      {/* City labels (context) */}
      <g>
        {CITIES.map(c => {
          const [x, y] = window.project([c.lng, c.lat]);
          return (
            <g key={c.name} opacity={c.foreign ? 0.45 : 0.7}>
              <circle cx={x} cy={y} r={c.big ? 2 : 1.4} fill="var(--ink-2)" />
              <text x={x + 4} y={y + 3}
                fontFamily="var(--font-sans)"
                fontSize={c.big ? 10.5 : 9}
                fontWeight={c.big ? 600 : 500}
                fill="var(--ink-3)"
                stroke="var(--paper)" strokeWidth="2" paintOrder="stroke">
                {c.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* Restricted zone hatch decoration (style only) */}
      <g opacity="0.35">
        <circle cx="610" cy="220" r="32" fill="none" stroke="var(--aero-red)" strokeWidth="1" strokeDasharray="3 3"/>
        <text x="610" y="225" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--aero-red)">LF-P 23</text>
      </g>

      <defs>
        <pattern id="terrainHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--map-coast)" strokeOpacity="0.05" strokeWidth="0.6"/>
        </pattern>
      </defs>

      {/* Route */}
      <RouteLine route={voyage.route} hoveredLeg={hoveredLeg} />

      {/* Aerodromes */}
      <g>
        {window.AERODROMES.filter(a => a.icao !== "LFLY").map(ad => (
          <AerodromeMarker
            key={ad.icao}
            ad={ad}
            isOnRoute={onRoute.has(ad.icao)}
            idx={onRoute.has(ad.icao) ? idxOf(ad.icao) : undefined}
            selected={selectedAerodromeIcao === ad.icao}
            onClick={() => onSelectAerodrome(ad.icao)}
            showRangeRing={opts.rangeRings && onRoute.has(ad.icao)}
            hideOffRoute={opts.hideOffRoute}
            autonomyNM={opts.autonomyNM}
          />
        ))}
      </g>

      {/* Compass rose */}
      <CompassRose x={v.w - 70} y={v.h - 80} r={42} />

      {/* Scale bar */}
      <g transform={`translate(40 ${v.h - 60})`}>
        <rect x="0" y="0" width="200" height="36" fill="rgba(246,239,222,0.9)" stroke="var(--ink-2)" strokeWidth="0.6" rx="2" />
        <g transform="translate(10 18)">
          <line x1="0" y1="0" x2="180" y2="0" stroke="var(--ink-2)" strokeWidth="1"/>
          {[0, 50, 100, 150, 180].map((d, i) => (
            <g key={i}>
              <line x1={d} y1="-4" x2={d} y2="4" stroke="var(--ink-2)" strokeWidth="1"/>
              <text x={d} y="15" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink)">{[0,50,100,150,'NM'][i]}</text>
            </g>
          ))}
        </g>
      </g>

      {/* Title cartouche top-left */}
      <g transform="translate(20 20)">
        <rect width="220" height="48" fill="rgba(246,239,222,0.92)" stroke="var(--ink-2)" strokeWidth="0.8" rx="2"/>
        <text x="12" y="20" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" fill="var(--ink)" letterSpacing="0.08em">VFR FRANCE — OACI</text>
        <text x="12" y="36" fontFamily="var(--font-sans)" fontSize="9" fill="var(--ink-3)">Édition 2026 · Échelle 1:1.000.000 · projection Lambert</text>
      </g>
    </svg>
  );
}

window.PaperMap = PaperMap;
