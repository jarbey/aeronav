// AeroNav — Voyage People (per-voyage participants + club roster CRUD)

const { useState: useStateVP } = React;

function VoyagePeoplePage({ voyage, variant, computed, finance, onAddPerson, onEditPerson }) {
  const [filter, setFilter] = useStateVP("all"); // all | invoyage | not
  const [q, setQ] = useStateVP("");

  // Map of voyage participation by personId
  const partMap = {};
  variant.crewsByLeg.forEach((leg, legIdx) => {
    const legResult = computed.legs[legIdx];
    Object.entries(leg).forEach(([acId, crew]) => {
      const ac = window.acById(acId);
      const durMin = legResult?.perAc[acId]?.durMin || 0;
      const route = legResult ? `${legResult.fromIcao}→${legResult.toIcao}` : "";
      if (crew.cdb) addEntry(partMap, crew.cdb, { acId, ac, legIdx, route, durMin, role: "CDB" });
      crew.pax.forEach(pid => addEntry(partMap, pid, { acId, ac, legIdx, route, durMin, role: "PAX" }));
    });
  });

  // Combine: every person in PEOPLE, augmented with their voyage participation
  const rows = window.PEOPLE
    .filter(p => !q || (p.first + " " + p.last + " " + p.license).toLowerCase().includes(q.toLowerCase()))
    .map(p => ({ person: p, part: partMap[p.id] || null }))
    .filter(r => {
      if (filter === "invoyage") return !!r.part;
      if (filter === "not") return !r.part;
      return true;
    });

  // Sort: voyage participants first (CDBs before PAX), then alphabetical
  rows.sort((a, b) => {
    const ap = a.part, bp = b.part;
    if (!!ap !== !!bp) return ap ? -1 : 1;
    if (ap && bp) {
      if ((ap.cdbCount > 0) !== (bp.cdbCount > 0)) return ap.cdbCount > 0 ? -1 : 1;
      return bp.totalHours - ap.totalHours;
    }
    return a.person.last.localeCompare(b.person.last);
  });

  const inVoyageCount = Object.keys(partMap).length;
  const cdbCount = Object.values(partMap).filter(r => r.cdbCount > 0).length;
  const club = window.aeroclubById(voyage.aeroclubId);

  return (
    <div style={{padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 12, overflow:"hidden", background:"var(--surface)"}}>
      <div style={{display:"flex", alignItems:"center", gap: 10, flexWrap:"wrap"}}>
        <h2 style={{margin: 0, fontSize: 18}}>Personnes</h2>
        <span className="chip">{window.PEOPLE.length} au total</span>
        <span className="chip info">{inVoyageCount} dans ce voyage</span>
        <span className="chip">{cdbCount} CDB</span>
        <div style={{flex:1}}/>
        <div className="seg">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tous</button>
          <button className={filter === "invoyage" ? "active" : ""} onClick={() => setFilter("invoyage")}>Dans le voyage</button>
          <button className={filter === "not" ? "active" : ""} onClick={() => setFilter("not")}>Non assignés</button>
        </div>
        <input className="input" style={{maxWidth: 220}} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-primary" onClick={onAddPerson}>
          <i className="fa-solid fa-plus"/> Ajouter une personne
        </button>
      </div>

      <div className="card" style={{padding: 0, overflow:"hidden", flex: 1, display:"flex", flexDirection:"column", minHeight: 0}}>
        <div className="scroll" style={{flex: 1, overflow:"auto"}}>
          <table className="table">
            <thead>
              <tr>
                <th style={{width: 38}}></th>
                <th>Nom</th>
                <th>Licence</th>
                <th>Avions autorisés</th>
                <th>Rôle voyage</th>
                <th>Présent sur</th>
                <th style={{textAlign:"right"}}>Heures</th>
                <th style={{textAlign:"right"}}>À payer</th>
                <th style={{width: 110}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({person: p, part}) => {
                const initials = (p.first[0] + p.last[0]).toUpperCase();
                const colorIdx = (p.id.charCodeAt(1) % 6) + 1;
                const billing = finance.byPerson[p.id];
                const inVoyage = !!part;
                const linkedUser = window.userForPerson(p.id);
                const eff = window.personEffective(p.id, variant);
                const overridden = eff._hasOverride;
                return (
                  <tr key={p.id} style={{opacity: inVoyage ? 1 : 0.65}}>
                    <td>
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: `var(--plane-${colorIdx})`, color:"#fff",
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        fontWeight: 700, fontSize: 10.5,
                      }}>{initials}</span>
                    </td>
                    <td>
                      <div style={{fontWeight: 600, display:"flex", alignItems:"center", gap: 6, flexWrap:"wrap"}}>
                        {p.first} {p.last}
                        {linkedUser ? (
                          <span className="chip info" style={{fontSize: 9}} title={`Compte utilisateur ${linkedUser.email}`}>
                            <i className="fa-solid fa-user-check" style={{marginRight: 2}}/> Utilisateur
                          </span>
                        ) : null}
                        <span style={{fontSize: 10, color: overridden ? "var(--aero-amber)" : "var(--ink-3)", fontFamily:"var(--font-mono)", fontWeight: 500}}>
                          {eff.weightKg}kg{overridden && eff._override.weightKg != null ? "⁺" : ""}
                        </span>
                      </div>
                      <div style={{fontSize: 10.5, color:"var(--ink-3)"}}>{linkedUser?.email || `ID ${p.id.toUpperCase()}`} · {p.rolePref}</div>
                    </td>
                    <td className="mono" style={{fontSize: 11}}>{p.license || "—"}</td>
                    <td>
                      <div style={{display:"flex", gap: 4, flexWrap: "wrap"}}>
                        {eff.authorizedModels.map(m => (
                          <span key={m} className="chip" title={window.AC_MODELS[m]?.label || m}
                            style={overridden && eff._override.authorizedModels ? {borderColor:"var(--aero-amber)", color:"var(--aero-amber)"} : null}>
                            {window.AC_MODELS[m]?.icon || m}
                          </span>
                        ))}
                        {eff.authorizedModels.length === 0 ? <span style={{color:"var(--ink-3)", fontSize: 10}}>—</span> : null}
                        {overridden && eff._override.authorizedModels ? <span className="chip warn" style={{fontSize:9}} title="Spécifique au voyage"><i className="fa-solid fa-route"/></span> : null}
                      </div>
                    </td>
                    <td>
                      {part ? (
                        <>
                          {part.cdbCount > 0 ? <span className="chip info">CDB ×{part.cdbCount}</span> : null}
                          {part.paxCount > 0 ? <span className="chip" style={{marginLeft: part.cdbCount > 0 ? 4 : 0}}>PAX ×{part.paxCount}</span> : null}
                        </>
                      ) : (
                        <span style={{fontSize: 10, color:"var(--ink-3)", fontStyle:"italic"}}>non assigné</span>
                      )}
                    </td>
                    <td>
                      {part ? (
                        <div style={{display:"flex", flexWrap:"wrap", gap: 3}}>
                          {part.legs.slice(0, 8).map((l, i) => (
                            <span key={i} className="chip" style={{
                              fontSize: 9.5, padding: "1px 6px",
                              background: l.ac?.color ? `${l.ac.color}22` : "var(--paper-2)",
                              borderColor: l.ac?.color ? `${l.ac.color}66` : "var(--hairline-soft)",
                              color: l.ac?.color || "var(--ink-2)",
                            }} title={`Branche ${l.legIdx+1} : ${l.route} sur ${l.ac?.reg}`}>
                              {l.role === "CDB" ? <b>{l.legIdx+1}</b> : (l.legIdx+1)}·{l.ac?.reg.slice(-3)}
                            </span>
                          ))}
                          {part.legs.length > 8 ? <span style={{fontSize:9.5, color:"var(--ink-3)"}}>+{part.legs.length-8}</span> : null}
                        </div>
                      ) : <span style={{color:"var(--ink-3)"}}>—</span>}
                    </td>
                    <td style={{textAlign:"right"}} className="mono">
                      {part ? (
                        <span>{part.totalHours.toFixed(1)}<span style={{color:"var(--ink-3)", fontSize:10, marginLeft:2}}>h</span></span>
                      ) : <span style={{color:"var(--ink-3)"}}>—</span>}
                    </td>
                    <td style={{textAlign:"right"}} className="mono">
                      {billing ? (
                        <span style={{fontWeight:600, color: "var(--aero-red)"}}>{Math.round(billing.total)}€</span>
                      ) : <span style={{color:"var(--ink-3)"}}>—</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => onEditPerson(p)} title="Modifier">
                        <i className="fa-solid fa-pen"/> Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{textAlign:"center", padding: 32, color:"var(--ink-3)"}}>
                    Aucune personne ne correspond à ce filtre
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{padding: "8px 12px", background: "var(--surface-2)", borderRadius: 4, fontSize: 11, color:"var(--ink-3)", display:"flex", alignItems:"flex-start", gap: 8}}>
        <i className="fa-solid fa-circle-info" style={{marginTop: 2}}/>
        <span>Les personnes <b>liées à un compte utilisateur</b> ont leurs prénom/nom/licence verrouillés (modifiables uniquement par l'utilisateur lui-même). Vous pouvez en revanche surcharger leur <b>poids</b> et leurs <b>avions autorisés</b> pour ce voyage uniquement (indiqué par une teinte ambre).</span>
      </div>
    </div>
  );
}

function addEntry(map, personId, leg) {
  const p = window.personById(personId);
  if (!p) return;
  if (!map[personId]) {
    map[personId] = { person: p, legs: [], cdbCount: 0, paxCount: 0, totalHours: 0 };
  }
  const e = map[personId];
  e.legs.push(leg);
  if (leg.role === "CDB") e.cdbCount++; else e.paxCount++;
  e.totalHours += leg.durMin / 60;
}

window.VoyagePeoplePage = VoyagePeoplePage;
