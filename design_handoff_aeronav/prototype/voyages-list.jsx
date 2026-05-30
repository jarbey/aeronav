// AeroNav — Voyages list ("Mes voyages") + share dialog

const { useState: useStateV } = React;

function fmtDate(s) {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_META = {
  draft:     { label: "Brouillon", color: "var(--ink-3)", icon: "fa-pencil" },
  planning:  { label: "En préparation", color: "var(--aero-blue)", icon: "fa-clipboard-list" },
  ongoing:   { label: "En cours", color: "var(--aero-amber)", icon: "fa-plane-departure" },
  completed: { label: "Terminé", color: "var(--aero-green-2)", icon: "fa-check" },
};

function VoyagesListPage({ currentUser, activeVoyageId, onOpenVoyage, onShare, onNew }) {
  const [filter, setFilter] = useStateV("all"); // all | mine | shared
  const [q, setQ] = useStateV("");

  const allVoyages = window.voyagesForUser(currentUser.id);
  const rows = allVoyages.filter(v => {
    if (filter === "mine" && v.ownerId !== currentUser.id) return false;
    if (filter === "shared" && v.ownerId === currentUser.id) return false;
    if (q && !v.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // Sort: ongoing first, then planning, then completed, then draft. Within group, by date desc.
  const order = { ongoing: 0, planning: 1, completed: 2, draft: 3 };
  rows.sort((a, b) => (order[a.status] - order[b.status]) || (new Date(b.date) - new Date(a.date)));

  return (
    <div style={{padding: 16, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}>
      <div style={{display:"flex", alignItems:"center", marginBottom: 12, gap: 10}}>
        <h2 style={{margin: 0, fontSize: 18, whiteSpace:"nowrap"}}>Mes voyages</h2>
        <span className="chip">{allVoyages.length}</span>
        <div style={{flex: 1}}/>
        <div className="seg">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tous</button>
          <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>Mes voyages</button>
          <button className={filter === "shared" ? "active" : ""} onClick={() => setFilter("shared")}>Partagés avec moi</button>
        </div>
        <input className="input" style={{maxWidth: 220}} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)}/>
        <button className="btn btn-primary" onClick={onNew}><i className="fa-solid fa-plus"/> Nouveau voyage</button>
      </div>

      <div className="scroll" style={{flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14, alignContent: "start", paddingBottom: 16}}>
        {rows.map(v => (
          <VoyageCard key={v.id} voyage={v} currentUser={currentUser}
            isActive={v.id === activeVoyageId}
            onOpen={() => onOpenVoyage(v.id)}
            onShare={() => onShare(v)} />
        ))}
        {rows.length === 0 ? (
          <div style={{padding: 32, color: "var(--ink-3)", fontSize: 12, gridColumn: "1 / -1", textAlign: "center"}}>
            <i className="fa-solid fa-folder-open" style={{fontSize: 24, marginBottom: 8, opacity: 0.4}}/>
            <div>Aucun voyage à afficher</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VoyageCard({ voyage, currentUser, isActive, onOpen, onShare }) {
  const meta = STATUS_META[voyage.status] || STATUS_META.draft;
  const owner = window.userById(voyage.ownerId);
  const isOwner = voyage.ownerId === currentUser.id;
  const sharedUsers = (voyage.sharedWith || []).map(id => window.userById(id)).filter(Boolean);
  const variant = window.activeVariant(voyage);
  const computed = window.computeVoyage(variant);
  const finance = window.computeFinance(variant);
  const totalNM = computed.legs.reduce((s, l) => s + l.distance, 0);
  return (
    <div className="card" style={{
      overflow: "hidden",
      borderColor: isActive ? "var(--aero-red)" : "var(--hairline)",
      borderWidth: isActive ? 2 : 1,
      cursor: "pointer",
      display: "flex", flexDirection: "column",
    }} onClick={onOpen}>
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        background: "linear-gradient(110deg, var(--surface-2), var(--paper))",
        borderBottom: "1px solid var(--hairline-soft)",
      }}>
        <div style={{display:"flex", alignItems:"center", gap: 8}}>
          <span className="chip" style={{background: meta.color, color:"#fff", border: 0, fontSize: 10}}>
            <i className={`fa-solid ${meta.icon}`} style={{marginRight: 3}}/> {meta.label}
          </span>
          {isActive ? <span className="chip info" style={{fontSize: 10}}>actif</span> : null}
          <div style={{flex:1}}/>
          <span style={{fontSize: 11, color:"var(--ink-3)"}} className="mono">{fmtDate(voyage.date)}</span>
        </div>
        <div style={{fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.25}}>{voyage.title}</div>
        <div style={{display:"flex", alignItems:"center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--ink-3)"}}>
          {variant.route.map((icao, i) => (
            <span key={i} style={{display:"flex", alignItems:"center", gap: 4}}>
              <span className="mono" style={{fontWeight: 600, color: "var(--ink-2)"}}>{icao}</span>
              {i < variant.route.length - 1 ? <i className="fa-solid fa-arrow-right" style={{fontSize: 8}}/> : null}
            </span>
          ))}
        </div>
      </div>

      {/* Body — quick stats */}
      <div style={{padding: "10px 14px", display:"grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10}}>
        <Stat label="Branches" value={computed.legs.length}/>
        <Stat label="Distance" value={`${totalNM.toFixed(0)}`} unit="NM"/>
        <Stat label="Durée" value={window.fmtHr(computed.totalMin)}/>
        <Stat label="Coût" value={`${Math.round(finance.totals.total)}`} unit="€" highlight/>
      </div>

      {/* Footer — owner + shared */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px dashed var(--hairline-soft)",
        background: "var(--surface)",
        display: "flex", alignItems: "center", gap: 8, marginTop: "auto",
      }}>
        <div style={{display:"flex", alignItems:"center", gap: 8, flex: 1, minWidth: 0}}>
          {owner ? <UserAvatar user={owner} size={26}/> : null}
          <div style={{minWidth: 0}}>
            <div style={{fontSize: 11, fontWeight: 600}}>{owner ? `${owner.first} ${owner.last}` : "—"}</div>
            <div style={{fontSize: 9.5, color: "var(--ink-3)"}}>{isOwner ? "Propriétaire" : "Partagé avec vous"}</div>
          </div>
        </div>
        {sharedUsers.length > 0 ? (
          <div style={{display:"flex", alignItems:"center", gap: 0, marginRight: 6}} title={sharedUsers.map(u => `${u.first} ${u.last}`).join(", ")}>
            {sharedUsers.slice(0, 4).map((u, i) => (
              <div key={u.id} style={{marginLeft: i > 0 ? -8 : 0, border: "2px solid var(--surface)", borderRadius: "50%"}}>
                <UserAvatar user={u} size={22}/>
              </div>
            ))}
            {sharedUsers.length > 4 ? (
              <span style={{marginLeft: -8, fontSize: 9.5, fontWeight: 600, color:"var(--ink-3)", background: "var(--surface-2)", border:"2px solid var(--surface)", borderRadius: "50%", width: 22, height: 22, display:"inline-flex", alignItems:"center", justifyContent:"center"}}>+{sharedUsers.length - 4}</span>
            ) : null}
          </div>
        ) : null}
        {isOwner ? (
          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onShare(); }}>
            <i className="fa-solid fa-share-nodes"/> Partager
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, highlight }) {
  return (
    <div>
      <div className="cap-sm">{label}</div>
      <div className="mono" style={{fontSize: 15, fontWeight: 700, color: highlight ? "var(--aero-red)" : "var(--ink)"}}>
        {value}{unit ? <span style={{fontSize: 9.5, color:"var(--ink-3)", marginLeft: 2, fontWeight: 500}}>{unit}</span> : null}
      </div>
    </div>
  );
}

function UserAvatar({ user, size = 24, title }) {
  const colorIdx = (user.id.charCodeAt(1) % 6) + 1;
  return (
    <span title={title || `${user.first} ${user.last}`} style={{
      width: size, height: size, borderRadius: "50%",
      background: `var(--plane-${colorIdx})`, color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: Math.round(size * 0.42),
      flexShrink: 0,
    }}>{window.userInitials(user)}</span>
  );
}

// === Share dialog ===
function ShareDialog({ voyage, currentUser, onClose, onUpdate }) {
  // Editable copy of sharedWith
  const [shared, setShared] = useStateV(voyage.sharedWith || []);
  // Candidates: users in same aéroclub who aren't the owner
  const candidates = window.USERS.filter(u =>
    u.aeroclubId === voyage.aeroclubId && u.id !== voyage.ownerId
  );

  function toggle(uid) {
    setShared(s => s.includes(uid) ? s.filter(x => x !== uid) : [...s, uid]);
  }
  function save() {
    onUpdate(voyage.id, shared);
    onClose();
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(11,34,64,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} className="modal" style={{width: 520, maxHeight: "80vh"}}>
        <div className="modal-head">
          <h2><i className="fa-solid fa-share-nodes" style={{marginRight: 6}}/> Partager le voyage</h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{padding: "16px 18px"}}>
          <div style={{marginBottom: 12}}>
            <div style={{fontSize: 13, fontWeight: 600}}>{voyage.title}</div>
            <div style={{fontSize: 11, color: "var(--ink-3)"}}>Propriétaire : <b>{currentUser.first} {currentUser.last}</b></div>
          </div>

          <div className="cap-sm" style={{marginBottom: 8}}>
            Membres de l'aéroclub <b>{window.aeroclubById(voyage.aeroclubId)?.code}</b> <span style={{fontWeight: 400, opacity: 0.7, marginLeft: 4}}>({candidates.length} disponibles)</span>
          </div>

          <div className="scroll" style={{maxHeight: 360, overflow: "auto", border: "1px solid var(--hairline-soft)", borderRadius: 4}}>
            {candidates.map(u => {
              const isShared = shared.includes(u.id);
              return (
                <div key={u.id} onClick={() => toggle(u.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--hairline-soft)",
                  background: isShared ? "var(--paper-2)" : "transparent",
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 3,
                    border: `1.5px solid ${isShared ? "var(--aero-green-2)" : "var(--hairline)"}`,
                    background: isShared ? "var(--aero-green)" : "transparent",
                    color: "#fff",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10,
                  }}>{isShared ? "✓" : ""}</span>
                  <UserAvatar user={u} size={28}/>
                  <div style={{flex:1, minWidth: 0}}>
                    <div style={{fontSize: 12, fontWeight: 600}}>{u.first} {u.last}</div>
                    <div style={{fontSize: 10, color: "var(--ink-3)"}}>{u.email} · {u.role}</div>
                  </div>
                  <span className="chip" style={{fontSize: 9}}>{u.provider}</span>
                </div>
              );
            })}
          </div>

          <div style={{marginTop: 16, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 4, fontSize: 11, color: "var(--ink-3)", display:"flex", gap: 8, alignItems:"flex-start"}}>
            <i className="fa-solid fa-circle-info" style={{marginTop: 2}}/>
            <span>Les personnes invitées pourront consulter le voyage, modifier l'équipage qui les concerne, et voir le décompte des frais. Seul le propriétaire peut modifier la route et supprimer le voyage.</span>
          </div>
        </div>
        <div style={{padding: "10px 18px", borderTop: "1px solid var(--hairline)", background: "var(--surface-2)", display:"flex", alignItems:"center", gap: 8}}>
          <div style={{flex:1, fontSize: 11, color: "var(--ink-3)"}}>
            {shared.length} personne{shared.length > 1 ? "s" : ""} invitée{shared.length > 1 ? "s" : ""}
          </div>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save}>
            <i className="fa-solid fa-check"/> Enregistrer le partage
          </button>
        </div>
      </div>
    </div>
  );
}

window.VoyagesListPage = VoyagesListPage;
window.ShareDialog = ShareDialog;
window.UserAvatar = UserAvatar;

// === User Menu (top-right dropdown) ===
function UserMenu({ currentUser, onClose, onLogout, onSwitchUser }) {
  const club = window.aeroclubById(currentUser.aeroclubId);
  const others = window.USERS.filter(u => u.id !== currentUser.id);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 80, background: "transparent",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "absolute", top: 60, right: 14,
        width: 340,
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: 8,
        boxShadow: "0 16px 48px -8px rgba(11,34,64,0.4)",
        overflow: "hidden",
      }}>
        {/* Header card */}
        <div style={{
          padding: "14px 16px",
          background: "linear-gradient(135deg, #1a3556, #0b2240)",
          color: "#f3ecd6",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <UserAvatar user={currentUser} size={42}/>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 14, fontWeight: 600}}>{currentUser.first} {currentUser.last}</div>
            <div style={{fontSize: 10.5, color: "#c4b88a"}}>{currentUser.email}</div>
            <div style={{display: "flex", alignItems: "center", gap: 4, marginTop: 4}}>
              <i className="fa-brands fa-google" style={{fontSize: 10, color: "#ffcf52"}}/>
              <span style={{fontSize: 9.5, color:"#c4b88a", letterSpacing:"0.04em", textTransform:"uppercase"}}>connecté via {currentUser.provider}</span>
            </div>
          </div>
        </div>

        {/* Club card */}
        {club ? (
          <div style={{padding: "10px 16px", borderBottom: "1px solid var(--hairline-soft)", display:"flex", alignItems:"center", gap: 10}}>
            <span style={{
              width: 32, height: 32, borderRadius: 4,
              background: club.color, color:"#fff",
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              fontWeight: 700, fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}>{club.code}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize: 12, fontWeight: 600}}>{club.name}</div>
              <div style={{fontSize: 10.5, color:"var(--ink-3)"}}>
                <span className="mono">{club.base}</span> · {currentUser.role}
              </div>
            </div>
          </div>
        ) : null}

        {/* Logout */}
        <div style={{padding: "10px 12px", borderTop: "1px solid var(--hairline-soft)", background: "var(--surface-2)"}}>
          <button onClick={onLogout} className="btn" style={{width: "100%", justifyContent:"center", color:"var(--aero-red)"}}>
            <i className="fa-solid fa-arrow-right-from-bracket"/> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

window.UserMenu = UserMenu;

// === New Voyage Dialog ===
function NewVoyageDialog({ currentUser, onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10);
  const visibleAerodromes = window.aerodromesForUser(currentUser);
  const visibleAircraft = window.aircraftForUser(currentUser);
  const homeBase = window.aeroclubById(currentUser.aeroclubId)?.base;
  const defaultFrom = visibleAerodromes.find(a => a.icao === homeBase)?.icao || visibleAerodromes[0]?.icao || "";

  const [title, setTitle] = useStateV("");
  const [date, setDate] = useStateV(today);
  const [fromIcao, setFromIcao] = useStateV(defaultFrom);
  const [toIcao, setToIcao] = useStateV("");
  const [acSel, setAcSel] = useStateV(() => visibleAircraft.slice(0, 2).map(a => a.id));
  const [sharedWith, setSharedWith] = useStateV([]);

  const fromAd = window.adByIcao(fromIcao);
  const toAd = window.adByIcao(toIcao);
  const distance = (fromAd && toAd) ? window.distNM(fromAd.coord, toAd.coord) : 0;

  const candidates = window.USERS.filter(u =>
    u.aeroclubId === currentUser.aeroclubId && u.id !== currentUser.id
  );

  function toggleAircraft(id) {
    setAcSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }
  function toggleShared(uid) {
    setSharedWith(s => s.includes(uid) ? s.filter(x => x !== uid) : [...s, uid]);
  }

  const canSubmit = title.trim() && fromIcao && toIcao && fromIcao !== toIcao && acSel.length > 0;

  function submit() {
    if (!canSubmit) return;
    const id = "vy-" + Date.now().toString(36);
    const crewsByLeg = [acSel.reduce((acc, aid) => { acc[aid] = { cdb: null, pax: [] }; return acc; }, {})];
    const fuelLoadL = [acSel.reduce((acc, aid) => {
      const ac = window.acById(aid);
      const m = ac && window.AC_MODELS[ac.model];
      acc[aid] = m ? Math.floor(m.fuelCapL * 0.85) : 80;
      return acc;
    }, {})];
    const bagsByLeg = [acSel.reduce((acc, aid) => { acc[aid] = { count: 0, unitKg: 12 }; return acc; }, {})];
    const newV = {
      id, title: title.trim(), date,
      aeroclubId: currentUser.aeroclubId,
      ownerId: currentUser.id,
      sharedWith,
      status: "draft",
      activeVariantId: "A",
      variants: [{
        id: "A",
        label: "Plan A — Initial",
        weather: "À planifier",
        tag: "draft",
        route: [fromIcao, toIcao],
        stopMin: [null, null],
        cruiseAltFt: [3500],
        crewsByLeg,
        fuelLoadL,
        bagsByLeg,
      }],
    };
    onCreate(newV);
    onClose();
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(11,34,64,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} className="modal" style={{width: 720, maxHeight: "90vh"}}>
        <div className="modal-head">
          <h2><i className="fa-solid fa-plus" style={{marginRight: 6}}/> Nouveau voyage</h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{padding: "18px 20px", display:"flex", flexDirection:"column", gap: 16}}>

          {/* Identité */}
          <div>
            <div style={{fontSize: 11, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-3)", fontWeight: 600, marginBottom: 8}}>Identité du voyage</div>
            <div style={{display:"grid", gridTemplateColumns: "1fr 180px", gap: 12}}>
              <div className="field">
                <label>Titre</label>
                <input className="input" autoFocus value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex. Sortie côtière en Bretagne" />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Itinéraire */}
          <div>
            <div style={{fontSize: 11, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-3)", fontWeight: 600, marginBottom: 8}}>Itinéraire (initial)</div>
            <div style={{display:"grid", gridTemplateColumns: "1fr 56px 1fr", alignItems:"end", gap: 12}}>
              <div className="field">
                <label>Aérodrome de départ</label>
                <AerodromeSelect value={fromIcao} onChange={setFromIcao}
                  exclude={toIcao} options={visibleAerodromes} />
              </div>
              <div style={{paddingBottom: 8, textAlign:"center", color:"var(--ink-3)"}}>
                <i className="fa-solid fa-arrow-right" style={{fontSize: 18}}/>
              </div>
              <div className="field">
                <label>Aérodrome d'arrivée</label>
                <AerodromeSelect value={toIcao} onChange={setToIcao}
                  exclude={fromIcao} options={visibleAerodromes} placeholder="— sélectionner —" />
              </div>
            </div>
            <div style={{marginTop: 8, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 4, fontSize: 11, color:"var(--ink-2)", display:"flex", justifyContent:"space-between"}}>
              <span><i className="fa-solid fa-circle-info" style={{marginRight: 4, color:"var(--ink-3)"}}/> Vous pourrez ajouter des escales intermédiaires une fois le voyage créé.</span>
              {distance > 0 ? <b className="mono">{distance.toFixed(0)} NM</b> : null}
            </div>
          </div>

          {/* Avions */}
          <div>
            <div style={{fontSize: 11, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-3)", fontWeight: 600, marginBottom: 8, display:"flex", alignItems:"center", gap: 6}}>
              Avions à embarquer <span style={{fontWeight:400, opacity:0.7}}>({acSel.length}/{visibleAircraft.length})</span>
            </div>
            <div style={{display:"grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6}}>
              {visibleAircraft.map(ac => {
                const m = window.AC_MODELS[ac.model];
                const sel = acSel.includes(ac.id);
                return (
                  <div key={ac.id} onClick={() => toggleAircraft(ac.id)} style={{
                    display:"flex", alignItems:"center", gap: 10,
                    padding: "8px 10px",
                    border: `1px solid ${sel ? "var(--ink)" : "var(--hairline-soft)"}`,
                    borderRadius: 4,
                    background: sel ? "var(--paper)" : "transparent",
                    cursor: "pointer",
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 3,
                      border: `1.5px solid ${sel ? "var(--aero-green-2)" : "var(--hairline)"}`,
                      background: sel ? "var(--aero-green)" : "transparent",
                      color: "#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize: 10,
                    }}>{sel ? "✓" : ""}</span>
                    <span style={{width:6, height: 22, background: ac.color, borderRadius: 1}}/>
                    <div style={{flex:1, minWidth: 0}}>
                      <div className="mono" style={{fontSize: 12, fontWeight: 600}}>{ac.reg} <span style={{fontWeight:500, color:"var(--ink-3)", fontSize:10}}>· {ac.callsign}</span></div>
                      <div style={{fontSize: 10, color:"var(--ink-3)"}}>{m?.label} — {m?.seats} pl. · {m?.hourlyEUR}€/h</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sharing */}
          {candidates.length > 0 ? (
            <div>
              <div style={{fontSize: 11, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-3)", fontWeight: 600, marginBottom: 8}}>
                Partager dès la création <span style={{fontWeight:400, opacity:0.7, marginLeft: 4}}>(optionnel · {sharedWith.length} invité{sharedWith.length>1?"s":""})</span>
              </div>
              <div style={{display:"flex", gap: 6, flexWrap:"wrap"}}>
                {candidates.map(u => {
                  const sel = sharedWith.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleShared(u.id)} style={{
                      padding: "4px 10px 4px 4px",
                      borderRadius: 999,
                      border: `1px solid ${sel ? "var(--ink)" : "var(--hairline)"}`,
                      background: sel ? "var(--paper-2)" : "var(--surface-card)",
                      display:"inline-flex", alignItems:"center", gap: 6,
                      cursor: "pointer",
                    }}>
                      <UserAvatar user={u} size={20}/>
                      <span style={{fontSize: 11, fontWeight: sel ? 600 : 500}}>{u.first} {u.last}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

        </div>
        <div style={{padding: "10px 18px", borderTop: "1px solid var(--hairline)", background: "var(--surface-2)", display:"flex", alignItems:"center", gap: 8}}>
          <div style={{flex:1, fontSize: 10.5, color: "var(--ink-3)"}}>
            <i className="fa-solid fa-circle-info" style={{marginRight:3}}/> Le voyage sera créé en brouillon, vous pourrez tout ajuster ensuite.
          </div>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}
            style={!canSubmit ? {opacity: 0.5, cursor:"not-allowed"} : null}>
            <i className="fa-solid fa-plus"/> Créer le voyage
          </button>
        </div>
      </div>
    </div>
  );
}

function AerodromeSelect({ value, onChange, options, exclude, placeholder }) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}
      style={{fontFamily: "var(--font-mono)", fontWeight: value ? 600 : 400}}>
      <option value="">{placeholder || "—"}</option>
      {options.filter(a => a.icao !== exclude).map(a => (
        <option key={a.icao} value={a.icao}>
          {a.icao} — {a.name}{a.city ? ` (${a.city})` : ""}
        </option>
      ))}
    </select>
  );
}

window.NewVoyageDialog = NewVoyageDialog;

// === Voyage Settings Dialog (rename + date + status + delete) ===
function VoyageSettingsDialog({ voyage, currentUser, onClose, onSave, onDelete }) {
  const [title, setTitle] = useStateV(voyage.title);
  const [date, setDate] = useStateV(voyage.date);
  const [status, setStatus] = useStateV(voyage.status);
  const isOwner = voyage.ownerId === currentUser.id;
  function save() {
    onSave(voyage.id, { title: title.trim() || voyage.title, date, status });
    onClose();
  }
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(11,34,64,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} className="modal" style={{width: 520}}>
        <div className="modal-head">
          <h2><i className="fa-solid fa-gear" style={{marginRight: 6}}/> Paramètres du voyage</h2>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{padding: "18px 20px", display:"flex", flexDirection:"column", gap: 14}}>
          <div className="field">
            <label>Titre</label>
            <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{display:"grid", gridTemplateColumns:"180px 1fr", gap: 12}}>
            <div className="field">
              <label>Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Brouillon</option>
                <option value="planning">En préparation</option>
                <option value="ongoing">En cours</option>
                <option value="completed">Terminé</option>
              </select>
            </div>
          </div>
          {!isOwner ? (
            <div style={{padding: "8px 12px", background:"#fff7df", border:"1px solid #e6cf83", borderRadius: 4, fontSize: 11, color:"var(--ink-2)"}}>
              <i className="fa-solid fa-triangle-exclamation" style={{marginRight: 4, color:"var(--aero-amber)"}}/>
              Vous n'êtes pas propriétaire — seules vos suggestions peuvent être appliquées par le propriétaire.
            </div>
          ) : null}
        </div>
        <div style={{padding: "10px 18px", borderTop: "1px solid var(--hairline)", background: "var(--surface-2)", display:"flex", alignItems:"center", gap: 8}}>
          {isOwner ? (
            <button className="btn" style={{color: "var(--aero-red)"}}
              onClick={() => { if (confirm(`Supprimer le voyage "${voyage.title}" ? Cette action est définitive.`)) { onDelete(voyage.id); onClose(); } }}>
              <i className="fa-solid fa-trash"/> Supprimer le voyage
            </button>
          ) : null}
          <div style={{flex:1}}/>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save}>
            <i className="fa-solid fa-check"/> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

window.VoyageSettingsDialog = VoyageSettingsDialog;
