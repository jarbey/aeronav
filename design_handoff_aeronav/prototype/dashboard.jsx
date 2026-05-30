// AeroNav — Dashboard view (carte + branches + équipages) — v2 with editing

const { useState, useMemo, useEffect, useRef } = React;

// === Brand ===
function Brand() {
  return (
    <div className="brand">
      <svg className="logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" stroke="#ffcf52" strokeWidth="1.5" fill="none" opacity="0.4"/>
        <circle cx="20" cy="20" r="13" stroke="#ffcf52" strokeWidth="0.8" fill="none" opacity="0.6"/>
        <path d="M20 5 L24 22 L20 28 L16 22 Z" fill="#ffcf52"/>
        <path d="M20 28 L20 36" stroke="#ffcf52" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="20" cy="20" r="2" fill="#0b2240" stroke="#ffcf52" strokeWidth="1"/>
      </svg>
      <div>
        <div className="name">AeroNav</div>
        <div className="sub">Voyage Planner</div>
      </div>
    </div>
  );
}

// === Top bar ===
function TopBar({ tab, onTab, voyage, variant, totals, finance, currentUser, onUserMenu }) {
  const club = window.aeroclubById(currentUser?.aeroclubId);
  return (
    <header className="topbar">
      <Brand />
      <nav className="tabs">
        <button className={tab === "voyages" ? "active" : ""} onClick={() => onTab("voyages")}>
          <i className="fa-solid fa-folder-open" /> Mes voyages <span className="num">{window.voyagesForUser(currentUser.id).length}</span>
        </button>
        <button className={tab === "voyage" ? "active" : ""} onClick={() => onTab("voyage")} disabled={!voyage}>
          <i className="fa-solid fa-route" /> Voyage
          {voyage ? <span className="num" style={{maxWidth: 120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{voyage.title.split("—")[1]?.trim() || voyage.title}</span> : null}
        </button>
        <button className={tab === "aircraft" ? "active" : ""} onClick={() => onTab("aircraft")}>
          <i className="fa-solid fa-plane" /> Avions <span className="num">{window.aircraftForUser(currentUser).length}</span>
        </button>
        <button className={tab === "aerodromes" ? "active" : ""} onClick={() => onTab("aerodromes")}>
          <i className="fa-solid fa-tower-control" /> Aérodromes <span className="num">{window.aerodromesForUser(currentUser).length}</span>
        </button>
      </nav>
      <div className="spacer" />
      <div className="meta">
        {voyage ? <>
          <span className="pill" title="Variante active">PLAN {variant.id}</span>
          <span className="pill">⏱ {window.fmtHr(totals.totalMin)}</span>
          <span className="pill" title="Coût total à payer">💶 {Math.round(finance.totals.total).toLocaleString('fr-FR')}€</span>
        </> : null}
        <button onClick={onUserMenu} title={`${currentUser.first} ${currentUser.last}`} style={{
          background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
          padding: "3px 10px 3px 4px",
          borderRadius: 99,
          color: "#f3ecd6",
          display:"inline-flex", alignItems:"center", gap: 8,
          cursor:"pointer", height: 30,
          fontFamily: "inherit",
        }}>
          <window.UserAvatar user={currentUser} size={22}/>
          <span style={{fontSize: 11, fontWeight: 600, lineHeight: 1.1, display:"flex", flexDirection:"column", alignItems:"flex-start"}}>
            <span>{currentUser.first}</span>
            <span style={{fontSize: 9, color: club?.color ? "#c4b88a" : "#c4b88a", fontWeight: 500}}>{club?.code}</span>
          </span>
          <i className="fa-solid fa-chevron-down" style={{fontSize: 9, color:"#c4b88a"}}/>
        </button>
      </div>
    </header>
  );
}

// === Sub-tab bar for the Voyage section ===
function VoyageSubTabs({ subTab, onSubTab, voyage, finance, computed }) {
  const participantCount = countVoyageParticipants(window.activeVariant(voyage));
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      padding: "0 16px",
      background: "var(--surface-2)",
      borderBottom: "1px solid var(--hairline)",
    }}>
      <SubTabBtn active={subTab === "map"} onClick={() => onSubTab("map")}
        icon="fa-map" label="Carte & branches" />
      <SubTabBtn active={subTab === "people"} onClick={() => onSubTab("people")}
        icon="fa-users" label="Personnes" badge={participantCount} />
      <SubTabBtn active={subTab === "finance"} onClick={() => onSubTab("finance")}
        icon="fa-coins" label="Finance" badge={`${Math.round(finance.totals.total)}€`} />
      <div style={{flex: 1}}/>
      <span style={{fontSize: 11, color: "var(--ink-3)", display:"flex", alignItems:"center", gap:6}}>
        <span className="mono">{voyage.title}</span>
      </span>
    </div>
  );
}

function countVoyageParticipants(variant) {
  const ids = new Set();
  variant.crewsByLeg.forEach(leg => {
    Object.values(leg).forEach(crew => {
      if (crew.cdb) ids.add(crew.cdb);
      crew.pax.forEach(pid => ids.add(pid));
    });
  });
  return ids.size;
}

function SubTabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent",
      border: 0,
      padding: "10px 16px",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: active ? "var(--ink)" : "var(--ink-3)",
      borderBottom: `2px solid ${active ? "var(--aero-red)" : "transparent"}`,
      position: "relative", top: 1,
      display: "inline-flex", alignItems: "center", gap: 6,
      cursor: "pointer",
      fontFamily: "inherit",
    }}>
      <i className={`fa-solid ${icon}`} style={{fontSize: 11}}/>
      {label}
      {badge !== undefined ? (
        <span style={{
          fontSize: 9.5, padding: "1px 6px",
          background: active ? "var(--ink)" : "var(--paper-2)",
          color: active ? "#fff8df" : "var(--ink-2)",
          borderRadius: 99,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: 0,
        }}>{badge}</span>
      ) : null}
    </button>
  );
}

window.VoyageSubTabs = VoyageSubTabs;
window.countVoyageParticipants = countVoyageParticipants;

// === Variant Tabs ===
function VariantTabsInline({ voyage, onSelect, onDuplicate, onDelete, onRename }) {
  const [editingId, setEditingId] = useState(null);
  return (
    <div style={{marginTop: 4}}>
      <div style={{display:"flex", alignItems:"center", marginBottom: 6}}>
        <div className="cap-sm">Variantes</div>
        <button className="btn btn-sm btn-ghost" style={{marginLeft:"auto", fontSize:10}}
          onClick={onDuplicate}><i className="fa-solid fa-plus"/> Nouvelle</button>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap: 4}}>
        {voyage.variants.map(v => {
          const isActive = v.id === voyage.activeVariantId;
          return (
            <div key={v.id} style={{
              display:"flex", alignItems:"center", gap: 6,
              padding: "5px 7px",
              border: `1px solid ${isActive ? "var(--ink)" : "var(--hairline-soft)"}`,
              background: isActive ? "var(--surface-card)" : "transparent",
              borderRadius: 4,
              cursor: "pointer",
            }} onClick={() => onSelect(v.id)}>
              <span style={{
                width: 20, height: 20, borderRadius: 3,
                background: isActive ? "var(--ink)" : "var(--paper-2)",
                color: isActive ? "#ffcf52" : "var(--ink-3)",
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                fontFamily:"var(--font-mono)", fontWeight: 700, fontSize: 10, flexShrink: 0,
              }}>{v.id}</span>
              <div style={{flex:1, minWidth: 0}}>
                {editingId === v.id ? (
                  <input className="input" autoFocus value={v.label}
                    onClick={e => e.stopPropagation()}
                    onChange={e => onRename(v.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={e => { if (e.key === "Enter") setEditingId(null); }}
                    style={{fontSize: 11, padding: "2px 4px"}} />
                ) : (
                  <div style={{fontSize: 11, fontWeight: isActive ? 600 : 500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {v.label}
                  </div>
                )}
              </div>
              {isActive ? (
                <>
                  <button className="btn btn-sm btn-ghost" style={{padding: "0 4px", minWidth: 0}} title="Renommer"
                    onClick={e => { e.stopPropagation(); setEditingId(v.id); }}>
                    <i className="fa-solid fa-pen" style={{fontSize: 8}}/>
                  </button>
                  {voyage.variants.length > 1 ? (
                    <button className="btn btn-sm btn-ghost" style={{padding: "0 4px", minWidth: 0}} title="Supprimer"
                      onClick={e => { e.stopPropagation(); if (confirm(`Supprimer "${v.label}" ?`)) onDelete(v.id); }}>
                      <i className="fa-solid fa-trash" style={{fontSize: 8, color:"var(--aero-red)"}}/>
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Legacy alias for files still using VariantTabs
function VariantTabs(props) { return <VariantTabsInline {...props}/>; }

// === Aerodrome inline pill (clickable for replacement) ===
function AeroPill({ icao, onClick, big }) {
  return (
    <button onClick={onClick} title="Cliquer pour remplacer cet aérodrome" style={{
      background: "transparent", border: 0, cursor: "pointer",
      padding: 0, color: "inherit", display: "inline-flex", alignItems:"center", gap: 3,
    }}>
      <span className="mono" style={{
        fontWeight: 700, fontSize: big ? 22 : 13,
        borderBottom: "1px dashed var(--ink-soft)",
      }}>{icao}</span>
    </button>
  );
}

// === Voyage panel (left): variants + summary + legs list ===
function VoyagePanel({ voyage, variant, computed, selectedLegIdx, onSelectLeg, density, onReplaceLeg, onVariantSelect, onVariantDuplicate, onVariantDelete, onVariantRename, onStopMinChange, onShare, onSettings, onRenameVoyage, currentUser }) {
  const isOwner = voyage.ownerId === currentUser.id;
  const sharedUsers = (voyage.sharedWith || []).map(id => window.userById(id)).filter(Boolean);
  const owner = window.userById(voyage.ownerId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(voyage.title);
  useEffect(() => { setTitleDraft(voyage.title); }, [voyage.title]);
  function commitTitle() {
    const next = titleDraft.trim();
    if (next && next !== voyage.title && onRenameVoyage) {
      onRenameVoyage(next);
    } else {
      setTitleDraft(voyage.title);
    }
    setEditingTitle(false);
  }
  return (
    <aside className="card" style={{
      width: density === "compact" ? 296 : (density === "detailed" ? 360 : 328),
      margin: 12, marginRight: 6,
      display: "flex", flexDirection: "column",
      maxHeight: "calc(100vh - var(--topbar-h) - 24px)",
      overflow: "hidden", flexShrink: 0,
    }}>
      {/* Voyage header */}
      <div style={{padding: "12px 14px 10px", borderBottom: "1px solid var(--hairline-soft)"}}>
        <div style={{display:"flex", alignItems:"center", gap: 6, marginBottom: 6}}>
          <div className="cap-sm">Voyage</div>
          <div style={{flex:1}}/>
          <span style={{fontSize: 10.5, color: "var(--ink-3)"}} className="mono">
            {new Date(voyage.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'2-digit'})}
          </span>
          {isOwner && onSettings ? (
            <button className="btn btn-sm btn-ghost" style={{padding:"2px 6px", minWidth:0}}
              onClick={onSettings} title="Paramètres du voyage">
              <i className="fa-solid fa-gear" style={{fontSize:11}}/>
            </button>
          ) : null}
        </div>
        {editingTitle ? (
          <input className="input" autoFocus value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(voyage.title); setEditingTitle(false); }
            }}
            style={{fontSize: 13, fontWeight: 600, padding: "4px 6px", marginBottom: 8}} />
        ) : (
          <div style={{
            fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginBottom: 8,
            display:"flex", alignItems:"center", gap: 6, cursor: isOwner ? "text" : "default",
          }} onClick={() => isOwner && setEditingTitle(true)} title={isOwner ? "Cliquer pour renommer" : ""}>
            <span>{voyage.title}</span>
            {isOwner ? <i className="fa-solid fa-pen" style={{fontSize: 9, color: "var(--ink-3)", opacity: 0.6}}/> : null}
          </div>
        )}

        {/* Owner + shared with strip */}
        <div style={{display:"flex", alignItems:"center", gap: 6, marginBottom: 10, padding: "6px 8px", background: "var(--surface-2)", borderRadius: 4}}>
          {owner ? <window.UserAvatar user={owner} size={20}/> : null}
          <div style={{fontSize: 10.5, color: "var(--ink-2)", flex: 1, minWidth: 0}}>
            <div style={{fontWeight: 600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{owner ? owner.first + " " + owner.last : "—"}</div>
            <div style={{fontSize: 9.5, color:"var(--ink-3)"}}>{isOwner ? "Propriétaire" : "Partagé avec vous"}</div>
          </div>
          {sharedUsers.length > 0 ? (
            <div style={{display:"flex"}}>
              {sharedUsers.slice(0, 4).map((u, i) => (
                <div key={u.id} style={{marginLeft: i > 0 ? -6 : 0, border:"2px solid var(--surface-2)", borderRadius: "50%"}}>
                  <window.UserAvatar user={u} size={20}/>
                </div>
              ))}
            </div>
          ) : null}
          {isOwner ? (
            <button className="btn btn-sm" style={{padding:"3px 6px"}} onClick={onShare} title="Partager">
              <i className="fa-solid fa-share-nodes"/>
            </button>
          ) : null}
        </div>

        <VariantTabsInline voyage={voyage}
          onSelect={onVariantSelect}
          onDuplicate={onVariantDuplicate}
          onDelete={onVariantDelete}
          onRename={onVariantRename} />

        <div style={{display:"grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10}}>
          <div>
            <div className="cap-sm">Vol</div>
            <div className="big-num" style={{fontSize:18}}>{window.fmtHr(computed.flightMin)}</div>
          </div>
          <div>
            <div className="cap-sm">Escales</div>
            <div className="big-num" style={{fontSize:18}}>{window.fmtHr(computed.stopMin)}</div>
          </div>
          <div style={{gridColumn: "1 / -1", paddingTop: 8, borderTop:"1px dashed var(--hairline-soft)", display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
            <div>
              <div className="cap-sm">Durée totale</div>
              <div className="big-num" style={{fontSize: 22, color: "var(--aero-red)"}}>
                {window.fmtHr(computed.totalMin)}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="cap-sm">Taxes</div>
              <div className="mono" style={{fontSize: 16, fontWeight: 600}}>
                {computed.taxTotalEUR}€
              </div>
              <div style={{fontSize: 9, color:"var(--ink-3)"}} className="mono">
                {computed.taxLandingTotal}€ atter. + {computed.taxParkingTotal}€ park.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legs list */}
      <div style={{padding: "10px 14px 6px", display:"flex", alignItems:"center"}}>
        <div className="section-title">Branches <span className="badge">{computed.legs.length}</span></div>
        <div style={{marginLeft:"auto", fontSize:10, color:"var(--ink-3)"}}>
          <i className="fa-solid fa-pen"/> Cliquer pour modifier
        </div>
      </div>
      <div className="scroll" style={{flex: 1, padding: "0 6px 12px"}}>
        {computed.legs.map((leg, i) => {
          const issues = Object.values(leg.perAc).filter(p => p.mtowExceeded || !p.fuelOK || !p.compatFuel || !p.compatRunway || !p.cdbOK || !p.paxOK);
          const totalDur = Math.max(...Object.values(leg.perAc).map(p => p.durMin));
          const isSel = selectedLegIdx === i;
          return (
            <div key={i}>
              <div
                onClick={() => onSelectLeg(i)}
                style={{
                  width: "100%", textAlign: "left", background: isSel ? "var(--paper)" : "transparent",
                  padding: "10px 10px", borderRadius: 4, display: "flex", flexDirection:"column", gap: 6,
                  borderLeft: `3px solid ${isSel ? "var(--aero-red)" : "transparent"}`,
                  cursor: "pointer",
                }}>
                <div style={{display:"flex", alignItems:"center", gap: 8}}>
                  <span style={{
                    width: 20, height: 20, borderRadius:"50%", background: "var(--ink)", color:"#fff8df",
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"var(--font-mono)", fontSize:10, fontWeight:700,
                  }}>{i+1}</span>
                  <span onClick={e => e.stopPropagation()}>
                    <AeroPill icao={leg.fromIcao} onClick={(e) => onReplaceLeg(i, "from", e.currentTarget.getBoundingClientRect())} />
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{fontSize:9, color:"var(--ink-3)"}}/>
                  <span onClick={e => e.stopPropagation()}>
                    <AeroPill icao={leg.toIcao} onClick={(e) => onReplaceLeg(i, "to", e.currentTarget.getBoundingClientRect())} />
                  </span>
                  <span style={{marginLeft:"auto"}} className="mono">{window.fmtHr(totalDur)}</span>
                </div>
                <div style={{display:"flex", alignItems:"center", gap: 10, fontSize: 11, color: "var(--ink-3)"}}>
                  <span className="mono">{leg.distance.toFixed(0)} NM</span>
                  <span className="mono">{leg.bearing.toFixed(0).padStart(3,"0")}°</span>
                  {issues.length > 0 ? (
                    <span className="chip danger" style={{marginLeft:"auto"}}>
                      <i className="fa-solid fa-triangle-exclamation"/> {issues.length} {issues.length>1?"alertes":"alerte"}
                    </span>
                  ) : (
                    <span className="chip ok" style={{marginLeft:"auto"}}>
                      <i className="fa-solid fa-check"/> OK
                    </span>
                  )}
                </div>
                {/* Mini-bars per aircraft */}
                <div style={{display:"flex", gap: 4, marginTop: 2}}>
                  {Object.keys(leg.perAc).map(acId => {
                    const ac = window.acById(acId); if (!ac) return null;
                    const p = leg.perAc[acId];
                    const m = window.AC_MODELS[ac.model];
                    const pctTow = Math.min(1, p.tow / m.mtowKg);
                    const cls = p.mtowExceeded ? "danger" : (pctTow > 0.92 ? "warn" : "");
                    return (
                      <div key={ac.id} style={{flex: 1}} title={`${ac.reg} — TOW ${p.tow.toFixed(0)} kg / ${m.mtowKg}`}>
                        <div style={{fontSize: 8.5, fontFamily:"var(--font-mono)", color: ac.color, fontWeight:600, marginBottom: 2}}>{ac.reg.slice(-3)}</div>
                        <div className="bar"><span className={cls} style={{width: `${pctTow*100}%`}}/></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Stop label */}
              {i < computed.legs.length - 1 && variant.stopMin[i+1] != null ? (
                <div style={{display:"flex", alignItems:"center", gap: 6, padding: "4px 12px 4px 24px", fontSize: 10.5, color: "var(--ink-3)"}}>
                  <i className="fa-solid fa-gas-pump" style={{color:"var(--aero-amber)"}}/>
                  Escale à <b className="mono" style={{color:"var(--ink-2)"}}>{variant.route[i+1]}</b>
                  <span style={{marginLeft:"auto", display:"flex", alignItems:"center", gap: 4}}>
                    <button className="btn btn-sm btn-ghost" style={{padding:"0 4px", minWidth:0}}
                      onClick={() => onStopMinChange(i+1, Math.max(0, variant.stopMin[i+1] - 15))}>
                      <i className="fa-solid fa-minus" style={{fontSize:9}}/>
                    </button>
                    <span className="mono" style={{minWidth: 36, textAlign:"center"}}>+{variant.stopMin[i+1]}min</span>
                    <button className="btn btn-sm btn-ghost" style={{padding:"0 4px", minWidth:0}}
                      onClick={() => onStopMinChange(i+1, variant.stopMin[i+1] + 15)}>
                      <i className="fa-solid fa-plus" style={{fontSize:9}}/>
                    </button>
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{padding: "8px 14px", borderTop: "1px solid var(--hairline-soft)", display:"flex", gap: 6}}>
        <button className="btn btn-sm" style={{flex:1}}>
          <i className="fa-solid fa-plus" /> Ajouter une escale
        </button>
        <button className="btn btn-sm btn-ghost" title="Inverser">
          <i className="fa-solid fa-shuffle" />
        </button>
      </div>
    </aside>
  );
}

// === Right panel : detail of selected leg ===
function LegDetail({ leg, legIdx, variant, density, onOpenVAC, onOpenAerodrome, onCrewEdit, onBagsEdit, onFuelEdit }) {
  const totalDurMin = Math.max(...Object.values(leg.perAc).map(p => p.durMin));
  return (
    <aside style={{
      width: density === "compact" ? 400 : (density === "detailed" ? 560 : 480),
      margin: 12, marginLeft: 6,
      display: "flex", flexDirection: "column", gap: 8,
      maxHeight: "calc(100vh - var(--topbar-h) - 24px)",
      flexShrink: 0,
    }}>
      {/* Leg header card */}
      <div className="card" style={{padding: "12px 14px"}}>
        <div style={{display:"flex", alignItems:"center", gap: 8, marginBottom: 8}}>
          <span style={{
            width: 22, height: 22, borderRadius:"50%", background:"var(--ink)", color:"#fff8df",
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--font-mono)", fontSize:10, fontWeight:700,
          }}>{legIdx+1}</span>
          <div className="cap-sm">Branche {legIdx+1} sur {variant.route.length - 1}</div>
          <div style={{marginLeft:"auto", display:"flex", gap:4}}>
            <button className="btn btn-sm" onClick={() => onOpenVAC(leg.from.icao)} title="VAC départ">
              <i className="fa-solid fa-map"/> {leg.from.icao}
            </button>
            <button className="btn btn-sm" onClick={() => onOpenVAC(leg.to.icao)} title="VAC arrivée">
              <i className="fa-solid fa-map"/> {leg.to.icao}
            </button>
          </div>
        </div>
        <div style={{display:"grid", gridTemplateColumns: "1fr auto 1fr", alignItems:"center", gap: 12}}>
          <div onClick={() => onOpenAerodrome(leg.fromIcao)} style={{cursor:"pointer"}}>
            <div className="mono" style={{fontSize: 22, fontWeight:700, color:"var(--ink)"}}>{leg.fromIcao}</div>
            <div style={{fontSize: 11, color: "var(--ink-3)"}}>{leg.from.name}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex", alignItems:"center", gap: 4}}>
              <i className="fa-solid fa-plane" style={{fontSize: 14, color:"var(--aero-red)"}} />
              <div style={{flex:1, height:1, background:"var(--ink)", minWidth: 30}}></div>
            </div>
            <div className="mono" style={{fontSize:10, color:"var(--ink-3)", marginTop: 4}}>
              {leg.distance.toFixed(0)} NM
            </div>
          </div>
          <div onClick={() => onOpenAerodrome(leg.toIcao)} style={{cursor:"pointer", textAlign:"right"}}>
            <div className="mono" style={{fontSize: 22, fontWeight:700, color:"var(--ink)"}}>{leg.toIcao}</div>
            <div style={{fontSize: 11, color: "var(--ink-3)"}}>{leg.to.name}</div>
          </div>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--hairline-soft)"}}>
          <div>
            <div className="cap-sm">Distance</div>
            <div className="mono" style={{fontSize:13, fontWeight:600}}>{leg.distance.toFixed(0)} <span style={{fontSize:9, color:"var(--ink-3)"}}>NM</span></div>
          </div>
          <div>
            <div className="cap-sm">Cap</div>
            <div className="mono" style={{fontSize:13, fontWeight:600}}>{leg.bearing.toFixed(0).padStart(3,"0")}<span style={{fontSize:9, color:"var(--ink-3)"}}>°</span></div>
          </div>
          <div>
            <div className="cap-sm">Altitude</div>
            <div className="mono" style={{fontSize:13, fontWeight:600}}>{variant.cruiseAltFt[legIdx]} <span style={{fontSize:9, color:"var(--ink-3)"}}>ft</span></div>
          </div>
          <div>
            <div className="cap-sm">Durée groupe</div>
            <div className="mono" style={{fontSize:13, fontWeight:600, color:"var(--aero-red)"}}>{window.fmtHr(totalDurMin)}</div>
          </div>
          <div>
            <div className="cap-sm">Taxe arr.</div>
            <div className="mono" style={{fontSize:13, fontWeight:600}}>{(leg.to.taxLandingEUR || 0) * Object.keys(leg.perAc).length}<span style={{fontSize:9, color:"var(--ink-3)"}}>€</span></div>
          </div>
        </div>
      </div>

      {/* Section title */}
      <div style={{display:"flex", alignItems:"center", gap: 8, padding: "0 2px"}}>
        <div className="section-title">Équipages · Calculs <span className="badge">{Object.keys(leg.perAc).length} avions</span></div>
        <div style={{marginLeft:"auto", fontSize: 10, color: "var(--ink-3)"}}>
          <i className="fa-solid fa-pen"/> Cliquer pour modifier
        </div>
      </div>

      {/* Aircraft cards */}
      <div className="scroll" style={{flex: 1, display:"flex", flexDirection:"column", gap: 8, paddingRight: 4, overflowY: "auto", minHeight: 0}}>
        {Object.keys(leg.perAc).map(acId => {
          const ac = window.acById(acId);
          if (!ac) return null;
          return (
            <AircraftLegCard key={ac.id} ac={ac} legIdx={legIdx} legResult={leg.perAc[ac.id]}
              onCrewEdit={onCrewEdit} onBagsEdit={onBagsEdit} onFuelEdit={onFuelEdit} />
          );
        })}
      </div>
    </aside>
  );
}

function AircraftLegCard({ ac, legIdx, legResult, onCrewEdit, onBagsEdit, onFuelEdit }) {
  const m = window.AC_MODELS[ac.model];
  const p = legResult;
  const cdb = p.crew.cdb ? window.personById(p.crew.cdb) : null;
  const towPct = Math.min(1, p.tow / m.mtowKg);
  const towCls = p.mtowExceeded ? "danger" : (towPct > 0.92 ? "warn" : "");
  const fuelL = p.fuelReserve + p.burnL;
  const fuelPct = Math.min(1, p.fuelLeftL / m.fuelCapL);
  const fuelCls = !p.fuelOK ? "danger" : (fuelPct < 0.35 ? "warn" : "");
  const paxSeats = m.seats - 1;
  return (
    <div className="card" style={{padding: 0, overflow:"hidden"}}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", gap: 8,
        padding: "8px 10px",
        borderBottom: "1px solid var(--hairline-soft)",
        background: "var(--surface-2)",
      }}>
        <span style={{width: 6, height: 24, background: ac.color, borderRadius: 1}}/>
        <div style={{flex:1, minWidth: 0}}>
          <div style={{display:"flex", alignItems:"baseline", gap:6}}>
            <span className="mono" style={{fontWeight: 700, fontSize: 13, color: "var(--ink)"}}>{ac.reg}</span>
            <span style={{fontSize: 10, color: "var(--ink-3)", textTransform:"uppercase", letterSpacing:"0.08em"}}>{ac.callsign}</span>
            <span style={{fontSize: 10.5, color: "var(--ink-2)", marginLeft: 4}}>· {m.label}</span>
          </div>
        </div>
        <div style={{display:"flex", gap: 3}}>
          {p.mtowExceeded ? <span className="chip danger" title="MTOW dépassé"><i className="fa-solid fa-triangle-exclamation"/></span> : null}
          {!p.fuelOK ? <span className="chip danger" title="Réserve insuffisante"><i className="fa-solid fa-gas-pump"/></span> : null}
          {!p.compatFuel ? <span className="chip warn" title="Carb. indispo à destination"><i className="fa-solid fa-fuel-pump"/></span> : null}
          {!p.compatRunway ? <span className="chip warn" title="Piste trop courte"><i className="fa-solid fa-road"/></span> : null}
          {!p.cdbOK ? <span className="chip danger" title="CDB non qualifié"><i className="fa-solid fa-user-shield"/></span> : null}
          {p.mtowExceeded || !p.fuelOK || !p.compatFuel || !p.compatRunway || !p.cdbOK || !p.paxOK ? null : (
            <span className="chip ok"><i className="fa-solid fa-check"/></span>
          )}
        </div>
      </div>

      {/* Crew row — ALWAYS prominent and editable */}
      <div style={{
        padding: "8px 10px", borderBottom: "1px dashed var(--hairline-soft)",
        display:"flex", flexWrap:"wrap", alignItems:"center", gap: 6,
      }} onClick={(e) => onCrewEdit(ac, legIdx, e.currentTarget.getBoundingClientRect())}>
        <span className="cap-sm" style={{marginRight: 2}}>Équipage</span>
        {cdb ? <PersonChip person={cdb} isCdb /> : <span className="chip danger">+ CDB manquant</span>}
        {p.crew.pax.map(pid => {
          const pp = window.personById(pid);
          return pp ? <PersonChip key={pid} person={pp} /> : null;
        })}
        {/* Empty seats */}
        {Array.from({length: Math.max(0, paxSeats - p.crew.pax.length)}).map((_, i) => (
          <span key={i} className="chip" style={{opacity: 0.6, borderStyle: "dashed"}}>
            <i className="fa-solid fa-plus" style={{fontSize:8, marginRight:2}}/> siège
          </span>
        ))}
        <span style={{marginLeft:"auto", fontSize: 10, color: "var(--ink-3)"}} className="mono">
          <i className="fa-solid fa-pen" style={{fontSize:8, marginRight:3}}/>
          {p.peopleMass.toFixed(0)} kg
        </span>
      </div>

      {/* Metrics row */}
      <div style={{padding: "8px 10px", display:"grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8}}>
        <Metric label="Durée" value={window.fmtHr(p.durMin)} />
        <Metric label="Brûlé" value={`${p.burnL.toFixed(0)}`} unit="L" />
        <Metric label="Restant" value={`${p.fuelLeftL.toFixed(0)}`} unit="L" cls={!p.fuelOK ? "danger" : ""} />
        <Metric label="TOW" value={`${p.tow.toFixed(0)}`} unit={`/${m.mtowKg}`} cls={p.mtowExceeded ? "danger" : ""} />
        <Metric label="LDW" value={`${p.ldw.toFixed(0)}`} unit="kg" />
      </div>

      {/* Bars row */}
      <div style={{padding: "0 10px 8px", display:"grid", gridTemplateColumns: "1fr 1fr", gap: 14}}>
        <div>
          <div style={{display:"flex", justifyContent:"space-between", fontSize:9.5, color:"var(--ink-3)", marginBottom: 3}}>
            <span className="cap-sm" style={{fontSize:9}}>Masse décollage</span>
            <span className="mono">{(towPct*100).toFixed(0)}%</span>
          </div>
          <div className="bar"><span className={towCls} style={{width: `${towPct*100}%`}}/></div>
        </div>
        <div>
          <div style={{display:"flex", justifyContent:"space-between", fontSize:9.5, color:"var(--ink-3)", marginBottom: 3}}>
            <span className="cap-sm" style={{fontSize:9}}>Carb. à l'arrivée</span>
            <span className="mono">{(fuelPct*100).toFixed(0)}%</span>
          </div>
          <div className="bar"><span className={fuelCls} style={{width: `${fuelPct*100}%`}}/></div>
        </div>
      </div>

      {/* Bags + fuel inline controls */}
      <div style={{
        padding: "8px 10px",
        background: "var(--paper)",
        borderTop: "1px dashed var(--hairline-soft)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={(e) => onBagsEdit(ac, legIdx, e.currentTarget.getBoundingClientRect())}
          style={{
            background:"transparent", border: 0, padding: 0, cursor:"pointer",
            display:"flex", alignItems:"center", gap: 6,
          }} title="Modifier les bagages">
          <i className="fa-solid fa-suitcase" style={{color:"var(--ink-3)", fontSize: 11}}/>
          <span className="mono" style={{fontSize: 11, fontWeight: 600}}>
            {p.bag.count}×{p.bag.unitKg}<span style={{color:"var(--ink-3)", fontWeight: 500}}>kg</span> = <b>{p.bagMass}</b><span style={{color:"var(--ink-3)", fontSize:9}}>kg</span>
          </span>
          <i className="fa-solid fa-pen" style={{fontSize:8, color:"var(--ink-3)"}}/>
        </button>
        <div className="divider-v" style={{height: 18, alignSelf:"center"}}/>
        <button onClick={(e) => onFuelEdit(ac, legIdx, e.currentTarget.getBoundingClientRect())}
          style={{
            background:"transparent", border: 0, padding: 0, cursor:"pointer",
            display:"flex", alignItems:"center", gap: 6,
          }} title="Modifier le carburant au décollage">
          <i className="fa-solid fa-gas-pump" style={{color: m.fuelType.includes("Jet") ? "var(--aero-blue)" : "var(--aero-green)", fontSize: 11}}/>
          <span className="mono" style={{fontSize: 11, fontWeight: 600}}>
            <b>{fuelL.toFixed(0)}</b><span style={{color:"var(--ink-3)", fontWeight: 500, fontSize:9}}>L au TO</span>
            <span style={{color:"var(--ink-3)", fontWeight:500}}> · {m.fuelType.split(" ")[0]}</span>
          </span>
          <i className="fa-solid fa-pen" style={{fontSize:8, color:"var(--ink-3)"}}/>
        </button>
        <span style={{marginLeft:"auto", fontSize: 10, color:"var(--ink-3)"}} className="mono">
          MV {m.massEmptyKg}kg + pax {p.peopleMass.toFixed(0)} + bag {p.bagMass} + carb {p.fuelKg.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, cls }) {
  return (
    <div>
      <div className="cap-sm" style={{fontSize: 9}}>{label}</div>
      <div className="mono" style={{fontSize:13, fontWeight:600, color: cls === "danger" ? "var(--aero-red)" : "var(--ink)"}}>
        {value}{unit ? <span style={{fontSize:9, color:"var(--ink-3)", marginLeft:2, fontWeight:500}}>{unit}</span> : null}
      </div>
    </div>
  );
}

function PersonChip({ person, isCdb }) {
  const initials = (person.first[0] + person.last[0]).toUpperCase();
  const colorIdx = (person.id.charCodeAt(1) % 6) + 1;
  return (
    <span className={`person ${isCdb ? "cdb" : ""}`} title={`${person.first} ${person.last} — ${person.weightKg} kg${isCdb ? " (CDB)" : ""}`}
      style={{cursor:"pointer"}}>
      <span className="av" style={{background: `var(--plane-${colorIdx})`}}>{initials}</span>
      <span style={{fontSize: 10.5}}>{isCdb ? <b>{person.last}</b> : person.last}</span>
      <span style={{color:"var(--ink-3)", fontSize:9.5}} className="mono">{person.weightKg}</span>
    </span>
  );
}

window.VoyagePanel = VoyagePanel;
window.LegDetail = LegDetail;
window.TopBar = TopBar;
