// AeroNav — Forms for create/edit of People / Aircraft / Models / Aerodromes

const { useState: useStateFM, useEffect: useEffectFM } = React;

// ─── Drawer shell ───
function Drawer({ title, subtitle, onClose, onSave, onDelete, saveLabel = "Enregistrer", canDelete = false, width = 480, children }) {
  useEffectFM(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(11,34,64,0.40)", zIndex: 90,
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth: "94vw",
        background: "var(--surface)",
        boxShadow: "-24px 0 64px -16px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column",
        height: "100vh",
        animation: "drawerSlide 220ms cubic-bezier(.2,.6,.2,1)",
      }}>
        <style>{`@keyframes drawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <div style={{
          background: "var(--ink)", color: "#f3ecd6",
          padding: "12px 18px", borderBottom: "1px solid #000",
          display:"flex", alignItems:"center", gap: 10,
        }}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 14, fontWeight: 600}}>{title}</div>
            {subtitle ? <div style={{fontSize: 11, color: "#c4b88a", marginTop: 2}}>{subtitle}</div> : null}
          </div>
          <button className="close" onClick={onClose} style={{
            background: "transparent", border: 0, color: "#c4b88a",
            width: 28, height: 28, borderRadius: 4, cursor: "pointer",
          }}><i className="fa-solid fa-xmark" style={{fontSize: 14}}/></button>
        </div>
        <div className="scroll" style={{flex: 1, overflow: "auto", padding: "16px 18px"}}>
          {children}
        </div>
        <div style={{
          padding: "10px 18px", borderTop: "1px solid var(--hairline)",
          background: "var(--surface-2)",
          display:"flex", alignItems:"center", gap: 8,
        }}>
          {canDelete ? (
            <button className="btn" style={{color:"var(--aero-red)"}}
              onClick={() => { if (confirm("Confirmer la suppression ?")) { onDelete(); onClose(); } }}>
              <i className="fa-solid fa-trash"/> Supprimer
            </button>
          ) : null}
          <div style={{flex: 1}}/>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { onSave(); onClose(); }}>
            <i className="fa-solid fa-check"/> {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field helpers ───
function Field({ label, hint, children, span = 1 }) {
  return (
    <div className="field" style={{gridColumn: `span ${span}`}}>
      <label>{label}</label>
      {children}
      {hint ? <div style={{fontSize: 10, color: "var(--ink-3)", marginTop: 2}}>{hint}</div> : null}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  return (
    <div style={{display:"grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 14}}>
      {children}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{marginBottom: 18}}>
      <div style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600,
        color: "var(--ink-3)", marginBottom: 10, display:"flex", alignItems:"center", gap: 6,
        paddingBottom: 6, borderBottom: "1px solid var(--hairline-soft)",
      }}>
        {icon ? <i className={`fa-solid ${icon}`}/> : null}
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div style={{display:"flex", alignItems:"center", gap: 8, padding: "4px 0"}}>
      <div className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)}/>
      <span style={{fontSize: 12}}>{label}</span>
    </div>
  );
}

function ChipSelect({ options, value, onChange, multi = true }) {
  return (
    <div style={{display:"flex", gap: 6, flexWrap:"wrap"}}>
      {options.map(opt => {
        const v = typeof opt === "object" ? opt.value : opt;
        const l = typeof opt === "object" ? opt.label : opt;
        const sel = multi ? value.includes(v) : value === v;
        return (
          <button key={v} type="button"
            onClick={() => {
              if (multi) {
                onChange(sel ? value.filter(x => x !== v) : [...value, v]);
              } else {
                onChange(v);
              }
            }}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${sel ? "var(--ink)" : "var(--hairline)"}`,
              background: sel ? "var(--ink)" : "var(--surface-card)",
              color: sel ? "#fff8df" : "var(--ink)",
              fontSize: 11, fontWeight: sel ? 600 : 500,
              cursor: "pointer",
            }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ─── Person Form ───
function PersonForm({ person, onClose, onSave, onDelete }) {
  const isNew = !person.id;
  const [draft, setDraft] = useStateFM(person);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const acOptions = Object.entries(window.AC_MODELS).map(([k, m]) => ({ value: k, label: m.icon + " — " + m.label.split(" ").slice(0,2).join(" ") }));
  return (
    <Drawer
      title={isNew ? "Nouvelle personne" : `Modifier ${person.first} ${person.last}`}
      subtitle={isNew ? "Pilote ou passager" : `ID ${person.id.toUpperCase()}`}
      onClose={onClose}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      canDelete={!isNew}>
      <Section title="Identité" icon="fa-user">
        <Grid cols={2}>
          <Field label="Prénom">
            <input className="input" autoFocus value={draft.first}
              onChange={e => set("first", e.target.value)} />
          </Field>
          <Field label="Nom">
            <input className="input" value={draft.last}
              onChange={e => set("last", e.target.value)} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Poids (kg)" hint="Pour le devis de masse">
            <input type="number" className="input" min="20" max="200" value={draft.weightKg}
              onChange={e => set("weightKg", Number(e.target.value))} />
          </Field>
          <Field label="Rôle préférentiel">
            <ChipSelect multi={false}
              options={[{value:"CDB",label:"CDB"},{value:"PAX",label:"PAX"}]}
              value={draft.rolePref}
              onChange={v => set("rolePref", v)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Qualifications" icon="fa-id-card">
        <Field label="Licence" hint="Ex. PPL, LAPL, PPL+CDI, …">
          <input className="input" value={draft.license}
            onChange={e => set("license", e.target.value)} />
        </Field>
        <div style={{marginTop: 12}}>
          <label style={{fontSize: 10, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-3)", fontWeight: 600, display:"block", marginBottom: 6}}>
            Avions autorisés à bord
          </label>
          <ChipSelect options={acOptions} value={draft.authorizedModels}
            onChange={v => set("authorizedModels", v)} />
          <div style={{fontSize: 10, color: "var(--ink-3)", marginTop: 6}}>
            La personne ne pourra être affectée que sur ces types d'avion.
          </div>
        </div>
      </Section>
    </Drawer>
  );
}

// ─── Aircraft Form (instance) ───
function AircraftForm({ aircraft, onClose, onSave, onDelete }) {
  const isNew = !aircraft.id;
  const [draft, setDraft] = useStateFM(aircraft);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const m = window.AC_MODELS[draft.model];
  const colorOptions = [
    "var(--plane-1)", "var(--plane-2)", "var(--plane-3)",
    "var(--plane-4)", "var(--plane-5)", "var(--plane-6)",
  ];
  return (
    <Drawer
      title={isNew ? "Nouvel avion" : `Modifier ${aircraft.reg}`}
      subtitle={m ? m.label : ""}
      onClose={onClose}
      onSave={() => onSave({ ...draft, id: draft.reg })}
      onDelete={onDelete}
      canDelete={!isNew}>
      <Section title="Immatriculation" icon="fa-plane">
        <Grid cols={2}>
          <Field label="Immatriculation" hint="ex. F-GAAA">
            <input className="input" autoFocus value={draft.reg}
              onChange={e => set("reg", e.target.value.toUpperCase())} maxLength={7} />
          </Field>
          <Field label="Indicatif radio">
            <input className="input" value={draft.callsign}
              onChange={e => set("callsign", e.target.value.toUpperCase())} />
          </Field>
        </Grid>
        <Field label="Couleur d'identification">
          <div style={{display:"flex", gap: 6, marginTop: 4}}>
            {colorOptions.map(c => (
              <button key={c} type="button" onClick={() => set("color", c)} style={{
                width: 28, height: 28, borderRadius: 4,
                background: c,
                border: `2px solid ${draft.color === c ? "var(--ink)" : "transparent"}`,
                cursor: "pointer",
                boxShadow: draft.color === c ? "0 0 0 2px var(--ink) inset, 0 0 0 4px var(--surface) inset" : "none",
              }}/>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Modèle" icon="fa-cogs">
        <Field label="Modèle de l'avion">
          <select className="select" value={draft.model}
            onChange={e => set("model", e.target.value)}>
            {Object.entries(window.AC_MODELS).map(([k, mm]) => (
              <option key={k} value={k}>{mm.label}</option>
            ))}
          </select>
        </Field>
        {m ? (
          <div style={{marginTop: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 4, fontSize: 11}}>
            <div className="cap-sm" style={{marginBottom: 8}}>Caractéristiques (lecture seule)</div>
            <div style={{display:"grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8}}>
              <KV k="Type" v={m.type}/>
              <KV k="Carb." v={m.fuelType}/>
              <KV k="Sièges" v={`${m.seats} pl.`}/>
              <KV k="Croisière" v={`${m.cruiseKt} kt`}/>
              <KV k="Conso." v={`${m.burnLh} L/h`}/>
              <KV k="Capacité" v={`${m.fuelCapL} L`}/>
              <KV k="MV" v={`${m.massEmptyKg} kg`}/>
              <KV k="MTOW" v={`${m.mtowKg} kg`}/>
              <KV k="Tarif" v={`${m.hourlyEUR} €/h`}/>
            </div>
            <div style={{fontSize: 10, color:"var(--ink-3)", marginTop: 8}}>
              Pour modifier les caractéristiques, éditez le modèle dans l'onglet Modèles.
            </div>
          </div>
        ) : null}
      </Section>
    </Drawer>
  );
}

function KV({ k, v }) {
  return (
    <div>
      <div style={{fontSize: 9.5, color:"var(--ink-3)", textTransform:"uppercase", letterSpacing:"0.06em"}}>{k}</div>
      <div className="mono" style={{fontWeight: 600}}>{v}</div>
    </div>
  );
}

// ─── Aircraft Model Form ───
function AircraftModelForm({ modelKey, model, onClose, onSave, onDelete }) {
  const isNew = !modelKey;
  const [draft, setDraft] = useStateFM({ ...model, _key: modelKey || "" });
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  return (
    <Drawer
      title={isNew ? "Nouveau modèle d'avion" : `Modèle — ${model.label}`}
      subtitle={modelKey || ""}
      onClose={onClose}
      onSave={() => {
        const k = draft._key.trim().toUpperCase().replace(/\s+/g, "-");
        const m = { ...draft }; delete m._key;
        onSave(k, m);
      }}
      onDelete={onDelete}
      canDelete={!isNew}>
      <Section title="Identification" icon="fa-tag">
        <Grid cols={2}>
          <Field label="Code interne" hint="Ex. DR400-155">
            <input className="input" value={draft._key} disabled={!isNew}
              onChange={e => set("_key", e.target.value)} />
          </Field>
          <Field label="Code badge" hint="Affiché sur les chips (3-6 lettres)">
            <input className="input" value={draft.icon}
              onChange={e => set("icon", e.target.value.toUpperCase())} maxLength={8} />
          </Field>
        </Grid>
        <Field label="Désignation">
          <input className="input" value={draft.label}
            onChange={e => set("label", e.target.value)} />
        </Field>
        <Grid cols={2}>
          <Field label="Type">
            <input className="input" value={draft.type}
              onChange={e => set("type", e.target.value)} />
          </Field>
          <Field label="Carburant">
            <select className="select" value={draft.fuelType}
              onChange={e => set("fuelType", e.target.value)}>
              <option>Jet-A1</option>
              <option>100LL</option>
              <option>MOGAS / UL91</option>
              <option>Jet-A1 / MOGAS</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Performances" icon="fa-gauge-high">
        <Grid cols={3}>
          <Field label="Vitesse croisière">
            <UnitInput value={draft.cruiseKt} unit="kt" onChange={v => set("cruiseKt", v)} />
          </Field>
          <Field label="Consommation">
            <UnitInput value={draft.burnLh} unit="L/h" onChange={v => set("burnLh", v)} />
          </Field>
          <Field label="Capacité carb.">
            <UnitInput value={draft.fuelCapL} unit="L" onChange={v => set("fuelCapL", v)} />
          </Field>
          <Field label="Sièges">
            <UnitInput value={draft.seats} unit="pl." onChange={v => set("seats", v)} />
          </Field>
          <Field label="Piste min.">
            <UnitInput value={draft.minRunwayM} unit="m" onChange={v => set("minRunwayM", v)} />
          </Field>
          <Field label="Tarif horaire">
            <UnitInput value={draft.hourlyEUR} unit="€/h" onChange={v => set("hourlyEUR", v)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Masses" icon="fa-weight-hanging">
        <Grid cols={3}>
          <Field label="Masse à vide">
            <UnitInput value={draft.massEmptyKg} unit="kg" onChange={v => set("massEmptyKg", v)} />
          </Field>
          <Field label="MTOW">
            <UnitInput value={draft.mtowKg} unit="kg" onChange={v => set("mtowKg", v)} />
          </Field>
          <Field label="MLDW">
            <UnitInput value={draft.mldwKg} unit="kg" onChange={v => set("mldwKg", v)} />
          </Field>
        </Grid>
      </Section>
    </Drawer>
  );
}

function UnitInput({ value, unit, onChange }) {
  return (
    <div style={{position: "relative"}}>
      <input type="number" className="input" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{paddingRight: 36}} />
      <span style={{position:"absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color:"var(--ink-3)", fontFamily: "var(--font-mono)"}}>
        {unit}
      </span>
    </div>
  );
}

// ─── Aerodrome Form ───
function AerodromeForm({ aerodrome, onClose, onSave, onDelete }) {
  const isNew = !aerodrome.icao || aerodrome.__isNew;
  const [draft, setDraft] = useStateFM(() => {
    const d = { ...aerodrome };
    delete d.__isNew;
    if (!d.runways) d.runways = [{ qfu: "", lengthM: 0, surface: "Revêtue" }];
    return d;
  });
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const setRunway = (k, v) => setDraft(d => ({ ...d, runways: [{ ...d.runways[0], [k]: v }] }));
  return (
    <Drawer
      title={isNew ? "Nouvel aérodrome" : `Modifier ${aerodrome.icao} — ${aerodrome.name}`}
      subtitle={isNew ? "Référence terrain" : aerodrome.city}
      onClose={onClose}
      onSave={() => onSave(draft)}
      onDelete={onDelete}
      canDelete={!isNew}
      width={560}>

      <Section title="Identité" icon="fa-tower-control">
        <Grid cols={3}>
          <Field label="Code OACI" hint="4 lettres">
            <input className="input" autoFocus value={draft.icao}
              onChange={e => set("icao", e.target.value.toUpperCase())}
              maxLength={4} style={{fontFamily: "var(--font-mono)", fontWeight: 700}} />
          </Field>
          <Field label="Nom" span={2}>
            <input className="input" value={draft.name}
              onChange={e => set("name", e.target.value)} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Ville">
            <input className="input" value={draft.city}
              onChange={e => set("city", e.target.value)} />
          </Field>
          <Field label="Service ATS">
            <select className="select" value={draft.atc}
              onChange={e => set("atc", e.target.value)}>
              <option>Aucun</option>
              <option>AFIS</option>
              <option>Tour</option>
              <option>Tour+Approche</option>
              <option>MIL</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Position" icon="fa-location-dot">
        <Grid cols={3}>
          <Field label="Latitude" hint="° N (décimaux)">
            <input type="number" step="0.0001" className="input" value={draft.coord ? draft.coord[1] : 0}
              onChange={e => setDraft(d => ({ ...d, coord: [d.coord?.[0] || 0, Number(e.target.value)] }))} />
          </Field>
          <Field label="Longitude" hint="° E (négatif=W)">
            <input type="number" step="0.0001" className="input" value={draft.coord ? draft.coord[0] : 0}
              onChange={e => setDraft(d => ({ ...d, coord: [Number(e.target.value), d.coord?.[1] || 0] }))} />
          </Field>
          <Field label="Altitude (ft)">
            <UnitInput value={draft.elevation} unit="ft" onChange={v => set("elevation", v)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Piste principale" icon="fa-road">
        <Grid cols={3}>
          <Field label="QFU" hint="ex. 03/21">
            <input className="input" value={draft.runways[0].qfu}
              onChange={e => setRunway("qfu", e.target.value)}
              style={{fontFamily:"var(--font-mono)"}} />
          </Field>
          <Field label="Longueur">
            <UnitInput value={draft.runways[0].lengthM} unit="m" onChange={v => setRunway("lengthM", v)} />
          </Field>
          <Field label="Nature">
            <select className="select" value={draft.runways[0].surface}
              onChange={e => setRunway("surface", e.target.value)}>
              <option>Revêtue</option>
              <option>Herbe</option>
              <option>Stabilisée</option>
              <option>Eau</option>
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Carburants & Services" icon="fa-gas-pump">
        <Field label="Carburants disponibles">
          <ChipSelect
            options={["100LL", "Jet-A1", "MOGAS / UL91"]}
            value={draft.fuel} onChange={v => set("fuel", v)} />
        </Field>
        <div style={{marginTop: 12, display:"grid", gridTemplateColumns:"1fr 1fr", gap: 6}}>
          <Toggle label="Utilisable de nuit" value={draft.night} onChange={v => set("night", v)} />
          <Toggle label="PPR (autorisation préalable)" value={draft.ppr} onChange={v => set("ppr", v)} />
        </div>
      </Section>

      <Section title="Taxes" icon="fa-coins">
        <Grid cols={2}>
          <Field label="Atterrissage (par avion)" hint="Forfait facturé à chaque CDB">
            <UnitInput value={draft.taxLandingEUR || 0} unit="€" onChange={v => set("taxLandingEUR", v)} />
          </Field>
          <Field label="Parking (par avion)" hint="Appliqué aux escales intermédiaires">
            <UnitInput value={draft.taxParkingEUR || 0} unit="€" onChange={v => set("taxParkingEUR", v)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Notes" icon="fa-note-sticky">
        <Field label="Remarques opérationnelles">
          <textarea className="input" rows={3} value={draft.note || ""}
            onChange={e => set("note", e.target.value)}
            style={{resize: "vertical", fontFamily: "inherit"}} />
        </Field>
      </Section>

    </Drawer>
  );
}

window.PersonForm = PersonForm;
window.AircraftForm = AircraftForm;
window.AircraftModelForm = AircraftModelForm;
window.AerodromeForm = AerodromeForm;

// ─── Voyage Person Form ───
// Used in the Voyage > Personnes tab. Handles two cases:
//   1. Existing user (via email match) → name/license/email locked,
//      weight + authorized models can be overridden FOR THIS VOYAGE ONLY.
//   2. New person → free-form, creates a PEOPLE record.
function VoyagePersonForm({ person, variant, onClose, onSave, onDelete }) {
  const isNew = !person.id;
  // Determine if this person is backed by a system user
  const linkedUserInit = !isNew ? window.userForPerson(person.id) : null;

  const [email, setEmail] = useStateFM(linkedUserInit?.email || "");
  const [emailTouched, setEmailTouched] = useStateFM(false);
  const matchedUser = !isNew ? linkedUserInit : (emailTouched && email ? window.userByEmail(email) : null);
  // For the form, if matched user exists, we treat the underlying person as that user's PEOPLE record
  const linkedPerson = matchedUser ? window.personById(matchedUser.personId) : null;
  const basePerson = linkedPerson || person;

  // Voyage-specific override (weight + authModels)
  const existingOverride = (variant && variant.personOverrides && basePerson.id ? variant.personOverrides[basePerson.id] : null) || {};

  const [first, setFirst] = useStateFM(basePerson.first || "");
  const [last, setLast]  = useStateFM(basePerson.last || "");
  const [license, setLicense] = useStateFM(basePerson.license || "");
  const [rolePref, setRolePref] = useStateFM(basePerson.rolePref || "PAX");
  const [globalWeight, setGlobalWeight] = useStateFM(basePerson.weightKg || 75);
  const [globalAuth, setGlobalAuth] = useStateFM(basePerson.authorizedModels || []);
  // Voyage overrides
  const [voyageWeight, setVoyageWeight] = useStateFM(existingOverride.weightKg != null ? existingOverride.weightKg : (basePerson.weightKg || 75));
  const [voyageAuth, setVoyageAuth] = useStateFM(existingOverride.authorizedModels || basePerson.authorizedModels || []);

  // When matchedUser changes (during typing), re-sync linked-person fields
  React.useEffect(() => {
    if (linkedPerson) {
      setFirst(linkedPerson.first);
      setLast(linkedPerson.last);
      setLicense(linkedPerson.license);
      setRolePref(linkedPerson.rolePref);
      setGlobalWeight(linkedPerson.weightKg);
      setGlobalAuth(linkedPerson.authorizedModels);
      const ov = (variant.personOverrides && variant.personOverrides[linkedPerson.id]) || {};
      setVoyageWeight(ov.weightKg != null ? ov.weightKg : linkedPerson.weightKg);
      setVoyageAuth(ov.authorizedModels || linkedPerson.authorizedModels);
    }
  }, [linkedPerson?.id]);

  const acOptions = Object.entries(window.AC_MODELS).map(([k, m]) => ({ value: k, label: m.icon + " — " + m.label.split(" ").slice(0,2).join(" ") }));

  // Are name/license fields locked? Only locked if the email matched a real user (or we opened on a linked person).
  const locked = !!matchedUser;

  const canDelete = !isNew && !matchedUser;
  const canSave = first.trim() && last.trim();

  function handleSave() {
    if (matchedUser) {
      // Linked: save voyage overrides only on basePerson.id
      const override = {};
      if (voyageWeight !== basePerson.weightKg) override.weightKg = voyageWeight;
      if (JSON.stringify(voyageAuth) !== JSON.stringify(basePerson.authorizedModels)) override.authorizedModels = voyageAuth;
      onSave({
        kind: "linked",
        personId: basePerson.id,
        override,
      });
    } else {
      // Standalone person — upsert PEOPLE record
      onSave({
        kind: "standalone",
        person: {
          ...person,
          first: first.trim(), last: last.trim(),
          weightKg: globalWeight,
          license, rolePref,
          authorizedModels: globalAuth,
        },
      });
    }
  }

  return (
    <Drawer
      title={isNew ? "Ajouter une personne au voyage" : `Modifier ${basePerson.first} ${basePerson.last}`}
      subtitle={matchedUser ? `Compte ${window.aeroclubById(matchedUser.aeroclubId)?.code} · ${matchedUser.email}` : (isNew ? "Inviter ou créer un nouveau profil" : "Profil libre (non lié à un compte)")}
      onClose={onClose}
      onSave={handleSave}
      onDelete={onDelete}
      canDelete={canDelete}>

      <Section title="Identification" icon="fa-envelope">
        <Field label="Email" hint={
          matchedUser ? "✓ Compte trouvé — les infos d'identité sont synchronisées." :
          (email && emailTouched ? "Aucun compte avec cet email — un profil libre sera créé." :
            "Saisissez l'email pour rechercher un compte existant.")
        }>
          <div style={{position:"relative"}}>
            <input type="email" className="input"
              placeholder="prenom.nom@aero-club.fr"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailTouched(true); }}
              autoFocus={isNew}
              disabled={!isNew && !!linkedUserInit}
              style={{paddingRight: 30}} />
            {matchedUser ? (
              <i className="fa-solid fa-check-circle" style={{position:"absolute", right:8, top:9, color:"var(--aero-green)"}}/>
            ) : (email && emailTouched ? (
              <i className="fa-solid fa-circle-plus" style={{position:"absolute", right:8, top:9, color:"var(--aero-amber)"}}/>
            ) : null)}
          </div>
        </Field>

        {matchedUser ? (
          <div style={{padding: "10px 12px", background:"#e3efe6", border:"1px solid #c5dbcc", borderRadius: 4, marginTop: 12, display:"flex", alignItems:"center", gap: 10}}>
            <span style={{width: 32, height: 32, borderRadius:"50%", background: `var(--plane-${(basePerson.id.charCodeAt(1) % 6)+1})`, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight: 700, fontSize: 11}}>
              {(basePerson.first[0] + basePerson.last[0]).toUpperCase()}
            </span>
            <div style={{flex:1}}>
              <div style={{fontSize: 12, fontWeight: 600}}>{matchedUser.first} {matchedUser.last}</div>
              <div style={{fontSize: 10.5, color:"var(--aero-green-2)"}}>{matchedUser.role} · ID utilisateur {matchedUser.id.toUpperCase()}</div>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Identité" icon="fa-user">
        {locked ? (
          <div style={{padding: "8px 10px", background:"#fff7df", border:"1px solid #e6cf83", borderRadius: 4, marginBottom: 10, fontSize: 11, color: "var(--ink-2)"}}>
            <i className="fa-solid fa-lock" style={{marginRight: 5, color:"var(--aero-amber)"}}/>
            <b>Prénom, nom et licence</b> sont gérés par l'utilisateur lui-même et ne sont pas modifiables ici.
          </div>
        ) : null}
        <Grid cols={2}>
          <Field label="Prénom">
            <input className="input" value={first} disabled={locked}
              onChange={e => setFirst(e.target.value)} />
          </Field>
          <Field label="Nom">
            <input className="input" value={last} disabled={locked}
              onChange={e => setLast(e.target.value)} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Licence" hint={locked ? "Saisie par l'utilisateur" : "PPL, LAPL, …"}>
            <input className="input" value={license} disabled={locked}
              onChange={e => setLicense(e.target.value)} />
          </Field>
          <Field label="Rôle préférentiel">
            <ChipSelect multi={false}
              options={[{value:"CDB",label:"CDB"},{value:"PAX",label:"PAX"}]}
              value={rolePref}
              onChange={v => !locked && setRolePref(v)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Pour ce voyage" icon="fa-route">
        {locked ? (
          <div style={{padding: "8px 10px", background:"#d8e6f3", border:"1px solid #b9d0e6", borderRadius: 4, marginBottom: 10, fontSize: 11, color: "var(--aero-blue-2)"}}>
            <i className="fa-solid fa-circle-info" style={{marginRight: 5}}/>
            Le <b>poids et les avions autorisés</b> ci-dessous ne s'appliquent qu'à <b>ce voyage</b> ; le profil global de l'utilisateur n'est pas modifié.
          </div>
        ) : null}
        <Field label={locked ? "Poids pour ce voyage" : "Poids"}
          hint={locked && voyageWeight !== basePerson.weightKg ? `Profil global : ${basePerson.weightKg} kg — surchargé ici à ${voyageWeight} kg` : "Pour le devis de masse"}>
          <div style={{display:"flex", alignItems:"center", gap: 8}}>
            <input type="number" className="input" min="20" max="200" style={{flex:1}}
              value={locked ? voyageWeight : globalWeight}
              onChange={e => locked ? setVoyageWeight(Number(e.target.value)) : setGlobalWeight(Number(e.target.value))} />
            <span style={{fontSize: 11, color:"var(--ink-3)"}} className="mono">kg</span>
            {locked && voyageWeight !== basePerson.weightKg ? (
              <button className="btn btn-sm btn-ghost" onClick={() => setVoyageWeight(basePerson.weightKg)} title="Revenir au poids du profil">
                <i className="fa-solid fa-rotate-left"/>
              </button>
            ) : null}
          </div>
        </Field>
        <div style={{marginTop: 14}}>
          <label style={{fontSize: 10, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-3)", fontWeight: 600, display:"block", marginBottom: 6}}>
            {locked ? "Avions autorisés pour ce voyage" : "Avions autorisés à bord"}
          </label>
          <ChipSelect options={acOptions}
            value={locked ? voyageAuth : globalAuth}
            onChange={v => locked ? setVoyageAuth(v) : setGlobalAuth(v)} />
          {locked && JSON.stringify(voyageAuth) !== JSON.stringify(basePerson.authorizedModels) ? (
            <div style={{fontSize: 10, color: "var(--aero-amber)", marginTop: 6, display:"flex", alignItems:"center", gap: 6}}>
              <i className="fa-solid fa-triangle-exclamation"/>
              Surchargé pour ce voyage. Profil global :
              <span>{basePerson.authorizedModels.map(m => window.AC_MODELS[m]?.icon || m).join(" · ") || "aucun"}</span>
              <button className="btn btn-sm btn-ghost" style={{marginLeft:"auto"}}
                onClick={() => setVoyageAuth(basePerson.authorizedModels)}>
                <i className="fa-solid fa-rotate-left"/> Réinitialiser
              </button>
            </div>
          ) : null}
        </div>
      </Section>
    </Drawer>
  );
}

window.VoyagePersonForm = VoyagePersonForm;
