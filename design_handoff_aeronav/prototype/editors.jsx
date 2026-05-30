// AeroNav — Inline editors (popovers for crew, aerodrome, bags)

const { useState: useStateE, useRef: useRefE, useEffect: useEffectE } = React;

// Generic popover backdrop
function Popover({ onClose, anchor, children, width = 320 }) {
  // anchor is a {top, left, right, bottom} in viewport coords (DOMRect-ish)
  const ref = useRefE(null);
  // Position: under anchor, right-aligned if it would overflow viewport
  const [pos, setPos] = useStateE(null);
  useEffectE(() => {
    if (!anchor) return;
    const margin = 8;
    let top = anchor.bottom + margin;
    let left = anchor.left;
    // Right edge overflow
    if (left + width + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    // Bottom overflow — estimate 360px height
    const estHeight = 380;
    if (top + estHeight > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - estHeight - margin);
    }
    setPos({ top, left });
  }, [anchor, width]);

  useEffectE(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pos) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100, background: "rgba(11,34,64,0.10)",
    }}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        position: "absolute", top: pos.top, left: pos.left, width,
        background: "var(--surface)", border: "1px solid var(--hairline)",
        borderRadius: 8, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.25)",
        overflow: "hidden", display: "flex", flexDirection: "column",
        maxHeight: 380,
      }}>
        {children}
      </div>
    </div>
  );
}

function PopoverHeader({ title, onClose, sub }) {
  return (
    <div style={{padding: "10px 12px", borderBottom: "1px solid var(--hairline-soft)", background: "var(--surface-2)"}}>
      <div style={{display:"flex", alignItems:"center", gap: 8}}>
        <div className="cap-sm">{title}</div>
        <button onClick={onClose} className="btn btn-sm btn-ghost" style={{marginLeft:"auto"}}>
          <i className="fa-solid fa-xmark"/>
        </button>
      </div>
      {sub ? <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>{sub}</div> : null}
    </div>
  );
}

// === Aerodrome picker — replace a leg endpoint ===
function AerodromePicker({ anchor, onClose, onPick, currentIcao, label }) {
  const [q, setQ] = useStateE("");
  const rows = window.AERODROMES.filter(a =>
    !q || `${a.icao} ${a.name} ${a.city}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Popover anchor={anchor} onClose={onClose} width={340}>
      <PopoverHeader title={label || "Remplacer l'aérodrome"} sub={`Actuel : ${currentIcao}`} onClose={onClose} />
      <div style={{padding: "8px 12px"}}>
        <input className="input" autoFocus placeholder="Rechercher un OACI, ville…"
          value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="scroll" style={{flex:1, overflow:"auto", padding: "0 6px 8px"}}>
        {rows.map(ad => (
          <button key={ad.icao}
            onClick={() => { onPick(ad.icao); onClose(); }}
            disabled={ad.icao === currentIcao}
            style={{
              width: "100%", textAlign:"left", border: 0,
              background: ad.icao === currentIcao ? "var(--paper-2)" : "transparent",
              padding: "8px 10px", borderRadius: 4, cursor: ad.icao === currentIcao ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              opacity: ad.icao === currentIcao ? 0.6 : 1,
            }}>
            <span className="mono" style={{fontWeight:700, fontSize: 12, width: 44}}>{ad.icao}</span>
            <div style={{flex:1, minWidth: 0}}>
              <div style={{fontSize: 12, fontWeight: 500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{ad.name}</div>
              <div style={{fontSize: 10, color:"var(--ink-3)"}}>
                {ad.runways[0].lengthM}m · {ad.fuel.join("/")} · {ad.taxLandingEUR}€
              </div>
            </div>
            {ad.night ? <span className="dot ok" title="Utilisable de nuit"/> : <span className="dot warn" title="Pas la nuit"/>}
          </button>
        ))}
        {rows.length === 0 ? (
          <div style={{padding: 12, color:"var(--ink-3)", fontSize: 11, textAlign:"center"}}>Aucun résultat</div>
        ) : null}
      </div>
    </Popover>
  );
}

// === Crew picker — assign CDB and PAX for a single aircraft on a single leg ===
function CrewPicker({ anchor, onClose, ac, legIdx, variant, onChange }) {
  const m = window.AC_MODELS[ac.model];
  const crew = (variant.crewsByLeg[legIdx] && variant.crewsByLeg[legIdx][ac.id]) || { cdb: null, pax: [] };
  // Find all people authorized for this aircraft
  const authorized = window.PEOPLE.filter(p => p.authorizedModels.includes(ac.model));
  // Find people already on OTHER aircraft this leg (to flag conflict but allow override)
  const otherAcIds = Object.keys(variant.crewsByLeg[legIdx] || {}).filter(id => id !== ac.id);
  const otherCrews = otherAcIds.reduce((acc, aid) => {
    const a = window.acById(aid);
    const c = variant.crewsByLeg[legIdx][aid] || { cdb: null, pax: [] };
    if (a && c.cdb) acc[c.cdb] = a.reg;
    c.pax.forEach(pid => { if (a) acc[pid] = a.reg; });
    return acc;
  }, {});
  // Pilots: those with rolePref CDB
  const pilots = authorized.filter(p => p.rolePref === "CDB");
  const seatsTotal = m.seats; // CDB + (seats - 1) pax
  const paxSeats = seatsTotal - 1;

  function setCdb(pid) {
    onChange({ ...crew, cdb: pid });
  }
  function togglePax(pid) {
    let np;
    if (crew.pax.includes(pid)) np = crew.pax.filter(x => x !== pid);
    else if (crew.pax.length < paxSeats) np = [...crew.pax, pid];
    else return;
    onChange({ ...crew, pax: np });
  }
  function clearAll() { onChange({ cdb: null, pax: [] }); }

  return (
    <Popover anchor={anchor} onClose={onClose} width={400}>
      <PopoverHeader
        title={`Équipage — ${ac.reg}`}
        sub={`${m.label} · ${seatsTotal} sièges · branche ${legIdx + 1}`}
        onClose={onClose} />
      <div className="scroll" style={{flex:1, overflow:"auto"}}>
        <div style={{padding: "10px 12px 6px", display:"flex", alignItems:"center"}}>
          <div className="cap-sm">Commandant de bord</div>
          <button className="btn btn-sm btn-ghost" style={{marginLeft:"auto"}} onClick={clearAll}>
            <i className="fa-solid fa-rotate-left"/> Effacer
          </button>
        </div>
        <div style={{padding: "0 8px 6px"}}>
          {pilots.length === 0 ? (
            <div style={{padding: 8, fontSize: 11, color:"var(--aero-red)"}}>
              <i className="fa-solid fa-triangle-exclamation"/> Aucun pilote qualifié pour {m.icon}
            </div>
          ) : null}
          {pilots.map(p => {
            const sel = crew.cdb === p.id;
            const conflict = otherCrews[p.id] && otherCrews[p.id] !== ac.reg;
            return (
              <button key={p.id} onClick={() => setCdb(sel ? null : p.id)} style={{
                width:"100%", textAlign:"left", border:0,
                background: sel ? "#fff7df" : "transparent",
                padding: "6px 10px", borderRadius: 4,
                display:"flex", alignItems:"center", gap: 8, cursor:"pointer",
                borderLeft: `3px solid ${sel ? "#c89e23" : "transparent"}`,
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: "1.5px solid var(--ink-2)",
                  background: sel ? "var(--ink)" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {sel ? <span style={{width:6, height:6, background:"#ffcf52", borderRadius:"50%"}}/> : null}
                </span>
                <span style={{fontSize: 12, fontWeight: sel ? 600 : 500}}>{p.first} {p.last}</span>
                <span className="mono" style={{fontSize: 10, color:"var(--ink-3)"}}>{p.weightKg}kg</span>
                <span style={{marginLeft:"auto", display:"flex", gap:4}}>
                  <span className="chip" style={{fontSize:9}}>{p.license}</span>
                  {conflict ? <span className="chip warn" style={{fontSize:9}} title="Déjà sur un autre avion">{otherCrews[p.id]}</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{padding: "10px 12px 6px"}}>
          <div className="cap-sm">Passagers · {crew.pax.length}/{paxSeats}</div>
        </div>
        <div style={{padding: "0 8px 12px"}}>
          {authorized.filter(p => p.id !== crew.cdb).map(p => {
            const sel = crew.pax.includes(p.id);
            const full = !sel && crew.pax.length >= paxSeats;
            const conflict = otherCrews[p.id] && otherCrews[p.id] !== ac.reg;
            return (
              <button key={p.id} onClick={() => togglePax(p.id)} disabled={full}
                style={{
                  width:"100%", textAlign:"left", border:0,
                  background: sel ? "var(--paper-2)" : "transparent",
                  padding: "6px 10px", borderRadius: 4,
                  display:"flex", alignItems:"center", gap: 8,
                  cursor: full ? "not-allowed" : "pointer",
                  opacity: full ? 0.5 : 1,
                }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 2,
                  border: "1.5px solid var(--ink-2)",
                  background: sel ? "var(--ink)" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "#ffcf52", fontSize: 9,
                }}>{sel ? "✓" : ""}</span>
                <span style={{fontSize: 12, fontWeight: sel ? 600 : 500}}>{p.first} {p.last}</span>
                <span className="mono" style={{fontSize: 10, color:"var(--ink-3)"}}>{p.weightKg}kg</span>
                {p.rolePref === "CDB" ? <span className="chip info" style={{fontSize:9}}>pilote</span> : null}
                {conflict ? <span className="chip warn" style={{fontSize:9, marginLeft:"auto"}} title="Déjà sur un autre avion">{otherCrews[p.id]}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}

// === Bags editor — inline popover with steppers ===
function BagsPicker({ anchor, onClose, bag, onChange, ac }) {
  return (
    <Popover anchor={anchor} onClose={onClose} width={280}>
      <PopoverHeader title={`Bagages — ${ac.reg}`} onClose={onClose} />
      <div style={{padding: "12px 14px", display:"flex", flexDirection:"column", gap: 14}}>
        <div>
          <div className="cap-sm" style={{marginBottom: 6}}>Nombre de bagages</div>
          <Stepper value={bag.count} min={0} max={20}
            onChange={v => onChange({ ...bag, count: v })} />
        </div>
        <div>
          <div className="cap-sm" style={{marginBottom: 6}}>Poids unitaire</div>
          <Stepper value={bag.unitKg} min={0} max={30} unit="kg" step={1}
            onChange={v => onChange({ ...bag, unitKg: v })} />
        </div>
        <div style={{
          padding: "10px 12px", background: "var(--surface-2)", borderRadius: 4,
          display:"flex", alignItems:"baseline", gap: 8,
        }}>
          <span className="cap-sm">Total</span>
          <span className="mono" style={{fontSize: 18, fontWeight: 700, marginLeft:"auto"}}>
            {bag.count * bag.unitKg} <span style={{fontSize:10, color:"var(--ink-3)", fontWeight: 500}}>kg</span>
          </span>
        </div>
      </div>
    </Popover>
  );
}

function Stepper({ value, min = 0, max = 999, step = 1, unit, onChange }) {
  return (
    <div style={{display:"flex", alignItems:"center", gap: 8, justifyContent:"space-between"}}>
      <button className="btn btn-sm" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
        <i className="fa-solid fa-minus"/>
      </button>
      <div style={{flex:1, textAlign:"center"}}>
        <span className="mono" style={{fontSize: 22, fontWeight: 600}}>{value}</span>
        {unit ? <span style={{fontSize: 10, color:"var(--ink-3)", marginLeft: 4}}>{unit}</span> : null}
      </div>
      <button className="btn btn-sm" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
        <i className="fa-solid fa-plus"/>
      </button>
    </div>
  );
}

// === Fuel editor ===
function FuelPicker({ anchor, onClose, fuelL, fuelCapL, onChange, ac }) {
  return (
    <Popover anchor={anchor} onClose={onClose} width={280}>
      <PopoverHeader title={`Carburant au décollage — ${ac.reg}`} onClose={onClose} sub={`Capacité max : ${fuelCapL} L`}/>
      <div style={{padding: "12px 14px", display:"flex", flexDirection:"column", gap: 14}}>
        <Stepper value={fuelL} min={0} max={fuelCapL} step={5} unit="L"
          onChange={v => onChange(v)} />
        <input type="range" min={0} max={fuelCapL} step={5}
          value={fuelL} onChange={e => onChange(Number(e.target.value))} />
      </div>
    </Popover>
  );
}

window.Popover = Popover;
window.AerodromePicker = AerodromePicker;
window.CrewPicker = CrewPicker;
window.BagsPicker = BagsPicker;
window.FuelPicker = FuelPicker;
