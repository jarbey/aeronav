// AeroNav — Main app (auth + multi-voyage)

const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "panelPosition": "right",
  "density": "normal",
  "mapStyle": "paper",
  "rangeRings": false,
  "autonomyNM": 350,
  "hideOffRoute": false
}/*EDITMODE-END*/;

const LS_USER = "aeronav.user";
const LS_VOYAGE = "aeronav.activeVoyageId";

function App() {
  // ─── Auth ───
  const [currentUser, setCurrentUser] = useStateA(() => {
    try {
      const id = localStorage.getItem(LS_USER);
      return id ? window.userById(id) : null;
    } catch (e) { return null; }
  });

  function handleLogin(user, provider) {
    try { localStorage.setItem(LS_USER, user.id); } catch (e) {}
    setCurrentUser(user);
  }
  function handleLogout() {
    try { localStorage.removeItem(LS_USER); } catch (e) {}
    setCurrentUser(null);
  }

  if (!currentUser) return <window.LoginPage onLogin={handleLogin} />;
  return <AppShell currentUser={currentUser} onLogout={handleLogout} />;
}

function AppShell({ currentUser, onLogout }) {
  // Voyages user can see
  const visibleVoyages = window.voyagesForUser(currentUser.id);

  // Active voyage id
  const [activeVoyageId, setActiveVoyageIdRaw] = useStateA(() => {
    try {
      const id = localStorage.getItem(LS_VOYAGE);
      if (id && visibleVoyages.some(v => v.id === id)) return id;
    } catch (e) {}
    return visibleVoyages[0]?.id || null;
  });
  const setActiveVoyageId = (id) => {
    setActiveVoyageIdRaw(id);
    try { localStorage.setItem(LS_VOYAGE, id); } catch (e) {}
  };

  const [tab, setTab] = useStateA("voyages");
  const [voyageSubTab, setVoyageSubTab] = useStateA("map");
  const [voyagesVersion, setVoyagesVersion] = useStateA(0);
  const bumpVoyages = () => setVoyagesVersion(v => v + 1);
  const voyage = useMemoA(
    () => window.VOYAGES.find(v => v.id === activeVoyageId) || visibleVoyages[0],
    [activeVoyageId, voyagesVersion]
  );

  // Update active voyage in-place + bump
  function updateActiveVoyage(updater) {
    const idx = window.VOYAGES.findIndex(v => v.id === activeVoyageId);
    if (idx < 0) return;
    window.VOYAGES[idx] = updater(window.VOYAGES[idx]);
    bumpVoyages();
  }
  // Update any voyage in-place
  function updateVoyage(id, updater) {
    const idx = window.VOYAGES.findIndex(v => v.id === id);
    if (idx < 0) return;
    window.VOYAGES[idx] = updater(window.VOYAGES[idx]);
    bumpVoyages();
  }

  const variant = useMemoA(() => voyage ? window.activeVariant(voyage) : null, [voyage]);

  const [selectedLegIdx, setSelectedLegIdx] = useStateA(2);
  const [vacIcao, setVacIcao] = useStateA(null);
  const [hoveredLeg, setHoveredLeg] = useStateA(null);
  const [editor, setEditor] = useStateA(null);
  const [formEditor, setFormEditor] = useStateA(null);
  const [shareDialogId, setShareDialogId] = useStateA(null);
  const [settingsDialogId, setSettingsDialogId] = useStateA(null);
  const [newVoyageOpen, setNewVoyageOpen] = useStateA(false);
  const [userMenuOpen, setUserMenuOpen] = useStateA(false);
  const [refsVersion, setRefsVersion] = useStateA(0);
  const bumpRefs = () => setRefsVersion(v => v + 1);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Reset leg when voyage changes
  useEffectA(() => { setSelectedLegIdx(0); }, [activeVoyageId]);

  // Clamp selected leg if route shrinks
  useEffectA(() => {
    if (!variant) return;
    const maxIdx = variant.route.length - 2;
    if (selectedLegIdx > maxIdx) setSelectedLegIdx(Math.max(0, maxIdx));
  }, [variant && variant.route.length]);

  const computed = useMemoA(() => variant ? window.computeVoyage(variant) : { legs: [], flightMin: 0, stopMin: 0, totalMin: 0, taxLandingTotal: 0, taxParkingTotal: 0, taxTotalEUR: 0 }, [variant]);
  const finance = useMemoA(() => variant ? window.computeFinance(variant) : { totals: { total: 0 }, byPerson: {}, byAircraft: {}, items: [] }, [variant]);
  const selectedLeg = computed.legs[Math.min(selectedLegIdx, computed.legs.length - 1)];

  // ─── Referentials CRUD ───
  function savePerson(p) {
    if (!p.id) p = { ...p, id: "p" + (Math.max(0, ...window.PEOPLE.map(x => Number(x.id.slice(1)) || 0)) + 1) };
    const i = window.PEOPLE.findIndex(x => x.id === p.id);
    if (i >= 0) window.PEOPLE[i] = p; else window.PEOPLE.push(p);
    bumpRefs();
  }
  function deletePerson(id) {
    const i = window.PEOPLE.findIndex(x => x.id === id);
    if (i >= 0) window.PEOPLE.splice(i, 1);
    bumpRefs();
  }
  // Save handler for the voyage person form (handles both linked-user overrides and standalone people)
  function saveVoyagePerson(result) {
    if (result.kind === "linked") {
      // Update variant.personOverrides[personId]
      updateActiveVariant(v => {
        const next = { ...(v.personOverrides || {}) };
        if (Object.keys(result.override).length === 0) {
          delete next[result.personId];
        } else {
          next[result.personId] = result.override;
        }
        return { ...v, personOverrides: next };
      });
    } else if (result.kind === "standalone") {
      savePerson(result.person);
    }
  }
  // Delete person from voyage = clear their override AND remove from crews; do NOT delete from PEOPLE
  function removeFromVoyage(personId) {
    updateActiveVariant(v => {
      const next = { ...(v.personOverrides || {}) };
      delete next[personId];
      const crewsByLeg = v.crewsByLeg.map(leg => {
        const copy = {};
        Object.entries(leg).forEach(([acId, crew]) => {
          copy[acId] = {
            cdb: crew.cdb === personId ? null : crew.cdb,
            pax: (crew.pax || []).filter(pid => pid !== personId),
          };
        });
        return copy;
      });
      return { ...v, personOverrides: next, crewsByLeg };
    });
  }
  function saveAircraft(ac) {
    ac.id = ac.reg;
    if (!ac.aeroclubId) ac.aeroclubId = currentUser.aeroclubId;
    const i = window.AIRCRAFT.findIndex(x => x.id === ac.id);
    if (i >= 0) window.AIRCRAFT[i] = ac; else window.AIRCRAFT.push(ac);
    // Sync crew/fuel/bags slots in active voyage's variants
    updateActiveVoyage(v => ({
      ...v,
      variants: v.variants.map(va => ({
        ...va,
        crewsByLeg: va.crewsByLeg.map(leg => leg[ac.id] ? leg : { ...leg, [ac.id]: { cdb: null, pax: [] } }),
        fuelLoadL:  va.fuelLoadL.map(leg => leg[ac.id] != null ? leg : { ...leg, [ac.id]: window.AC_MODELS[ac.model]?.fuelCapL || 80 }),
        bagsByLeg:  va.bagsByLeg.map(leg => leg[ac.id] ? leg : { ...leg, [ac.id]: { count: 0, unitKg: 12 } }),
      })),
    }));
    bumpRefs();
  }
  function deleteAircraft(id) {
    const i = window.AIRCRAFT.findIndex(x => x.id === id);
    if (i >= 0) window.AIRCRAFT.splice(i, 1);
    bumpRefs();
  }
  function saveAircraftModel(key, model) { window.AC_MODELS[key] = model; bumpRefs(); }
  function deleteAircraftModel(key) { delete window.AC_MODELS[key]; bumpRefs(); }
  function saveAerodrome(ad) {
    if (!ad.aeroclubIds) ad.aeroclubIds = [currentUser.aeroclubId];
    const i = window.AERODROMES.findIndex(x => x.icao === ad.icao);
    if (i >= 0) window.AERODROMES[i] = ad; else window.AERODROMES.push(ad);
    bumpRefs();
  }
  function deleteAerodrome(icao) {
    const i = window.AERODROMES.findIndex(x => x.icao === icao);
    if (i >= 0) window.AERODROMES.splice(i, 1);
    bumpRefs();
  }

  // ─── Variant management (on active voyage) ───
  function updateActiveVariant(updater) {
    updateActiveVoyage(v => ({
      ...v,
      variants: v.variants.map(va => va.id === v.activeVariantId ? updater(va) : va),
    }));
  }
  function selectVariant(id) { updateActiveVoyage(v => ({ ...v, activeVariantId: id })); }
  function duplicateVariant() {
    updateActiveVoyage(v => {
      const src = v.variants.find(x => x.id === v.activeVariantId);
      const usedIds = new Set(v.variants.map(x => x.id));
      let nextId = "A";
      for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (!usedIds.has(c)) { nextId = c; break; }
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = nextId;
      copy.label = `Plan ${nextId} — copie`;
      copy.tag = "alt";
      return { ...v, variants: [...v.variants, copy], activeVariantId: nextId };
    });
  }
  function deleteVariant(id) {
    updateActiveVoyage(v => {
      if (v.variants.length <= 1) return v;
      const remaining = v.variants.filter(x => x.id !== id);
      const active = v.activeVariantId === id ? remaining[0].id : v.activeVariantId;
      return { ...v, variants: remaining, activeVariantId: active };
    });
  }
  function renameVariant(id, label) {
    updateActiveVoyage(v => ({ ...v, variants: v.variants.map(x => x.id === id ? { ...x, label } : x) }));
  }

  // ─── Leg / crew / bags / fuel editing ───
  function replaceLegEndpoint(legIdx, which, newIcao) {
    updateActiveVariant(v => {
      const route = [...v.route];
      const i = which === "from" ? legIdx : legIdx + 1;
      route[i] = newIcao;
      return { ...v, route };
    });
  }
  function setStopMin(routeIdx, mins) {
    updateActiveVariant(v => {
      const stopMin = [...v.stopMin]; stopMin[routeIdx] = mins;
      return { ...v, stopMin };
    });
  }
  function setCrew(legIdx, acId, newCrew) {
    updateActiveVariant(v => ({
      ...v,
      crewsByLeg: v.crewsByLeg.map((leg, i) => i === legIdx ? { ...leg, [acId]: newCrew } : leg),
    }));
  }
  function setBags(legIdx, acId, newBag) {
    updateActiveVariant(v => ({
      ...v,
      bagsByLeg: v.bagsByLeg.map((leg, i) => i === legIdx ? { ...leg, [acId]: newBag } : leg),
    }));
  }
  function setFuel(legIdx, acId, newFuelL) {
    updateActiveVariant(v => ({
      ...v,
      fuelLoadL: v.fuelLoadL.map((leg, i) => i === legIdx ? { ...leg, [acId]: newFuelL } : leg),
    }));
  }

  // ─── Voyage sharing ; CRUD ; settings ───
  function updateSharedWith(voyageId, sharedIds) {
    updateVoyage(voyageId, v => ({ ...v, sharedWith: sharedIds }));
  }
  function createVoyage(newV) {
    window.VOYAGES.unshift(newV);
    bumpVoyages();
    setActiveVoyageId(newV.id);
    setTab("voyage");
  }
  function deleteVoyageById(id) {
    const idx = window.VOYAGES.findIndex(v => v.id === id);
    if (idx < 0) return;
    window.VOYAGES.splice(idx, 1);
    if (id === activeVoyageId) {
      const remaining = window.voyagesForUser(currentUser.id);
      setActiveVoyageId(remaining[0]?.id || null);
      setTab("voyages");
    }
    bumpVoyages();
  }
  function saveVoyageSettings(id, patch) {
    updateVoyage(id, v => ({ ...v, ...patch }));
  }

  // ─── Map ───
  function handleSelectAerodrome(icao) {
    if (!variant) return;
    const idx = variant.route.indexOf(icao);
    if (idx === -1) return;
    setSelectedLegIdx(idx === variant.route.length - 1 ? idx - 1 : idx);
  }

  useEffectA(() => {
    document.documentElement.setAttribute("data-map", tweaks.mapStyle);
  }, [tweaks.mapStyle]);

  const shareVoyage = shareDialogId ? window.VOYAGES.find(v => v.id === shareDialogId) : null;

  return (
    <div className="app">
      <window.TopBar
        tab={tab} onTab={setTab}
        voyage={voyage}
        variant={variant}
        totals={computed}
        finance={finance}
        currentUser={currentUser}
        onUserMenu={() => setUserMenuOpen(true)}
      />
      <div className="viewport">
        {tab === "voyages" ? (
          <window.VoyagesListPage
            currentUser={currentUser}
            activeVoyageId={activeVoyageId}
            onOpenVoyage={(id) => { setActiveVoyageId(id); setTab("voyage"); }}
            onShare={(v) => setShareDialogId(v.id)}
            onNew={() => setNewVoyageOpen(true)}
            key={`vl-${voyagesVersion}`}
          />
        ) : tab === "voyage" && variant ? (
          <div style={{height:"100%", display:"flex", flexDirection:"column"}}>
            <window.VoyageSubTabs
              subTab={voyageSubTab}
              onSubTab={setVoyageSubTab}
              voyage={voyage}
              variant={variant}
              computed={computed}
              finance={finance} />
            <div style={{flex: 1, minHeight: 0, position:"relative"}}>
              {voyageSubTab === "map" ? (
                <VoyageDashboard
                  voyage={voyage} variant={variant} computed={computed}
                  selectedLeg={selectedLeg}
                  selectedLegIdx={Math.min(selectedLegIdx, computed.legs.length - 1)}
                  onSelectLeg={setSelectedLegIdx}
                  hoveredLeg={hoveredLeg} setHoveredLeg={setHoveredLeg}
                  handleSelectAerodrome={handleSelectAerodrome}
                  setVacIcao={setVacIcao}
                  tweaks={tweaks} setTweak={setTweak}
                  onReplaceLeg={(legIdx, which, anchor) => setEditor({ kind: "aerodrome", legIdx, which, anchor })}
                  onCrewEdit={(ac, legIdx, anchor) => setEditor({ kind: "crew", ac, legIdx, anchor })}
                  onBagsEdit={(ac, legIdx, anchor) => setEditor({ kind: "bags", ac, legIdx, anchor })}
                  onFuelEdit={(ac, legIdx, anchor) => setEditor({ kind: "fuel", ac, legIdx, anchor })}
                  onVariantSelect={selectVariant}
                  onVariantDuplicate={duplicateVariant}
                  onVariantDelete={deleteVariant}
                  onVariantRename={renameVariant}
                  onStopMinChange={setStopMin}
                  onShare={() => setShareDialogId(voyage.id)}
                  onSettings={() => setSettingsDialogId(voyage.id)}
                  onRenameVoyage={(id, title) => saveVoyageSettings(id, { title })}
                  currentUser={currentUser}
                />
              ) : voyageSubTab === "people" ? (
                <window.VoyagePeoplePage voyage={voyage} variant={variant} computed={computed} finance={finance}
                  onAddPerson={() => setFormEditor({ kind: "voyagePerson", payload: { first: "", last: "", weightKg: 75, license: "", authorizedModels: [], rolePref: "PAX" } })}
                  onEditPerson={(p) => setFormEditor({ kind: "voyagePerson", payload: p })}
                  onRemoveFromVoyage={removeFromVoyage}
                  key={`vpp-${refsVersion}-${voyagesVersion}`} />
              ) : voyageSubTab === "finance" ? (
                <window.FinancePage variant={variant} key={`fin-${voyagesVersion}`} />
              ) : null}
            </div>
          </div>
        ) : tab === "aircraft" ? (
          <window.AircraftPage key={`a-${refsVersion}`} currentUser={currentUser}
            onAddAircraft={() => setFormEditor({ kind: "aircraft", payload: {
              reg: "", callsign: "", color: "var(--plane-1)",
              model: Object.keys(window.AC_MODELS)[0],
              aeroclubId: currentUser.aeroclubId,
              notes: "",
            } })}
            onEditAircraft={(ac) => setFormEditor({ kind: "aircraft", payload: ac })}
            onAddModel={() => setFormEditor({ kind: "model", payload: {
              modelKey: "", model: {
                label: "", type: "", fuelType: "100LL", seats: 4,
                cruiseKt: 100, burnLh: 20, fuelCapL: 100,
                massEmptyKg: 600, mtowKg: 1000, mldwKg: 1000,
                minRunwayM: 500, hourlyEUR: 150, icon: "",
              }
            } })}
            onEditModel={(key, model) => setFormEditor({ kind: "model", payload: { modelKey: key, model } })}
          />
        ) : (
          <window.AerodromesPage onOpenVAC={setVacIcao}
            key={`ad-${refsVersion}`} currentUser={currentUser}
            onAdd={() => setFormEditor({ kind: "aerodrome", payload: {
              __isNew: true, icao: "", name: "", city: "", coord: [2, 46],
              elevation: 0, runways: [{ qfu: "", lengthM: 1000, surface: "Revêtue" }],
              fuel: ["100LL"], night: false, ppr: false, atc: "Aucun",
              taxLandingEUR: 0, taxParkingEUR: 0, note: "",
              aeroclubIds: [currentUser.aeroclubId],
            } })}
            onEdit={(ad) => setFormEditor({ kind: "aerodrome", payload: ad })}
          />
        )}
      </div>

      {userMenuOpen ? (
        <window.UserMenu currentUser={currentUser}
          onClose={() => setUserMenuOpen(false)}
          onLogout={onLogout}
          onSwitchUser={(u) => { setUserMenuOpen(false); handleSwitch(u); }}
        />
      ) : null}

      {/* Form drawers */}
      {formEditor && formEditor.kind === "person" ? (
        <window.PersonForm person={formEditor.payload}
          onClose={() => setFormEditor(null)}
          onSave={savePerson}
          onDelete={() => deletePerson(formEditor.payload.id)} />
      ) : null}
      {formEditor && formEditor.kind === "voyagePerson" ? (
        <window.VoyagePersonForm person={formEditor.payload} variant={variant}
          onClose={() => setFormEditor(null)}
          onSave={saveVoyagePerson}
          onDelete={() => { removeFromVoyage(formEditor.payload.id); setFormEditor(null); }} />
      ) : null}
      {formEditor && formEditor.kind === "aircraft" ? (
        <window.AircraftForm aircraft={formEditor.payload}
          onClose={() => setFormEditor(null)}
          onSave={saveAircraft}
          onDelete={() => deleteAircraft(formEditor.payload.id)} />
      ) : null}
      {formEditor && formEditor.kind === "model" ? (
        <window.AircraftModelForm modelKey={formEditor.payload.modelKey} model={formEditor.payload.model}
          onClose={() => setFormEditor(null)}
          onSave={saveAircraftModel}
          onDelete={() => deleteAircraftModel(formEditor.payload.modelKey)} />
      ) : null}
      {formEditor && formEditor.kind === "aerodrome" ? (
        <window.AerodromeForm aerodrome={formEditor.payload}
          onClose={() => setFormEditor(null)}
          onSave={saveAerodrome}
          onDelete={() => deleteAerodrome(formEditor.payload.icao)} />
      ) : null}

      {shareVoyage ? (
        <window.ShareDialog voyage={shareVoyage} currentUser={currentUser}
          onClose={() => setShareDialogId(null)}
          onUpdate={updateSharedWith} />
      ) : null}

      {newVoyageOpen ? (
        <window.NewVoyageDialog currentUser={currentUser}
          onClose={() => setNewVoyageOpen(false)}
          onCreate={createVoyage} />
      ) : null}

      {settingsDialogId ? (() => {
        const v = window.VOYAGES.find(x => x.id === settingsDialogId);
        return v ? (
          <window.VoyageSettingsDialog voyage={v} currentUser={currentUser}
            onClose={() => setSettingsDialogId(null)}
            onSave={saveVoyageSettings}
            onDelete={deleteVoyageById} />
        ) : null;
      })() : null}

      {/* Editor popovers */}
      {editor && editor.kind === "aerodrome" ? (
        <window.AerodromePicker
          anchor={editor.anchor}
          currentIcao={editor.which === "from" ? variant.route[editor.legIdx] : variant.route[editor.legIdx + 1]}
          label={editor.which === "from" ? "Aérodrome de départ" : "Aérodrome d'arrivée"}
          onPick={(icao) => replaceLegEndpoint(editor.legIdx, editor.which, icao)}
          onClose={() => setEditor(null)} />
      ) : null}
      {editor && editor.kind === "crew" ? (
        <window.CrewPicker
          anchor={editor.anchor} ac={editor.ac} legIdx={editor.legIdx} variant={variant}
          onChange={(crew) => setCrew(editor.legIdx, editor.ac.id, crew)}
          onClose={() => setEditor(null)} />
      ) : null}
      {editor && editor.kind === "bags" ? (
        <window.BagsPicker
          anchor={editor.anchor} ac={editor.ac}
          bag={variant.bagsByLeg[editor.legIdx][editor.ac.id]}
          onChange={(bag) => setBags(editor.legIdx, editor.ac.id, bag)}
          onClose={() => setEditor(null)} />
      ) : null}
      {editor && editor.kind === "fuel" ? (
        <window.FuelPicker
          anchor={editor.anchor} ac={editor.ac}
          fuelL={variant.fuelLoadL[editor.legIdx][editor.ac.id]}
          fuelCapL={window.AC_MODELS[editor.ac.model].fuelCapL}
          onChange={(fuelL) => setFuel(editor.legIdx, editor.ac.id, fuelL)}
          onClose={() => setEditor(null)} />
      ) : null}

      {vacIcao ? <window.VACModal icao={vacIcao} onClose={() => setVacIcao(null)} /> : null}

      <TweaksUI tweaks={tweaks} setTweak={setTweak} />
    </div>
  );

  function handleSwitch(u) {
    try { localStorage.setItem(LS_USER, u.id); } catch (e) {}
    location.reload();
  }
}

function VoyageDashboard(props) {
  const { voyage, variant, computed, selectedLeg, selectedLegIdx, onSelectLeg, hoveredLeg, handleSelectAerodrome, setVacIcao, tweaks,
          onReplaceLeg, onCrewEdit, onBagsEdit, onFuelEdit, onVariantSelect, onVariantDuplicate, onVariantDelete, onVariantRename, onStopMinChange, onShare, onSettings, currentUser } = props;
  const pos = tweaks.panelPosition;
  const density = tweaks.density;
  const selectedAerodromeIcao = variant.route[selectedLegIdx];

  const voyagePanel = (
    <window.VoyagePanel
      voyage={voyage} variant={variant} computed={computed}
      selectedLegIdx={selectedLegIdx} onSelectLeg={onSelectLeg}
      density={density}
      onReplaceLeg={onReplaceLeg}
      onVariantSelect={onVariantSelect}
      onVariantDuplicate={onVariantDuplicate}
      onVariantDelete={onVariantDelete}
      onVariantRename={onVariantRename}
      onStopMinChange={onStopMinChange}
      onShare={onShare}
      onSettings={onSettings}
      onRenameVoyage={(newTitle) => props.onRenameVoyage(voyage.id, newTitle)}
      currentUser={currentUser}
    />
  );
  const legDetail = (
    <window.LegDetail leg={selectedLeg} legIdx={selectedLegIdx} variant={variant}
      density={density} onOpenVAC={setVacIcao} onOpenAerodrome={setVacIcao}
      onCrewEdit={onCrewEdit} onBagsEdit={onBagsEdit} onFuelEdit={onFuelEdit} />
  );
  const mapBlock = (
    <div style={{flex: 1, position: "relative", margin: 12, marginLeft: 6, marginRight: 6, borderRadius: 6, overflow: "hidden", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-card)", minWidth: 320}}>
      <div className="map-stage">
        <window.PaperMap
          selectedAerodromeIcao={selectedAerodromeIcao}
          onSelectAerodrome={handleSelectAerodrome}
          hoveredLeg={hoveredLeg}
          voyage={variant}
          opts={{ rangeRings: tweaks.rangeRings, hideOffRoute: tweaks.hideOffRoute, autonomyNM: tweaks.autonomyNM }}
        />
        <MapOverlay variant={variant} />
      </div>
    </div>
  );
  if (pos === "bottom") return (
    <div style={{height:"100%", display:"flex", flexDirection:"column"}}>
      <div style={{flex: 1, display:"flex", minHeight: 0}}>{voyagePanel}{mapBlock}</div>
      <div style={{borderTop: "1px solid var(--hairline)", maxHeight: "42%", overflow:"auto"}}>
        <div style={{display:"flex", width:"100%"}}>{legDetail}</div>
      </div>
    </div>
  );
  if (pos === "left") return (
    <div style={{height:"100%", display:"flex"}}>{legDetail}{voyagePanel}{mapBlock}</div>
  );
  return (
    <div style={{height:"100%", display:"flex"}}>{voyagePanel}{mapBlock}{legDetail}</div>
  );
}

function MapOverlay({ variant }) {
  return (
    <div style={{position:"absolute", top: 12, right: 12, display:"flex", flexDirection:"column", gap: 8, alignItems:"flex-end", pointerEvents: "none"}}>
      <div className="card" style={{padding: "6px 8px", display:"flex", gap: 4, alignItems:"center", pointerEvents:"auto"}}>
        <button className="btn btn-sm" title="Zoomer"><i className="fa-solid fa-plus"/></button>
        <button className="btn btn-sm" title="Dézoomer"><i className="fa-solid fa-minus"/></button>
        <button className="btn btn-sm" title="Recentrer"><i className="fa-solid fa-crosshairs"/></button>
        <div className="divider-v" style={{margin: "0 2px"}}/>
        <button className="btn btn-sm" title="Couches"><i className="fa-solid fa-layer-group"/></button>
        <button className="btn btn-sm" title="Mesurer"><i className="fa-solid fa-ruler"/></button>
      </div>
      <div className="card" style={{padding: "8px 10px", pointerEvents:"auto", maxWidth: 230, fontSize: 10.5}}>
        <div style={{display:"flex", alignItems:"center", gap: 6, marginBottom: 6}}>
          <span style={{
            width: 18, height: 18, borderRadius: 3,
            background: "var(--ink)", color: "#ffcf52",
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--font-mono)", fontWeight: 700, fontSize: 10,
          }}>{variant.id}</span>
          <span style={{fontWeight: 600}}>{variant.label}</span>
        </div>
        <div style={{fontSize: 10, color:"var(--ink-3)", fontStyle:"italic"}}>{variant.weather}</div>
      </div>
      <div className="card" style={{padding: "8px 10px", pointerEvents:"auto", maxWidth: 230}}>
        <div className="cap-sm" style={{marginBottom: 6}}>Légende</div>
        <div style={{display:"grid", gridTemplateColumns:"auto 1fr", gap:"4px 8px", fontSize: 10.5, alignItems:"center"}}>
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--aero-red)" stroke="var(--ink)" strokeWidth="1.4"/></svg>
          <span>Aérodrome de la route</span>
          <svg width="14" height="14"><circle cx="7" cy="7" r="3.2" fill="#fffdf5" stroke="var(--ink-2)" strokeWidth="1"/></svg>
          <span>Aérodrome (référence)</span>
          <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 2"/></svg>
          <span>Branche de navigation</span>
          <svg width="14" height="14"><path d="M 7 2 L 2 12 L 12 12 Z" fill="var(--aero-red)"/></svg>
          <span>Obstacle / relief</span>
        </div>
      </div>
    </div>
  );
}

function TweaksUI({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Disposition">
        <TweakRadio label="Panneau détail" value={tweaks.panelPosition}
          onChange={(v) => setTweak("panelPosition", v)}
          options={[
            { value: "left", label: "Gauche" },
            { value: "right", label: "Droite" },
            { value: "bottom", label: "Bas" },
          ]} />
        <TweakSelect label="Densité d'info" value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "compact", label: "Compacte" },
            { value: "normal", label: "Normale" },
            { value: "detailed", label: "Détaillée" },
          ]} />
      </TweakSection>
      <TweakSection label="Carte">
        <TweakRadio label="Style" value={tweaks.mapStyle}
          onChange={(v) => setTweak("mapStyle", v)}
          options={[
            { value: "paper", label: "Papier" },
            { value: "night", label: "Nuit" },
            { value: "bw", label: "N&B" },
          ]} />
        <TweakToggle label="Cercles d'autonomie" value={tweaks.rangeRings}
          onChange={(v) => setTweak("rangeRings", v)} />
        {tweaks.rangeRings ? (
          <TweakSlider label="Rayon d'autonomie" value={tweaks.autonomyNM}
            min={100} max={600} step={25} unit=" NM"
            onChange={(v) => setTweak("autonomyNM", v)} />
        ) : null}
        <TweakToggle label="Masquer hors-route" value={tweaks.hideOffRoute}
          onChange={(v) => setTweak("hideOffRoute", v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
