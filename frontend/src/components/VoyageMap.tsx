import React, { useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import L from 'leaflet';
import type { Aerodrome, Variant } from '../types';
import { distNM, bearingDeg } from '../data/mockData';
import { useAerodromes } from '../api/aerodromes';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const FRANCE_BOUNDS: LatLngBoundsExpression = [[41.0, -5.5], [51.5, 10.0]];

// Diamond-shaped waypoint icon
const waypointIcon = L.divIcon({
  html: `<div style="width:11px;height:11px;background:#c8881e;border:2px solid #fff;border-radius:2px;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,0.45);cursor:grab"></div>`,
  iconSize: [11, 11],
  iconAnchor: [5, 5],
  className: '',
});

// ── Fuel pie icon ────────────────────────────────────────────────────────────

const FUEL_COLOR_MAP: { key: string; color: string }[] = [
  { key: 'Jet-A1',  color: '#2468c8' },  // blue
  { key: '100LL',   color: '#2d9e5f' },  // green
  { key: 'MOGAS',   color: '#8e44ad' },  // purple
];

function normFuels(fuels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of fuels) {
    for (const { key } of FUEL_COLOR_MAP) {
      if (f.includes(key.split('/')[0].trim()) && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
  }
  return result;
}

function fuelColor(key: string): string {
  return FUEL_COLOR_MAP.find(e => e.key === key)?.color ?? '#9ca3af';
}

function makeFuelIcon(fuels: string[], r = 4, stroke = '#6a7a8a', sw = 1): L.DivIcon {
  const norm = normFuels(fuels);
  const pad = sw + 1;
  const size = (r + pad) * 2;
  const cx = size / 2;
  const cy = size / 2;

  let inner: string;
  if (norm.length === 0) {
    inner = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffdf5"/>`;
  } else if (norm.length === 1) {
    inner = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fuelColor(norm[0])}"/>`;
  } else {
    const n = norm.length;
    const slices = norm.map((key, i) => {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x1 = (cx + r * Math.cos(a0)).toFixed(2);
      const y1 = (cy + r * Math.sin(a0)).toFixed(2);
      const x2 = (cx + r * Math.cos(a1)).toFixed(2);
      const y2 = (cy + r * Math.sin(a1)).toFixed(2);
      const large = (1 / n) > 0.5 ? 1 : 0;
      return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}Z" fill="${fuelColor(key)}"/>`;
    }).join('');
    inner = slices;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${inner}<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [cx, cy], tooltipAnchor: [0, -r - 2] });
}

// Snap threshold: ~50 screen pixels in NM at lat ~47°N
function snapNmForZoom(zoom: number): number {
  const nmPerPx = (156543 * Math.cos(47 * Math.PI / 180) / 1852) / Math.pow(2, zoom);
  return Math.max(1.5, 50 * nmPerPx);
}

interface SnapProposal {
  legIdx: number;
  ad: Aerodrome;
  screenX: number;
  screenY: number;
  // Click-to-add scenario
  insertAt?: number;
  nextWaypoints?: [number, number][];
  // Drag scenario
  wpIdx?: number;
  draggedTo?: [number, number];
  waypointsBefore?: [number, number][];
  waypointsAfter?: [number, number][];
}

interface VoyageMapProps {
  variant: Variant;
  selectedAerodromeIcao: string;
  selectedLegIdx: number;
  onSelectAerodrome: (icao: string) => void;
  onOpenVAC: (icao: string) => void;
  onWaypointsChange: (legIdx: number, wps: [number, number][]) => void;
  onSplitLeg: (legIdx: number, icao: string) => void;
}

// Returns the index in the waypoints array where a new point should be inserted
// given that the full leg points are [from, ...waypoints, to]
function findInsertIdx(allPoints: [number, number][], click: [number, number]): number {
  let bestDist = Infinity;
  let bestSegIdx = 0;
  for (let i = 0; i < allPoints.length - 1; i++) {
    const d = distToSegment(click, allPoints[i], allPoints[i + 1]);
    if (d < bestDist) { bestDist = d; bestSegIdx = i; }
  }
  // Insert after allPoints[bestSegIdx], which is waypoints index bestSegIdx (since allPoints[0]=from)
  return bestSegIdx; // insert at waypoints[bestSegIdx] (0-based from start of waypoints array)
}

function distToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function MapBoundsController({ route, aerodromes }: { route: string[]; aerodromes: Aerodrome[] }) {
  const map = useMap();
  const prevKey = useRef('');
  const key = route.join(',');
  if (key !== prevKey.current) {
    prevKey.current = key;
    const byIcao = new Map(aerodromes.map(a => [a.icao, a]));
    const points = route.map(icao => byIcao.get(icao)).filter(Boolean).map(ad => ad!.coord);
    if (points.length >= 2) {
      const lats = points.map(([, lat]) => lat);
      const lngs = points.map(([lng]) => lng);
      const pad = 0.5;
      map.fitBounds([
        [Math.min(...lats) - pad, Math.min(...lngs) - pad],
        [Math.max(...lats) + pad, Math.max(...lngs) + pad],
      ], { animate: false });
    }
  }
  return null;
}

// Draggable waypoint marker — reports drag-end position + screen coords
function WaypointMarker({ pos, onDragEnd, onDelete }: {
  pos: [number, number];
  onDragEnd: (lngLat: [number, number], screenX: number, screenY: number) => void;
  onDelete: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  return (
    <Marker
      ref={markerRef}
      position={[pos[1], pos[0]]}
      icon={waypointIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const ll = markerRef.current?.getLatLng();
          if (ll) {
            const nativeEvt = (e as unknown as { originalEvent?: MouseEvent }).originalEvent;
            onDragEnd([ll.lng, ll.lat], nativeEvt?.clientX ?? 0, nativeEvt?.clientY ?? 0);
          }
        },
        dblclick: (e) => {
          L.DomEvent.stopPropagation(e);
          onDelete();
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          {pos[1].toFixed(3)}°N · {pos[0].toFixed(3)}°{pos[0] >= 0 ? 'E' : 'W'}
        </span>
        <span style={{ fontSize: 9, color: '#888', marginLeft: 6 }}>dbl-clic pour supprimer</span>
      </Tooltip>
    </Marker>
  );
}

// One leg polyline + its waypoints
function LegLayer({ legIdx, fromCoord, toCoord, waypoints, isSelected, aerodromes, onWaypointsChange, onPropose }: {
  legIdx: number;
  fromCoord: [number, number];
  toCoord: [number, number];
  waypoints: [number, number][];
  isSelected: boolean;
  aerodromes: Aerodrome[];
  onWaypointsChange: (legIdx: number, wps: [number, number][]) => void;
  onPropose: (p: SnapProposal) => void;
}) {
  const map = useMap();
  const allCoords: [number, number][] = [fromCoord, ...waypoints, toCoord];
  const positions = allCoords.map(([lng, lat]) => [lat, lng] as [number, number]);

  function nearestAerodrome(point: [number, number], thresholdNm: number): Aerodrome | null {
    return aerodromes.reduce<{ ad: Aerodrome | null; dist: number }>(
      (best, ad) => {
        // Skip aerodromes that are already endpoints of this leg
        if (ad.icao === (aerodromes.find(a => a.coord === fromCoord)?.icao)
          || ad.icao === (aerodromes.find(a => a.coord === toCoord)?.icao)) return best;
        const d = distNM(ad.coord, point);
        return d < thresholdNm && d < best.dist ? { ad, dist: d } : best;
      },
      { ad: null, dist: thresholdNm }
    ).ad;
  }

  function addWaypoint(e: L.LeafletMouseEvent) {
    L.DomEvent.stopPropagation(e);
    const click: [number, number] = [e.latlng.lng, e.latlng.lat];
    const insertAt = findInsertIdx(allCoords, click);
    const next = [...waypoints];
    next.splice(insertAt, 0, click);

    const threshold = snapNmForZoom(map.getZoom());
    const nearby = nearestAerodrome(click, threshold);
    if (nearby) {
      onPropose({
        legIdx, ad: nearby,
        screenX: e.originalEvent.clientX,
        screenY: e.originalEvent.clientY,
        insertAt, nextWaypoints: next,
      });
      return;
    }
    onWaypointsChange(legIdx, next);
  }

  function handleDragEnd(wpIdx: number, lngLat: [number, number], screenX: number, screenY: number) {
    const threshold = snapNmForZoom(map.getZoom());
    const nearby = nearestAerodrome(lngLat, threshold);
    if (nearby) {
      onPropose({
        legIdx, ad: nearby, screenX, screenY,
        wpIdx,
        draggedTo: lngLat,
        waypointsBefore: waypoints.slice(0, wpIdx),
        waypointsAfter: waypoints.slice(wpIdx + 1),
      });
      return;
    }
    const next = [...waypoints];
    next[wpIdx] = lngLat;
    onWaypointsChange(legIdx, next);
  }

  function deleteWaypoint(wpIdx: number) {
    onWaypointsChange(legIdx, waypoints.filter((_, i) => i !== wpIdx));
  }

  return (
    <>
      {/* Transparent wide hit zone for click-to-add */}
      <Polyline
        positions={positions}
        pathOptions={{ color: 'transparent', weight: 18, opacity: 0 }}
        eventHandlers={{ click: addWaypoint }}
      />
      {/* Visible polyline */}
      <Polyline
        positions={positions}
        pathOptions={isSelected
          ? { color: '#c8881e', weight: 3, opacity: 1 }
          : { color: '#0b2240', weight: 1.5, dashArray: '6 4', opacity: 0.5 }
        }
        interactive={false}
      />
      {waypoints.map((wp, i) => (
        <WaypointMarker
          key={i}
          pos={wp}
          onDragEnd={(ll, sx, sy) => handleDragEnd(i, ll, sx, sy)}
          onDelete={() => deleteWaypoint(i)}
        />
      ))}
    </>
  );
}

const FUEL_FILTERS: { label: string; value: string; color: string }[] = [
  { label: 'Jet-A1',       value: 'Jet-A1',       color: '#2468c8' },
  { label: '100LL',        value: '100LL',        color: '#2d9e5f' },
  { label: 'MOGAS / UL91', value: 'MOGAS / UL91', color: '#8e44ad' },
];

export default function VoyageMap({ variant, selectedAerodromeIcao, selectedLegIdx, onSelectAerodrome, onOpenVAC, onWaypointsChange, onSplitLeg }: VoyageMapProps) {
  const { data: aerodromes = [] } = useAerodromes();
  const [proposal, setProposal] = useState<SnapProposal | null>(null);
  const [fuelFilter, setFuelFilter] = useState<string | null>(null);

  const byIcao = new Map(aerodromes.map(a => [a.icao, a]));
  const routeAerodromes = variant.route.map(icao => byIcao.get(icao)).filter(Boolean) as Aerodrome[];
  const routeIcaos = new Set(variant.route);

  const selectedFromIcao = variant.route[selectedLegIdx];
  const selectedToIcao   = variant.route[selectedLegIdx + 1];

  // Leg midpoint labels (distance + bearing on direct route)
  const legLabels: { pos: [number, number]; text: string; isSel: boolean }[] = [];
  for (let i = 0; i < routeAerodromes.length - 1; i++) {
    const a = routeAerodromes[i];
    const b = routeAerodromes[i + 1];
    const legWps: [number, number][] = variant.waypoints?.[i] ?? [];
    const allPts: [number, number][] = [a.coord, ...legWps, b.coord];
    const totalDist = allPts.slice(0, -1).reduce((s, p, j) => s + distNM(p, allPts[j + 1]), 0);
    const brg = bearingDeg(a.coord, b.coord);
    // Midpoint of the direct line for label placement
    const mid: [number, number] = [(a.coord[1] + b.coord[1]) / 2, (a.coord[0] + b.coord[0]) / 2];
    legLabels.push({ pos: mid, text: `${totalDist.toFixed(0)} NM · ${brg.toFixed(0).padStart(3, '0')}°`, isSel: i === selectedLegIdx });
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

    {/* Fuel filter overlay — bottom left */}
    <div style={{
      position: 'absolute', bottom: 28, left: 10, zIndex: 500,
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(255,253,245,0.95)', border: '1px solid var(--hairline)',
      borderRadius: 6, padding: '5px 7px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      pointerEvents: 'auto',
    }}>
      <i className="fa-solid fa-gas-pump" style={{ fontSize: 10, color: 'var(--ink-3)', marginRight: 2 }}/>
      <button
        onClick={() => setFuelFilter(null)}
        className={`chip${!fuelFilter ? ' ok' : ''}`}
        style={{ fontSize: 10, cursor: 'pointer', border: 'none', background: !fuelFilter ? undefined : 'transparent' }}
      >
        Tous
      </button>
      {FUEL_FILTERS.map(f => {
        const active = fuelFilter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => setFuelFilter(active ? null : f.value)}
            style={{
              fontSize: 10, cursor: 'pointer', padding: '2px 7px', borderRadius: 99,
              border: `1px solid ${active ? f.color : 'var(--hairline)'}`,
              background: active ? f.color : 'transparent',
              color: active ? '#fff' : 'var(--ink-2)',
              fontWeight: active ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, display: 'inline-block', flexShrink: 0 }}/>
            {f.label}
          </button>
        );
      })}
    </div>

    <MapContainer
      bounds={FRANCE_BOUNDS}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <MapBoundsController route={variant.route} aerodromes={aerodromes}/>

      {/* Leg polylines with interactive waypoints */}
      {routeAerodromes.slice(0, -1).map((a, i) => {
        const b = routeAerodromes[i + 1];
        return (
          <LegLayer
            key={`leg-${i}`}
            legIdx={i}
            fromCoord={a.coord}
            toCoord={b.coord}
            waypoints={variant.waypoints?.[i] ?? []}
            isSelected={i === selectedLegIdx}
            aerodromes={aerodromes}
            onWaypointsChange={onWaypointsChange}
            onPropose={setProposal}
          />
        );
      })}

      {/* Leg distance/bearing labels */}
      {legLabels.map((l, i) => (
        <CircleMarker key={`mid-${i}`} center={l.pos} radius={0} pathOptions={{ opacity: 0 }}>
          <Tooltip permanent direction="top" offset={[0, -4]} className="leaflet-tooltip-leg">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: l.isSel ? '#c8881e' : 'var(--ink)', whiteSpace: 'nowrap' }}>{l.text}</span>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Aerodrome markers — background aerodromes with fuel pie colors */}
      {aerodromes
        .filter(ad => !routeIcaos.has(ad.icao))
        .filter(ad => !fuelFilter || ad.fuel.includes(fuelFilter))
        .map(ad => (
          <Marker
            key={ad.icao}
            position={[ad.coord[1], ad.coord[0]]}
            icon={makeFuelIcon(ad.fuel, 4, '#6a7a8a', 1)}
            eventHandlers={{ click: () => onOpenVAC(ad.icao) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>{ad.icao}</span>
              <span style={{ fontSize: 10, color: '#555', marginLeft: 4 }}>{ad.name}</span>
              {ad.fuel.length > 0 && (
                <span style={{ fontSize: 9, color: '#888', marginLeft: 6 }}>{ad.fuel.join(' · ')}</span>
              )}
            </Tooltip>
          </Marker>
        ))}

      {/* Route aerodrome markers — state colors take priority */}
      {aerodromes
        .filter(ad => routeIcaos.has(ad.icao))
        .map(ad => {
          const isFrom      = ad.icao === selectedFromIcao;
          const isTo        = ad.icao === selectedToIcao;
          const missingFuel = !!fuelFilter && !ad.fuel.includes(fuelFilter);
          const fillColor   = isFrom      ? '#2d7a3a'
                            : isTo        ? '#c8881e'
                            : missingFuel ? '#e67e22'
                            : '#b8323a';
          const radius      = isFrom || isTo ? 8 : 6;
          const weight      = isFrom || isTo ? 2.5 : 1.8;
          return (
            <CircleMarker
              key={ad.icao}
              center={[ad.coord[1], ad.coord[0]]}
              radius={radius}
              pathOptions={{ fillColor, fillOpacity: 1, color: '#0b2240', weight }}
              eventHandlers={{ click: () => onSelectAerodrome(ad.icao) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>{ad.icao}</span>
                <span style={{ fontSize: 10, color: '#555', marginLeft: 4 }}>{ad.name}</span>
                {missingFuel && (
                  <span style={{ fontSize: 9, color: '#e67e22', marginLeft: 6 }}>⚠ {fuelFilter} indisponible</span>
                )}
                {ad.fuel.length > 0 && (
                  <span style={{ fontSize: 9, color: '#888', marginLeft: 6 }}>{ad.fuel.join(' · ')}</span>
                )}
              </Tooltip>
            </CircleMarker>
          );
        })}
    </MapContainer>

    {/* Snap proposal menu */}
    {proposal && (
      <div
        style={{
          position: 'fixed',
          left: proposal.screenX + 12,
          top: proposal.screenY - 10,
          zIndex: 2000,
          background: 'var(--paper)',
          border: '1px solid var(--hairline)',
          borderRadius: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
          padding: '10px 12px',
          minWidth: 220,
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-location-dot" style={{ color: 'var(--aero-amber)' }}/>
          À proximité de{' '}
          <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{proposal.ad.icao}</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>— {proposal.ad.name}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Primary: use as aerodrome stop */}
          <button
            className="btn btn-sm btn-primary"
            style={{ justifyContent: 'flex-start', gap: 8 }}
            onClick={() => {
              if (proposal.wpIdx !== undefined) {
                // Drag scenario: replace waypoint with aerodrome, split leg
                onSplitLeg(proposal.legIdx, proposal.ad.icao);
                // Distribute remaining waypoints to the two new sub-legs via a two-step update
                // (splitLeg already clears waypoints; we restore before/after)
                if ((proposal.waypointsBefore?.length ?? 0) > 0 || (proposal.waypointsAfter?.length ?? 0) > 0) {
                  onWaypointsChange(proposal.legIdx, proposal.waypointsBefore ?? []);
                  onWaypointsChange(proposal.legIdx + 1, proposal.waypointsAfter ?? []);
                }
              } else {
                onSplitLeg(proposal.legIdx, proposal.ad.icao);
              }
              setProposal(null);
            }}
          >
            <i className="fa-solid fa-scissors"/>
            {proposal.wpIdx !== undefined ? `Remplacer par escale ${proposal.ad.icao}` : `Couper la branche via ${proposal.ad.icao}`}
          </button>
          {/* Secondary: keep as waypoint */}
          <button
            className="btn btn-sm"
            style={{ justifyContent: 'flex-start', gap: 8 }}
            onClick={() => {
              if (proposal.wpIdx !== undefined) {
                // Drag: just move the waypoint to the dragged position
                const next = [...(proposal.waypointsBefore ?? []), proposal.draggedTo!, ...(proposal.waypointsAfter ?? [])];
                onWaypointsChange(proposal.legIdx, next);
              } else {
                onWaypointsChange(proposal.legIdx, proposal.nextWaypoints!);
              }
              setProposal(null);
            }}
          >
            <i className="fa-solid fa-diamond" style={{ fontSize: 9 }}/>
            {proposal.wpIdx !== undefined ? 'Conserver comme waypoint' : 'Ajouter comme waypoint'}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            style={{ justifyContent: 'flex-start', gap: 8, color: 'var(--ink-3)' }}
            onClick={() => setProposal(null)}
          >
            <i className="fa-solid fa-xmark"/>
            Annuler
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
