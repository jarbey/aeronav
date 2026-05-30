// AeroNav — Referentials (Personnes / Avions / Modèles / Aérodromes)

const { useState: useStateR, useMemo: useMemoR } = React;

function PeoplePage({ onEdit, onAdd }) {
  const [q, setQ] = useStateR("");
  const rows = window.PEOPLE.filter(p =>
    !q || (p.first + " " + p.last + " " + p.license).toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div style={{padding: 16, height: "100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", marginBottom: 12, gap: 10}}>
        <h2 style={{margin: 0, fontSize: 18}}>Personnes</h2>
        <span className="chip">{window.PEOPLE.length}</span>
        <div style={{flex: 1}}/>
        <input className="input" style={{maxWidth: 240}} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn"><i className="fa-solid fa-file-import"/> Importer CSV</button>
        <button className="btn btn-primary" onClick={onAdd}><i className="fa-solid fa-plus"/> Ajouter</button>
      </div>
      <div className="card" style={{overflow: "hidden", flex: 1, display:"flex", flexDirection:"column"}}>
        <div className="scroll" style={{flex: 1}}>
          <table className="table">
            <thead>
              <tr>
                <th style={{width: 36}}></th>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Licence</th>
                <th style={{textAlign:"right"}}>Poids</th>
                <th>Avions autorisés</th>
                <th style={{width: 80}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const initials = (p.first[0] + p.last[0]).toUpperCase();
                const colorIdx = (p.id.charCodeAt(1) % 6) + 1;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="av" style={{background: `var(--plane-${colorIdx})`, width: 26, height: 26, fontSize: 10, borderRadius: "50%", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight: 700}}>{initials}</span>
                    </td>
                    <td>
                      <div style={{fontWeight: 600}}>{p.first} {p.last}</div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)"}}>ID {p.id.toUpperCase()}</div>
                    </td>
                    <td>{p.rolePref === "CDB" ? <span className="chip info">CDB</span> : <span className="chip">PAX</span>}</td>
                    <td className="mono" style={{fontSize: 11}}>{p.license}</td>
                    <td style={{textAlign:"right"}} className="mono"><b>{p.weightKg}</b><span style={{color:"var(--ink-3)", fontSize:10}}> kg</span></td>
                    <td>
                      <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                        {p.authorizedModels.map(m => (
                          <span key={m} className="chip" title={window.AC_MODELS[m]?.label || m}>{window.AC_MODELS[m]?.icon || m}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => onEdit(p)}><i className="fa-solid fa-pen"/> Modifier</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AircraftPage({ onEditAircraft, onAddAircraft, onEditModel, onAddModel, currentUser }) {
  const [view, setView] = useStateR("fleet");
  const visibleAircraft = window.aircraftForUser(currentUser);
  const club = window.aeroclubById(currentUser?.aeroclubId);
  return (
    <div style={{padding: 16, height: "100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", marginBottom: 12, gap: 10}}>
        <h2 style={{margin: 0, fontSize: 18}}>Avions</h2>
        <span className="chip">{view === "fleet" ? `${visibleAircraft.length} appareils` : `${Object.keys(window.AC_MODELS).length} modèles`}</span>
        {club ? (
          <span className="chip info" title={club.name}>
            <i className="fa-solid fa-building" style={{marginRight: 3}}/> {club.code}
          </span>
        ) : null}
        <div style={{flex: 1}}/>
        <div className="seg">
          <button className={view === "fleet" ? "active" : ""} onClick={() => setView("fleet")}>Flotte</button>
          <button className={view === "models" ? "active" : ""} onClick={() => setView("models")}>Modèles</button>
        </div>
        <button className="btn btn-primary" onClick={view === "fleet" ? onAddAircraft : onAddModel}>
          <i className="fa-solid fa-plus"/> {view === "fleet" ? "Nouvel avion" : "Nouveau modèle"}
        </button>
      </div>
      {view === "fleet" ? <FleetGrid aircraft={visibleAircraft} onEdit={onEditAircraft}/> : <ModelsGrid onEdit={onEditModel}/>}
    </div>
  );
}

function FleetGrid({ aircraft, onEdit }) {
  return (
    <div className="scroll" style={{flex: 1, display:"grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14, alignContent:"start", paddingBottom: 16}}>
      {aircraft.map(ac => {
        const m = window.AC_MODELS[ac.model];
        const club = window.aeroclubById(ac.aeroclubId);
        if (!m) return null;
        return (
          <div key={ac.id} className="card" style={{overflow:"hidden"}}>
            <div style={{
              padding: "12px 14px",
              background: "linear-gradient(110deg, var(--surface-2), var(--paper))",
              borderBottom: "1px solid var(--hairline-soft)",
              display:"flex", alignItems:"center", gap: 10,
            }}>
              <span style={{width:8, height: 32, background: ac.color, borderRadius: 1}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex", alignItems:"center", gap: 6}}>
                  <div className="mono" style={{fontSize: 18, fontWeight: 700}}>{ac.reg}</div>
                  {club ? <span className="chip" style={{fontSize: 9, background: club.color, color:"#fff", border:0}}>{club.code}</span> : null}
                </div>
                <div style={{fontSize: 11, color:"var(--ink-3)", textTransform:"uppercase", letterSpacing:"0.08em"}}>{ac.callsign}</div>
              </div>
              <svg width="64" height="36" viewBox="0 0 80 40" style={{opacity:0.85}}>
                <g fill={ac.color}>
                  <path d="M40 4 L42 22 L58 26 L58 28 L42 28 L40 36 L38 36 L38 28 L22 28 L22 26 L38 22 Z"/>
                  <path d="M36 30 L44 30 L43 35 L37 35 Z"/>
                </g>
              </svg>
            </div>
            <div style={{padding: "10px 14px"}}>
              <div style={{fontSize: 12, fontWeight:600, marginBottom: 8}}>{m.label}</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 10}}>
                <Stat label="Croisière" value={m.cruiseKt} unit="kt"/>
                <Stat label="Conso." value={m.burnLh} unit="L/h"/>
                <Stat label="Sièges" value={m.seats} unit="pl."/>
                <Stat label="Carb." value={m.fuelCapL} unit="L"/>
                <Stat label="MTOW" value={m.mtowKg} unit="kg"/>
                <Stat label="MV" value={m.massEmptyKg} unit="kg"/>
              </div>
              <div style={{paddingTop: 10, marginTop: 10, borderTop: "1px dashed var(--hairline-soft)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                <div>
                  <div className="cap-sm">Tarif horaire</div>
                  <div className="mono" style={{fontSize: 18, fontWeight: 700, color: "var(--aero-red)"}}>
                    {m.hourlyEUR}<span style={{fontSize: 10, color:"var(--ink-3)", fontWeight: 500, marginLeft: 2}}>€/h</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="cap-sm">Coût par NM</div>
                  <div className="mono" style={{fontSize: 14, fontWeight: 600}}>
                    {(m.hourlyEUR / m.cruiseKt).toFixed(2)}<span style={{fontSize: 10, color:"var(--ink-3)", fontWeight: 500, marginLeft: 2}}>€/NM</span>
                  </div>
                </div>
              </div>
              <div style={{paddingTop: 10, marginTop: 10, borderTop: "1px dashed var(--hairline-soft)", display:"flex", alignItems:"center", gap: 6, fontSize: 11}}>
                <i className="fa-solid fa-gas-pump" style={{color: m.fuelType.includes("Jet") ? "var(--aero-blue)" : "var(--aero-green)"}}/>
                <span style={{fontWeight:600}}>{m.fuelType}</span>
                <span style={{color:"var(--ink-3)"}}>· Piste min. {m.minRunwayM}m</span>
                <button className="btn btn-sm" style={{marginLeft:"auto"}} onClick={() => onEdit(ac)}>
                  <i className="fa-solid fa-pen"/> Modifier
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelsGrid({ onEdit }) {
  return (
    <div className="scroll" style={{flex: 1, display:"grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, alignContent:"start", paddingBottom: 16}}>
      {Object.entries(window.AC_MODELS).map(([k, m]) => {
        const instances = window.AIRCRAFT.filter(a => a.model === k);
        return (
          <div key={k} className="card" style={{padding: "12px 14px"}}>
            <div style={{display:"flex", alignItems:"center", gap: 8, marginBottom: 8}}>
              <span className="chip" style={{fontFamily:"var(--font-mono)", fontWeight: 700, fontSize: 10}}>{m.icon}</span>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontSize: 13, fontWeight: 600}}>{m.label}</div>
                <div style={{fontSize: 10.5, color:"var(--ink-3)"}}>{m.type} · {instances.length} appareil{instances.length>1?"s":""}</div>
              </div>
              <button className="btn btn-sm" onClick={() => onEdit(k, m)}><i className="fa-solid fa-pen"/></button>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 8, fontSize: 11, marginBottom: 10}}>
              <Stat label="Croisière" value={m.cruiseKt} unit="kt"/>
              <Stat label="Conso." value={m.burnLh} unit="L/h"/>
              <Stat label="MTOW" value={m.mtowKg} unit="kg"/>
            </div>
            <div style={{display:"flex", alignItems:"center", gap: 6, fontSize: 11, paddingTop: 8, borderTop: "1px dashed var(--hairline-soft)"}}>
              <i className="fa-solid fa-gas-pump" style={{color: m.fuelType.includes("Jet") ? "var(--aero-blue)" : "var(--aero-green)"}}/>
              <span>{m.fuelType}</span>
              <span style={{marginLeft:"auto", fontWeight: 600, color: "var(--aero-red)"}} className="mono">{m.hourlyEUR}€/h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div className="cap-sm">{label}</div>
      <div className="mono" style={{fontSize: 14, fontWeight: 600}}>
        {value}<span style={{fontSize: 9.5, color:"var(--ink-3)", marginLeft: 2, fontWeight: 500}}>{unit}</span>
      </div>
    </div>
  );
}

function AerodromesPage({ onOpenVAC, onEdit, onAdd, currentUser }) {
  const [q, setQ] = useStateR("");
  const [filterNight, setFilterNight] = useStateR(false);
  const [filterJetA1, setFilterJetA1] = useStateR(false);
  const visible = window.aerodromesForUser(currentUser);
  const club = window.aeroclubById(currentUser?.aeroclubId);
  const rows = visible.filter(a => {
    if (q && !`${a.icao} ${a.name} ${a.city}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterNight && !a.night) return false;
    if (filterJetA1 && !a.fuel.includes("Jet-A1")) return false;
    return true;
  });
  return (
    <div style={{padding: 16, height: "100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", marginBottom: 12, gap: 10}}>
        <h2 style={{margin: 0, fontSize: 18}}>Aérodromes</h2>
        <span className="chip">{visible.length}</span>
        {club ? <span className="chip info"><i className="fa-solid fa-building" style={{marginRight: 3}}/> Bibliothèque {club.code}</span> : null}
        <div style={{flex: 1}}/>
        <input className="input" style={{maxWidth: 260}} placeholder="Code OACI, nom, ville…" value={q} onChange={e => setQ(e.target.value)} />
        <label style={{display:"flex", alignItems:"center", gap: 6, fontSize: 11}}>
          <div className={`toggle ${filterNight ? "on" : ""}`} onClick={() => setFilterNight(!filterNight)}/>
          <span>Nuit</span>
        </label>
        <label style={{display:"flex", alignItems:"center", gap: 6, fontSize: 11}}>
          <div className={`toggle ${filterJetA1 ? "on" : ""}`} onClick={() => setFilterJetA1(!filterJetA1)}/>
          <span>Jet-A1</span>
        </label>
        <button className="btn btn-primary" onClick={onAdd}><i className="fa-solid fa-plus"/> Nouvel aérodrome</button>
      </div>
      <div className="card" style={{overflow: "hidden", flex: 1, display:"flex", flexDirection:"column"}}>
        <div className="scroll" style={{flex: 1}}>
          <table className="table">
            <thead>
              <tr>
                <th>OACI</th>
                <th>Aérodrome</th>
                <th>Piste</th>
                <th>Surface</th>
                <th style={{textAlign:"right"}}>Alt.</th>
                <th>Carburant</th>
                <th>Nuit</th>
                <th>PPR</th>
                <th style={{textAlign:"right"}}>Taxes</th>
                <th>Position GPS</th>
                <th style={{width: 170}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(ad => (
                <tr key={ad.icao}>
                  <td className="mono" style={{fontWeight:700}}>{ad.icao}</td>
                  <td>
                    <div style={{fontWeight: 600}}>{ad.name}</div>
                    <div style={{fontSize: 10.5, color: "var(--ink-3)"}}>{ad.city} · {ad.atc}</div>
                  </td>
                  <td className="mono">{ad.runways[0].qfu} · {ad.runways[0].lengthM}m</td>
                  <td><span className="chip">{ad.runways[0].surface}</span></td>
                  <td className="mono" style={{textAlign:"right"}}>{ad.elevation}<span style={{color:"var(--ink-3)", fontSize:10}}> ft</span></td>
                  <td>
                    <div style={{display:"flex", gap: 4}}>
                      {ad.fuel.map(f => (
                        <span key={f} className={`chip ${f === "Jet-A1" ? "info" : "ok"}`}>{f}</span>
                      ))}
                    </div>
                  </td>
                  <td>{ad.night ? <span className="dot ok"/> : <span className="dot danger"/>}</td>
                  <td>{ad.ppr ? <span className="chip warn">PPR</span> : <span style={{color:"var(--ink-3)"}}>—</span>}</td>
                  <td style={{textAlign:"right"}} className="mono">
                    <div style={{fontSize:12, fontWeight:600}}>{(ad.taxLandingEUR || 0) + (ad.taxParkingEUR || 0)}<span style={{fontSize:9, color:"var(--ink-3)", fontWeight:500}}>€</span></div>
                    <div style={{fontSize:9, color:"var(--ink-3)"}}>{ad.taxLandingEUR || 0}+{ad.taxParkingEUR || 0}</div>
                  </td>
                  <td className="mono" style={{fontSize: 10.5, color:"var(--ink-3)"}}>
                    {ad.coord[1].toFixed(3)}°N <br/>
                    {Math.abs(ad.coord[0]).toFixed(3)}°{ad.coord[0]>=0?"E":"W"}
                  </td>
                  <td>
                    <div style={{display:"flex", gap: 4}}>
                      <button className="btn btn-sm" onClick={() => onOpenVAC(ad.icao)}>
                        <i className="fa-solid fa-map"/> VAC
                      </button>
                      <button className="btn btn-sm" onClick={() => onEdit(ad)}>
                        <i className="fa-solid fa-pen"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.PeoplePage = PeoplePage;
window.AircraftPage = AircraftPage;
window.AerodromesPage = AerodromesPage;
