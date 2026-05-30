import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import { useVoyages } from './api/voyages';
import { usePeople } from './api/people';
import { useAircraft, useAircraftModels } from './api/aircraft';
import {
  VOYAGES, PEOPLE, AIRCRAFT, AC_MODELS, AERODROMES, AEROCLUBS, USERS,
  voyagesForUser, aircraftForUser, aerodromesForUser, activeVariant,
  computeVoyage, computeFinance, adByIcao, acById, personById,
  userById, aeroclubById,
} from './data/mockData';
import { autoAssign } from './data/autoAssign';
import { apiFetch } from './api/client';
import { toApi as aerodromeToApi, useAerodromes } from './api/aerodromes';
import type { Voyage, Variant, Person, Aircraft as AircraftType, Aerodrome, PersonOverride, CrewAssignment, BagLoad } from './types';

import Login from './pages/Login';
import TopBar from './components/TopBar';
import VoyagesList from './pages/VoyagesList';
import VoyageDashboard from './pages/VoyageDashboard';
import VoyagePeople from './pages/VoyagePeople';
import VoyageFinance from './pages/VoyageFinance';
import VoyageRecap from './pages/VoyageRecap';
import AircraftPage from './pages/Aircraft';
import AerodromesPage from './pages/Aerodromes';
import TeamPage from './pages/Team';

import AerodromePicker from './components/popovers/AerodromePicker';
import CrewPicker from './components/popovers/CrewPicker';
import BagsPicker from './components/popovers/BagsStepper';
import FuelPicker from './components/popovers/FuelStepper';

import PersonForm from './components/drawers/PersonForm';
import VoyagePersonForm from './components/drawers/VoyagePersonForm';
import AircraftForm from './components/drawers/AircraftForm';
import AircraftModelForm from './components/drawers/AircraftModelForm';
import AerodromeForm from './components/drawers/AerodromeForm';

import VacModal from './components/VacModal';
import ShareDialog from './components/ShareDialog';
import NewVoyageDialog from './components/NewVoyageDialog';
import VoyageSettingsDialog from './components/VoyageSettingsDialog';
import UserMenu from './components/UserMenu';
import VoyageSubTabs from './components/VoyageSubTabs';

export default function App() {
  const { currentUser, setUser, logout } = useAuthStore();

  if (!currentUser) {
    return <Login onLogin={setUser} />;
  }

  return <AppShell currentUser={currentUser as NonNullable<typeof currentUser>} onLogout={logout} />;
}

function AppShell({ currentUser, onLogout }: { currentUser: import('./types').User; onLogout: () => void }) {
  const {
    tab, setTab,
    voyageSubTab, setVoyageSubTab,
    activeVoyageId, setActiveVoyageId,
    selectedLegIdx, setSelectedLegIdx,
    editor, setEditor,
    formEditor, setFormEditor,
    shareDialogId, setShareDialogId,
    settingsDialogId, setSettingsDialogId,
    newVoyageOpen, setNewVoyageOpen,
    vacIcao, setVacIcao,
    userMenuOpen, setUserMenuOpen,
  } = useUIStore();

  const queryClient = useQueryClient();

  // Local version counter to force re-renders on mock data mutations
  const [version, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  // Hydrate VOYAGES from API
  const { data: apiVoyages } = useVoyages();
  useEffect(() => {
    if (apiVoyages === undefined) return;
    VOYAGES.length = 0;
    apiVoyages.forEach(v => VOYAGES.push({
      ...(v as Voyage),
      aircraftIds: Array.isArray((v as Voyage).aircraftIds) ? (v as Voyage).aircraftIds : [],
      peopleIds: Array.isArray((v as Voyage).peopleIds) ? (v as Voyage).peopleIds : [],
      variants: (() => {
        const vo = (v as Voyage).variantOrder;
        const raw = ((v as Voyage).variants || []).map(va => ({
          ...va,
          crewsByLeg: Array.isArray(va.crewsByLeg) ? va.crewsByLeg : [],
          fuelLoadL: Array.isArray(va.fuelLoadL) ? va.fuelLoadL : [],
          bagsByLeg: Array.isArray(va.bagsByLeg) ? va.bagsByLeg : [],
          stopMin: Array.isArray(va.stopMin) ? va.stopMin : [],
          cruiseAltFt: Array.isArray(va.cruiseAltFt) ? va.cruiseAltFt : [],
          taxiOutMin: Array.isArray((va as any).taxiOutMin) ? (va as any).taxiOutMin : [],
          taxiInMin: Array.isArray((va as any).taxiInMin) ? (va as any).taxiInMin : [],
          personOverrides: va.personOverrides || {},
          waypoints: Array.isArray(va.waypoints) ? va.waypoints : [],
        }));
        if (vo && vo.length > 0) {
          return [...raw].sort((a, b) => {
            const ai = vo.indexOf(a.id); const bi = vo.indexOf(b.id);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });
        }
        return raw;
      })(),
    }));
    bump();
    // If the current activeVoyageId is no longer in the new data, reset to first
    if (!activeVoyageId || !VOYAGES.find(v => v.id === activeVoyageId)) {
      setActiveVoyageId(VOYAGES[0]?.id || null);
    }
  }, [apiVoyages]);

  // Hydrate PEOPLE from API
  const { data: apiPeople } = usePeople();
  useEffect(() => {
    if (apiPeople === undefined) return;
    PEOPLE.length = 0;
    apiPeople.forEach(p => PEOPLE.push(p));
    bump();
  }, [apiPeople]);

  // Hydrate AIRCRAFT from API
  const { data: apiAircraft } = useAircraft();
  useEffect(() => {
    if (apiAircraft === undefined) return;
    AIRCRAFT.length = 0;
    apiAircraft.forEach(a => AIRCRAFT.push(a));
    bump();
  }, [apiAircraft]);

  // Hydrate AC_MODELS from API
  const { data: apiAcModels } = useAircraftModels();
  useEffect(() => {
    if (apiAcModels === undefined) return;
    Object.keys(AC_MODELS).forEach(k => delete (AC_MODELS as Record<string, unknown>)[k]);
    Object.assign(AC_MODELS, apiAcModels);
    bump();
  }, [apiAcModels]);

  // Hydrate AERODROMES from API
  const { data: apiAerodromes } = useAerodromes();
  useEffect(() => {
    if (apiAerodromes === undefined) return;
    AERODROMES.length = 0;
    apiAerodromes.forEach(a => AERODROMES.push(a));
    bump();
  }, [apiAerodromes]);

  // Hydrate USERS (team) from API
  const { data: apiTeam } = useQuery<import('./types').User[]>({
    queryKey: ['team'],
    queryFn: () => apiFetch<import('./types').User[]>('/auth/team'),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (apiTeam === undefined) return;
    USERS.length = 0;
    apiTeam.forEach(u => USERS.push(u));
    bump();
  }, [apiTeam]);

  // Hydrate AEROCLUBS from currentUser.aeroclub
  useEffect(() => {
    if (!currentUser?.aeroclub) return;
    if (!AEROCLUBS.find(c => c.id === currentUser.aeroclub!.id)) {
      AEROCLUBS.push(currentUser.aeroclub!);
      bump();
    }
  }, [currentUser?.aeroclubId]);

  const visibleVoyages = useMemo(() => voyagesForUser(currentUser.id), [currentUser.id, version]);

  const voyage = useMemo(
    () => VOYAGES.find(v => v.id === activeVoyageId) || visibleVoyages[0] || null,
    [activeVoyageId, version],
  );

  const variant = useMemo(() => voyage ? activeVariant(voyage) : null, [voyage, version]);

  const { data: allAerodromes } = useAerodromes();

  const computed = useMemo(
    () => variant ? computeVoyage(variant, voyage?.aircraftIds || [], allAerodromes) : { legs: [], flightMin: 0, stopMin: 0, totalMin: 0, taxLandingTotal: 0, taxParkingTotal: 0, taxTotalEUR: 0 },
    [variant, voyage?.aircraftIds, version, allAerodromes],
  );
  const finance = useMemo(() => {
    if (!voyage) return { totals: { total: 0, flightCost: 0, taxesCost: 0, hours: 0, unassignedCost: 0 }, byPerson: {}, byAircraft: {}, items: [] };
    const results = voyage.variants.map(va => computeFinance(va, voyage.aircraftIds || [], allAerodromes));
    if (results.length === 0) return { totals: { total: 0, flightCost: 0, taxesCost: 0, hours: 0, unassignedCost: 0 }, byPerson: {}, byAircraft: {}, items: [] };
    // Merge all trajets
    const byPerson: typeof results[0]['byPerson'] = {};
    const byAircraft: typeof results[0]['byAircraft'] = {};
    for (const r of results) {
      for (const [pid, bill] of Object.entries(r.byPerson)) {
        if (!byPerson[pid]) byPerson[pid] = { ...bill, items: [...bill.items] };
        else { byPerson[pid].total += bill.total; byPerson[pid].hours += bill.hours; byPerson[pid].flightCost += bill.flightCost; byPerson[pid].taxesCost += bill.taxesCost; byPerson[pid].items.push(...bill.items); }
      }
      for (const [acId, bill] of Object.entries(r.byAircraft)) {
        if (!byAircraft[acId]) byAircraft[acId] = { ...bill };
        else { byAircraft[acId].total += bill.total; byAircraft[acId].hours += bill.hours; byAircraft[acId].flightCost += bill.flightCost; byAircraft[acId].taxesCost += bill.taxesCost; }
      }
    }
    return {
      items: results.flatMap(r => r.items),
      byPerson, byAircraft,
      totals: { total: results.reduce((s, r) => s + r.totals.total, 0), flightCost: results.reduce((s, r) => s + r.totals.flightCost, 0), taxesCost: results.reduce((s, r) => s + r.totals.taxesCost, 0), hours: results.reduce((s, r) => s + r.totals.hours, 0), unassignedCost: results.reduce((s, r) => s + r.totals.unassignedCost, 0) },
    };
  }, [voyage, allAerodromes, version]);

  // Initialise activeVoyageId if not set
  useEffect(() => {
    if (!activeVoyageId && visibleVoyages.length > 0) {
      setActiveVoyageId(visibleVoyages[0].id);
    }
  }, []);

  // Reset leg when voyage changes
  useEffect(() => { setSelectedLegIdx(0); }, [activeVoyageId]);

  // Clamp selected leg if route shrinks
  useEffect(() => {
    if (!variant) return;
    const maxIdx = variant.route.length - 2;
    if (selectedLegIdx > maxIdx) setSelectedLegIdx(Math.max(0, maxIdx));
  }, [variant?.route.length]);

  const selectedLeg = computed.legs[Math.min(selectedLegIdx, Math.max(0, computed.legs.length - 1))];

  // --- Mutation helpers on mock data ---
  function updateActiveVoyage(updater: (v: Voyage) => Voyage) {
    const idx = VOYAGES.findIndex(v => v.id === activeVoyageId);
    if (idx < 0) return;
    VOYAGES[idx] = updater(VOYAGES[idx]);
    bump();
  }
  function updateVoyage(id: string, updater: (v: Voyage) => Voyage) {
    const idx = VOYAGES.findIndex(v => v.id === id);
    if (idx < 0) return;
    VOYAGES[idx] = updater(VOYAGES[idx]);
    bump();
  }
  function updateActiveVariantFn(updater: (va: Variant) => Variant) {
    // Capture IDs before mutation (they won't change)
    const voyage = VOYAGES.find(v => v.id === activeVoyageId);
    const voyageId = voyage?.id;
    const variantId = voyage?.activeVariantId;

    let updatedVariant: Variant | undefined;
    updateActiveVoyage(v => ({
      ...v,
      variants: v.variants.map(va => {
        if (va.id === v.activeVariantId) {
          updatedVariant = updater(va);
          return updatedVariant;
        }
        return va;
      }),
    }));

    if (voyageId && variantId && updatedVariant) {
      apiFetch(`/voyages/${voyageId}/variants/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedVariant),
      }).catch(() => { /* silent fail — local state already updated */ });
    }
  }

  // Referentials CRUD
  async function savePerson(p: Partial<Person> & { id?: string }): Promise<Person> {
    let saved: Person | null = null;
    try {
      if (p.id) {
        saved = await apiFetch<Person>(`/people/${p.id}`, { method: 'PATCH', body: JSON.stringify(p) });
      } else {
        saved = await apiFetch<Person>('/people', { method: 'POST', body: JSON.stringify(p) });
      }
      queryClient.invalidateQueries({ queryKey: ['people'] });
    } catch {
      // ignore — globals updated below regardless
    }
    const full = (saved || { ...p, id: p.id || `p_${Date.now()}` }) as Person;
    const i = PEOPLE.findIndex(x => x.id === full.id);
    if (i >= 0) PEOPLE[i] = full; else PEOPLE.push(full);
    bump();
    return full;
  }
  function deletePerson(id: string) {
    const i = PEOPLE.findIndex(x => x.id === id);
    if (i >= 0) PEOPLE.splice(i, 1);
    bump();
  }
  function addPersonToVoyage(personId: string) {
    if (!voyage) return;
    if (voyage.peopleIds.includes(personId)) return;
    const newPeopleIds = [...voyage.peopleIds, personId];
    updateVoyage(voyage.id, v => ({ ...v, peopleIds: newPeopleIds }));
    apiFetch(`/voyages/${voyage.id}`, { method: 'PATCH', body: JSON.stringify({ peopleIds: newPeopleIds }) }).catch(() => {});
  }
  async function saveVoyagePerson(result: { kind: 'linked'; personId: string; override: PersonOverride } | { kind: 'standalone'; person: Person }) {
    if (result.kind === 'linked') {
      addPersonToVoyage(result.personId);
      updateActiveVariantFn(v => {
        const next = { ...(v.personOverrides || {}) };
        if (Object.keys(result.override).length === 0) {
          delete next[result.personId];
        } else {
          next[result.personId] = result.override;
        }
        return { ...v, personOverrides: next };
      });
    } else {
      const person = await savePerson(result.person);
      addPersonToVoyage(person.id);
    }
  }
  function removeFromVoyage(personId: string) {
    if (voyage) {
      const newPeopleIds = voyage.peopleIds.filter(id => id !== personId);
      updateVoyage(voyage.id, v => ({ ...v, peopleIds: newPeopleIds }));
      apiFetch(`/voyages/${voyage.id}`, { method: 'PATCH', body: JSON.stringify({ peopleIds: newPeopleIds }) }).catch(() => {});
    }
    updateActiveVariantFn(v => {
      const next = { ...(v.personOverrides || {}) };
      delete next[personId];
      const crewsByLeg = v.crewsByLeg.map(leg => {
        const copy: Record<string, CrewAssignment> = {};
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
  async function saveAircraft(ac: Partial<AircraftType> & { reg?: string }) {
    const full = { ...ac } as AircraftType;
    if (!full.aeroclubId) full.aeroclubId = currentUser.aeroclubId;
    try {
      if (ac.id) {
        // Existing aircraft — id is the Prisma PK (reg for seeded, cuid for new)
        await apiFetch(`/aircraft/${ac.id}`, { method: 'PATCH', body: JSON.stringify({ ...full, modelId: full.model }) });
      } else {
        await apiFetch('/aircraft', { method: 'POST', body: JSON.stringify({ ...full, modelId: full.model }) });
      }
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    } catch {
      // ignore — globals updated below regardless
    }
    // Always keep globals in sync so computeLeg reads fresh data
    const i = AIRCRAFT.findIndex(x => x.id === full.id);
    if (i >= 0) AIRCRAFT[i] = full; else AIRCRAFT.push(full);
    updateActiveVoyage(v => ({
      ...v,
      variants: v.variants.map(va => ({
        ...va,
        crewsByLeg: va.crewsByLeg.map(leg => leg[full.id] ? leg : { ...leg, [full.id]: { cdb: null, pax: [] } }),
        fuelLoadL: va.fuelLoadL.map(leg => leg[full.id] != null ? leg : { ...leg, [full.id]: AC_MODELS[full.model]?.fuelCapL || 80 }),
        bagsByLeg: va.bagsByLeg.map(leg => leg[full.id] ? leg : { ...leg, [full.id]: { count: 0, unitKg: 12 } }),
      })),
    }));
    bump();
  }
  function deleteAircraft(id: string) {
    const i = AIRCRAFT.findIndex(x => x.id === id);
    if (i >= 0) AIRCRAFT.splice(i, 1);
    bump();
  }
  async function saveAircraftModel(key: string, model: object, isNew: boolean) {
    try {
      if (!isNew) {
        // Update: key is the Prisma ID (seeded models use key as ID)
        await apiFetch(`/aircraft-models/${key}`, { method: 'PATCH', body: JSON.stringify(model) });
      } else {
        // Create: POST to collection URL, send key as `id` in body
        await apiFetch('/aircraft-models', { method: 'POST', body: JSON.stringify({ id: key, ...model }) });
      }
      queryClient.invalidateQueries({ queryKey: ['aircraft-models'] });
    } catch {
      // ignore — globals updated below regardless
    }
    // Always keep globals in sync so computeLeg reads fresh data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AC_MODELS as any)[key] = model;
    bump();
  }
  function deleteAircraftModel(key: string) {
    delete AC_MODELS[key as keyof typeof AC_MODELS];
    bump();
  }
  async function saveAerodrome(ad: Partial<Aerodrome> & { __isNew?: boolean }) {
    const { __isNew, ...rest } = ad;
    const full = { ...rest } as Aerodrome;
    try {
      if (!__isNew && full.icao) {
        await apiFetch(`/aerodromes/${full.icao}`, { method: 'PATCH', body: JSON.stringify(aerodromeToApi(full)) });
      } else {
        await apiFetch('/aerodromes', { method: 'POST', body: JSON.stringify(aerodromeToApi(full)) });
      }
      queryClient.invalidateQueries({ queryKey: ['aerodromes'] });
    } catch {
      // fallback: update mock data for offline/no-backend mode
      const i = AERODROMES.findIndex(x => x.icao === full.icao);
      if (i >= 0) AERODROMES[i] = full; else AERODROMES.push(full);
      bump();
    }
  }
  function deleteAerodrome(icao: string) {
    const i = AERODROMES.findIndex(x => x.icao === icao);
    if (i >= 0) AERODROMES.splice(i, 1);
    bump();
  }

  // Variant management
  function selectVariant(id: string) {
    updateActiveVoyage(v => ({ ...v, activeVariantId: id }));
    apiFetch(`/voyages/${activeVoyageId}`, { method: 'PATCH', body: JSON.stringify({ activeVariantId: id }) }).catch(() => {});
  }
  function duplicateVariant() {
    let nextId = 'A';
    updateActiveVoyage(v => {
      const src = v.variants.find(x => x.id === v.activeVariantId)!;
      const usedIds = new Set(v.variants.map(x => x.id));
      for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (!usedIds.has(c)) { nextId = c; break; } }
      const copy = JSON.parse(JSON.stringify(src)) as Variant;
      copy.id = nextId; copy.label = `Plan ${nextId} — copie`; copy.tag = 'alt';
      return { ...v, variants: [...v.variants, copy], activeVariantId: nextId };
    });
    // POST the new copy to the API
    const newVariant = VOYAGES.find(v => v.id === activeVoyageId)?.variants.find(va => va.id === nextId);
    if (newVariant) {
      apiFetch(`/voyages/${activeVoyageId}/variants`, { method: 'POST', body: JSON.stringify(newVariant) }).catch(() => {});
    }
  }
  function deleteVariant(id: string) {
    updateActiveVoyage(v => {
      if (v.variants.length <= 1) return v;
      const remaining = v.variants.filter(x => x.id !== id);
      const active = v.activeVariantId === id ? remaining[0].id : v.activeVariantId;
      return { ...v, variants: remaining, activeVariantId: active };
    });
    apiFetch(`/voyages/${activeVoyageId}/variants/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  function renameVariant(id: string, label: string) {
    updateActiveVoyage(v => ({ ...v, variants: v.variants.map(x => x.id === id ? { ...x, label } : x) }));
    apiFetch(`/voyages/${activeVoyageId}/variants/${id}`, { method: 'PATCH', body: JSON.stringify({ label }) }).catch(() => {});
  }
  function reorderVariants(orderedIds: string[]) {
    updateActiveVoyage(v => ({
      ...v,
      variantOrder: orderedIds,
      variants: orderedIds.map(id => v.variants.find(x => x.id === id)!).filter(Boolean),
    }));
    apiFetch(`/voyages/${activeVoyageId}`, { method: 'PATCH', body: JSON.stringify({ variantOrder: orderedIds }) }).catch(() => {});
  }

  // Leg / crew / bags / fuel editing
  function replaceLegEndpoint(legIdx: number, which: 'from' | 'to', newIcao: string) {
    updateActiveVariantFn(v => {
      const route = [...v.route];
      route[which === 'from' ? legIdx : legIdx + 1] = newIcao;
      return { ...v, route };
    });
  }
  function setDepartureTime(time: string) {
    updateActiveVariantFn(v => ({ ...v, departureTime: time || undefined }));
  }
  function insertAerodrome(afterLegIdx: number, icao: string) {
    // New waypoint inserted AFTER the destination of the current leg.
    // Example: route [A, B, C], leg 0 = A→B → inserts X → [A, B, X, C].
    updateActiveVariantFn(v => {
      const waypointAt = afterLegIdx + 2; // after the 'to' waypoint
      const newLegAt = afterLegIdx + 1;   // index in per-leg arrays
      const srcLeg = afterLegIdx + 1;     // copy properties from the leg that follows

      const route = [...v.route];
      route.splice(waypointAt, 0, icao);

      const stopMin = [...v.stopMin];
      stopMin.splice(waypointAt, 0, 30);

      const cruiseAltFt = [...v.cruiseAltFt];
      cruiseAltFt.splice(newLegAt, 0, cruiseAltFt[srcLeg] ?? cruiseAltFt[afterLegIdx] ?? 3500);

      const taxiOutMin = [...(v.taxiOutMin || [])];
      taxiOutMin.splice(newLegAt, 0, taxiOutMin[srcLeg] ?? taxiOutMin[afterLegIdx] ?? 10);
      const taxiInMin = [...(v.taxiInMin || [])];
      taxiInMin.splice(newLegAt, 0, taxiInMin[srcLeg] ?? taxiInMin[afterLegIdx] ?? 10);

      const crewsByLeg = [...v.crewsByLeg];
      crewsByLeg.splice(newLegAt, 0, { ...(crewsByLeg[srcLeg] ?? crewsByLeg[afterLegIdx] ?? {}) });

      const fuelLoadL = [...v.fuelLoadL];
      fuelLoadL.splice(newLegAt, 0, { ...(fuelLoadL[srcLeg] ?? fuelLoadL[afterLegIdx] ?? {}) });

      const bagsByLeg = [...v.bagsByLeg];
      bagsByLeg.splice(newLegAt, 0, { ...(bagsByLeg[srcLeg] ?? bagsByLeg[afterLegIdx] ?? {}) });

      return { ...v, route, stopMin, cruiseAltFt, taxiOutMin, taxiInMin, crewsByLeg, fuelLoadL, bagsByLeg };
    });
  }
  function splitLeg(legIdx: number, icao: string) {
    updateActiveVariantFn(v => {
      const insertAt = legIdx + 1;
      const route = [...v.route];
      route.splice(insertAt, 0, icao);
      const stopMin = [...v.stopMin];
      stopMin.splice(insertAt, 0, null);
      const cruiseAltFt = [...v.cruiseAltFt];
      cruiseAltFt.splice(insertAt, 0, cruiseAltFt[legIdx] ?? 3500);
      const taxiOutMin = [...(v.taxiOutMin || [])];
      taxiOutMin.splice(insertAt, 0, taxiOutMin[legIdx] ?? 10);
      const taxiInMin = [...(v.taxiInMin || [])];
      taxiInMin.splice(insertAt, 0, taxiInMin[legIdx] ?? 10);
      const crewsByLeg = [...v.crewsByLeg];
      crewsByLeg.splice(insertAt, 0, { ...(crewsByLeg[legIdx] ?? {}) });
      const fuelLoadL = [...v.fuelLoadL];
      fuelLoadL.splice(insertAt, 0, { ...(fuelLoadL[legIdx] ?? {}) });
      const bagsByLeg = [...v.bagsByLeg];
      bagsByLeg.splice(insertAt, 0, { ...(bagsByLeg[legIdx] ?? {}) });
      const waypoints = [...(v.waypoints ?? [])];
      waypoints[legIdx] = [];
      waypoints.splice(insertAt, 0, []);
      return { ...v, route, stopMin, cruiseAltFt, taxiOutMin, taxiInMin, crewsByLeg, fuelLoadL, bagsByLeg, waypoints };
    });
  }
  function setWaypoints(legIdx: number, wps: [number, number][]) {
    updateActiveVariantFn(v => {
      const numLegs = v.route.length - 1;
      const padded = Array.from({ length: numLegs }, (_, i) => v.waypoints?.[i] ?? []);
      padded[legIdx] = wps;
      return { ...v, waypoints: padded };
    });
  }
  function deleteLeg(legIdx: number) {
    updateActiveVariantFn(v => {
      if (v.route.length <= 2) return v;
      const routePointIdx = legIdx + 1;
      return {
        ...v,
        route: v.route.filter((_, i) => i !== routePointIdx),
        stopMin: v.stopMin.filter((_, i) => i !== routePointIdx),
        cruiseAltFt: v.cruiseAltFt.filter((_, i) => i !== legIdx),
        taxiOutMin: (v.taxiOutMin || []).filter((_, i) => i !== legIdx),
        taxiInMin: (v.taxiInMin || []).filter((_, i) => i !== legIdx),
        crewsByLeg: v.crewsByLeg.filter((_, i) => i !== legIdx),
        fuelLoadL: v.fuelLoadL.filter((_, i) => i !== legIdx),
        bagsByLeg: v.bagsByLeg.filter((_, i) => i !== legIdx),
        waypoints: (v.waypoints ?? []).filter((_, i) => i !== legIdx),
      };
    });
  }
  function reverseRoute() {
    updateActiveVariantFn(v => {
      const route = [...v.route].reverse();
      const stopMin = [...v.stopMin].reverse();
      const cruiseAltFt = [...v.cruiseAltFt].reverse();
      const crewsByLeg = [...v.crewsByLeg].reverse();
      const fuelLoadL = [...v.fuelLoadL].reverse();
      const bagsByLeg = [...v.bagsByLeg].reverse();
      // Swap taxi out↔in and reverse order
      const taxiOutMin = [...(v.taxiInMin || [])].reverse();
      const taxiInMin  = [...(v.taxiOutMin || [])].reverse();
      // Reverse waypoints order and direction within each leg
      const waypoints = [...(v.waypoints || [])].reverse().map(wps => [...wps].reverse());
      return { ...v, route, stopMin, cruiseAltFt, crewsByLeg, fuelLoadL, bagsByLeg, taxiOutMin, taxiInMin, waypoints };
    });
  }
  function setStopMin(routeIdx: number, mins: number | null) {
    updateActiveVariantFn(v => {
      const stopMin = [...v.stopMin]; stopMin[routeIdx] = mins;
      return { ...v, stopMin };
    });
  }
  function setCruiseAlt(legIdx: number, alt: number) {
    updateActiveVariantFn(v => {
      const cruiseAltFt = [...v.cruiseAltFt];
      cruiseAltFt[legIdx] = Math.max(500, alt);
      return { ...v, cruiseAltFt };
    });
  }
  function setTaxiTimes(legIdx: number, taxiOut: number, taxiIn: number) {
    updateActiveVariantFn(v => {
      const numLegs = v.route.length - 1;
      const taxiOutMin = Array.from({ length: numLegs }, (_, i) => v.taxiOutMin?.[i] ?? 10);
      const taxiInMin  = Array.from({ length: numLegs }, (_, i) => v.taxiInMin?.[i]  ?? 10);
      taxiOutMin[legIdx] = taxiOut;
      taxiInMin[legIdx]  = taxiIn;
      return { ...v, taxiOutMin, taxiInMin };
    });
  }
  function runAutoAssign() {
    if (!voyage || !variant) return;
    const { crewsByLeg, fuelLoadL, warnings } = autoAssign(voyage, variant, allAerodromes);
    updateActiveVariantFn(v => ({ ...v, crewsByLeg, fuelLoadL }));
    if (warnings.length > 0) {
      alert('Répartition appliquée avec avertissements :\n\n' + warnings.map(w => '• ' + w).join('\n'));
    }
  }
  function setCrew(legIdx: number, acId: string, newCrew: CrewAssignment) {
    updateActiveVariantFn(v => {
      const numLegs = v.route.length - 1;
      const padded = Array.from({ length: numLegs }, (_, i) => v.crewsByLeg[i] || {});
      return {
        ...v,
        crewsByLeg: padded.map((leg, i) => {
          if (i !== legIdx) return leg;
          const claimed = new Set<string>([
            ...(newCrew.cdb ? [newCrew.cdb] : []),
            ...newCrew.pax,
          ]);
          const result: Record<string, import('./types').CrewAssignment> = { ...leg, [acId]: newCrew };
          for (const otherId of Object.keys(result)) {
            if (otherId === acId) continue;
            const other = result[otherId];
            result[otherId] = {
              cdb: other.cdb && claimed.has(other.cdb) ? null : other.cdb,
              pax: other.pax.filter(pid => !claimed.has(pid)),
            };
          }
          return result;
        }),
      };
    });
  }
  function setBags(legIdx: number, acId: string, newBag: BagLoad) {
    updateActiveVariantFn(v => {
      const numLegs = v.route.length - 1;
      const padded = Array.from({ length: numLegs }, (_, i) => v.bagsByLeg[i] || {});
      return { ...v, bagsByLeg: padded.map((leg, i) => i === legIdx ? { ...leg, [acId]: newBag } : leg) };
    });
  }
  function setFuel(legIdx: number, acId: string, newFuelL: number) {
    updateActiveVariantFn(v => {
      const numLegs = v.route.length - 1;
      const padded = Array.from({ length: numLegs }, (_, i) => v.fuelLoadL[i] || {});
      return { ...v, fuelLoadL: padded.map((leg, i) => i === legIdx ? { ...leg, [acId]: newFuelL } : leg) };
    });
  }

  // Voyage CRUD
  function updateSharedWith(voyageId: string, sharedIds: string[]) {
    updateVoyage(voyageId, v => ({ ...v, sharedWith: sharedIds }));
    apiFetch(`/voyages/${voyageId}`, { method: 'PATCH', body: JSON.stringify({ sharedWith: sharedIds }) }).catch(() => {});
  }
  async function createVoyage(newV: Voyage) {
    // Optimistic local insert for instant UI response
    VOYAGES.unshift(newV);
    setActiveVoyageId(newV.id);
    setTab('voyage');
    bump();

    try {
      // 1. Create voyage in backend
      const saved = await apiFetch<{ id: string; activeVariantId?: string }>('/voyages', {
        method: 'POST',
        body: JSON.stringify({ title: newV.title, date: newV.date, status: newV.status }),
      });

      // 2. Create the initial variant
      const v0 = newV.variants[0];
      const savedVariant = await apiFetch<{ id: string }>(`/voyages/${saved.id}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          label: v0.label, weather: v0.weather, tag: v0.tag,
          route: v0.route, stopMin: v0.stopMin, cruiseAltFt: v0.cruiseAltFt,
          crewsByLeg: v0.crewsByLeg, fuelLoadL: v0.fuelLoadL, bagsByLeg: v0.bagsByLeg,
          personOverrides: v0.personOverrides || {},
        }),
      });

      // 3. Save aircraft IDs
      if (newV.aircraftIds.length > 0) {
        await apiFetch(`/voyages/${saved.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ aircraftIds: newV.aircraftIds }),
        });
      }

      // 4. Replace local voyage with real backend IDs
      const idx = VOYAGES.findIndex(v => v.id === newV.id);
      if (idx >= 0) {
        VOYAGES[idx] = {
          ...newV,
          id: saved.id,
          activeVariantId: savedVariant.id,
          variants: [{ ...v0, id: savedVariant.id }],
        };
      }
      setActiveVoyageId(saved.id);
      queryClient.invalidateQueries({ queryKey: ['voyages'] });
      bump();
    } catch (e) {
      console.error('createVoyage: backend save failed', e);
    }
  }
  function deleteVoyageById(id: string) {
    const idx = VOYAGES.findIndex(v => v.id === id);
    if (idx < 0) return;
    VOYAGES.splice(idx, 1);
    if (id === activeVoyageId) {
      const remaining = voyagesForUser(currentUser.id);
      setActiveVoyageId(remaining[0]?.id || null);
      setTab('voyages');
    }
    bump();
  }
  function syncVariantCrewsToAircraft(va: Variant, aircraftIds: string[]): Variant {
    const numLegs = va.route.length - 1;
    const crewsByLeg = Array.from({ length: numLegs }, (_, i) => {
      const leg: Record<string, import('./types').CrewAssignment> = {};
      aircraftIds.forEach(acId => {
        leg[acId] = (va.crewsByLeg[i] && va.crewsByLeg[i][acId]) || { cdb: null, pax: [] };
      });
      // Preserve entries for aircraft not in the new list that are still in crewsByLeg (we drop them)
      return leg;
    });
    const fuelLoadL = Array.from({ length: numLegs }, (_, i) => {
      const leg: Record<string, number> = {};
      aircraftIds.forEach(acId => {
        leg[acId] = (va.fuelLoadL[i] && va.fuelLoadL[i][acId] != null) ? va.fuelLoadL[i][acId] : (AC_MODELS[acById(acId)?.model || '']?.fuelCapL || 80);
      });
      return leg;
    });
    const bagsByLeg = Array.from({ length: numLegs }, (_, i) => {
      const leg: Record<string, import('./types').BagLoad> = {};
      aircraftIds.forEach(acId => {
        leg[acId] = (va.bagsByLeg[i] && va.bagsByLeg[i][acId]) || { count: 0, unitKg: 12 };
      });
      return leg;
    });
    return { ...va, crewsByLeg, fuelLoadL, bagsByLeg };
  }

  function saveVoyageSettings(id: string, patch: Partial<Voyage>) {
    if (patch.aircraftIds) {
      updateVoyage(id, v => ({
        ...v,
        ...patch,
        variants: v.variants.map(va => syncVariantCrewsToAircraft(va, patch.aircraftIds!)),
      }));
      // Persist aircraft list (and any other top-level fields) to API
      const { aircraftIds: _ac, ...restPatch } = patch;
      const apiPatch = { ...restPatch, aircraftIds: patch.aircraftIds };
      apiFetch(`/voyages/${id}`, { method: 'PATCH', body: JSON.stringify(apiPatch) }).catch(() => {});
      const updatedVoyage = VOYAGES.find(v => v.id === id);
      if (updatedVoyage) {
        updatedVoyage.variants.forEach(va => {
          apiFetch(`/voyages/${id}/variants/${va.id}`, {
            method: 'PATCH',
            body: JSON.stringify(va),
          }).catch(() => {});
        });
      }
    } else {
      updateVoyage(id, v => ({ ...v, ...patch }));
      apiFetch(`/voyages/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => {});
    }
  }

  function handleSelectAerodrome(icao: string) {
    if (!variant) return;
    const idx = variant.route.indexOf(icao);
    if (idx === -1) return;
    setSelectedLegIdx(idx === variant.route.length - 1 ? idx - 1 : idx);
  }

  const shareVoyage = shareDialogId ? VOYAGES.find(v => v.id === shareDialogId) || null : null;

  return (
    <div className="app">
      <TopBar
        tab={tab} onTab={setTab}
        voyage={voyage}
        currentUser={currentUser}
        onUserMenu={() => setUserMenuOpen(true)}
        version={version}
      />
      <div className="viewport">
        {tab === 'voyages' ? (
          <VoyagesList
            currentUser={currentUser}
            activeVoyageId={activeVoyageId}
            onOpenVoyage={(id) => { setActiveVoyageId(id); setTab('voyage'); }}
            onShare={(v) => setShareDialogId(v.id)}
            onNew={() => setNewVoyageOpen(true)}
            version={version}
          />
        ) : tab === 'voyage' && variant ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <VoyageSubTabs
              subTab={voyageSubTab}
              onSubTab={setVoyageSubTab}
              voyage={voyage!}
              variant={variant}
              computed={computed}
              finance={finance}
            />
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {voyageSubTab === 'map' ? (
                <VoyageDashboard
                  voyage={voyage!} variant={variant} computed={computed}
                  selectedLeg={selectedLeg}
                  selectedLegIdx={Math.min(selectedLegIdx, Math.max(0, computed.legs.length - 1))}
                  onSelectLeg={setSelectedLegIdx}
                  handleSelectAerodrome={handleSelectAerodrome}
                  setVacIcao={setVacIcao}
                  onReplaceLeg={(legIdx, which, anchor) => setEditor({ kind: 'aerodrome', legIdx, which, anchor })}
                  onCrewEdit={(ac, legIdx, anchor) => setEditor({ kind: 'crew', ac, legIdx, anchor })}
                  onBagsEdit={(ac, legIdx, anchor) => setEditor({ kind: 'bags', ac, legIdx, anchor })}
                  onFuelEdit={(ac, legIdx, anchor) => setEditor({ kind: 'fuel', ac, legIdx, anchor })}
                  onVariantSelect={selectVariant}
                  onVariantDuplicate={duplicateVariant}
                  onVariantDelete={deleteVariant}
                  onVariantRename={renameVariant}
                  onVariantReorder={reorderVariants}
                  onStopMinChange={setStopMin}
                  onTaxiChange={setTaxiTimes}
                  onAltChange={setCruiseAlt}
                  onAutoAssign={runAutoAssign}
                  onDeleteLeg={deleteLeg}
                  onDepartureTimeChange={setDepartureTime}
                  onWaypointsChange={setWaypoints}
                  onSplitLeg={splitLeg}
                  onReverseRoute={reverseRoute}
                  onAddStop={(legIdx, anchor) => setEditor({ kind: 'split', legIdx, anchor })}
                  onShare={() => setShareDialogId(voyage!.id)}
                  onSettings={() => setSettingsDialogId(voyage!.id)}
                  onRenameVoyage={(id, title) => saveVoyageSettings(id, { title })}
                  currentUser={currentUser}
                />
              ) : voyageSubTab === 'people' ? (
                <VoyagePeople
                  voyage={voyage!} variant={variant} computed={computed} finance={finance} version={version}
                  onAddPerson={() => setFormEditor({ kind: 'voyagePerson', payload: { first: '', last: '', weightKg: 75, license: '', authorizedModels: [], rolePref: 'PAX' } })}
                  onEditPerson={(p) => setFormEditor({ kind: 'voyagePerson', payload: p })}
                  onRemoveFromVoyage={removeFromVoyage}
                />
              ) : voyageSubTab === 'finance' ? (
                <VoyageFinance variant={variant} finance={finance} />
              ) : voyageSubTab === 'recap' ? (
                <VoyageRecap voyage={voyage!} variant={variant} computed={computed} />
              ) : null}
            </div>
          </div>
        ) : tab === 'aircraft' ? (
          <AircraftPage
            currentUser={currentUser}
            onAddAircraft={() => setFormEditor({ kind: 'aircraft', payload: { reg: '', callsign: '', color: 'var(--plane-1)', model: Object.keys(AC_MODELS)[0], aeroclubId: currentUser.aeroclubId, notes: '' } })}
            onEditAircraft={(ac) => setFormEditor({ kind: 'aircraft', payload: ac })}
            onAddModel={() => setFormEditor({ kind: 'model', payload: { modelKey: '', model: { label: '', type: '', fuelType: '100LL', seats: 4, cruiseKt: 100, burnLh: 20, fuelCapL: 100, mtowKg: 1000, mldwKg: 1000, minRunwayM: 500, hourlyEUR: 150, icon: '' } } })}
            onEditModel={(key, model) => setFormEditor({ kind: 'model', payload: { modelKey: key, model } })}
            version={version}
          />
        ) : tab === 'team' ? (
          <TeamPage currentUser={currentUser}/>
        ) : (
          <AerodromesPage
            onOpenVAC={setVacIcao}
            currentUser={currentUser}
            onAdd={() => setFormEditor({ kind: 'aerodrome', payload: { __isNew: true, icao: '', name: '', city: '', coord: [2, 46], elevation: 0, runways: [{ qfu: '', lengthM: 1000, surface: 'Revêtue' }], fuel: ['100LL'], night: false, ppr: false, atc: 'Aucun', taxLandingEUR: 0, taxParkingEUR: 0, note: '' } })}
            onEdit={(ad) => setFormEditor({ kind: 'aerodrome', payload: ad })}
            version={version}
          />
        )}
      </div>

      {/* User Menu */}
      {userMenuOpen && (
        <UserMenu
          currentUser={currentUser}
          onClose={() => setUserMenuOpen(false)}
          onLogout={onLogout}
        />
      )}

      {/* Form drawers */}
      {formEditor?.kind === 'person' && (
        <PersonForm person={formEditor.payload}
          onClose={() => setFormEditor(null)}
          onSave={savePerson}
          onDelete={() => { deletePerson(formEditor.payload.id!); setFormEditor(null); }} />
      )}
      {formEditor?.kind === 'voyagePerson' && variant && (
        <VoyagePersonForm person={formEditor.payload} variant={variant}
          onClose={() => setFormEditor(null)}
          onSave={saveVoyagePerson}
          onDelete={() => { if (formEditor.payload.id) { removeFromVoyage(formEditor.payload.id); } setFormEditor(null); }} />
      )}
      {formEditor?.kind === 'aircraft' && (
        <AircraftForm aircraft={formEditor.payload}
          onClose={() => setFormEditor(null)}
          onSave={saveAircraft}
          onDelete={() => { deleteAircraft(formEditor.payload.id!); setFormEditor(null); }} />
      )}
      {formEditor?.kind === 'model' && (
        <AircraftModelForm modelKey={formEditor.payload.modelKey} model={formEditor.payload.model}
          onClose={() => setFormEditor(null)}
          onSave={saveAircraftModel}
          onDelete={() => { deleteAircraftModel(formEditor.payload.modelKey); setFormEditor(null); }} />
      )}
      {formEditor?.kind === 'aerodrome' && (
        <AerodromeForm aerodrome={formEditor.payload}
          onClose={() => setFormEditor(null)}
          onSave={saveAerodrome}
          onDelete={() => { if (formEditor.payload.icao) { deleteAerodrome(formEditor.payload.icao); } setFormEditor(null); }} />
      )}

      {/* Share dialog */}
      {shareVoyage && (
        <ShareDialog voyage={shareVoyage} currentUser={currentUser}
          onClose={() => setShareDialogId(null)}
          onUpdate={updateSharedWith} />
      )}

      {/* New voyage */}
      {newVoyageOpen && (
        <NewVoyageDialog currentUser={currentUser}
          onClose={() => setNewVoyageOpen(false)}
          onCreate={createVoyage} />
      )}

      {/* Voyage settings */}
      {settingsDialogId && (() => {
        const v = VOYAGES.find(x => x.id === settingsDialogId);
        return v ? (
          <VoyageSettingsDialog voyage={v} currentUser={currentUser}
            onClose={() => setSettingsDialogId(null)}
            onSave={saveVoyageSettings}
            onDelete={deleteVoyageById} />
        ) : null;
      })()}

      {/* Editor popovers */}
      {editor?.kind === 'aerodrome' && variant && (
        <AerodromePicker
          anchor={editor.anchor}
          currentIcao={editor.which === 'from' ? variant.route[editor.legIdx] : variant.route[editor.legIdx + 1]}
          label={editor.which === 'from' ? "Aérodrome de départ" : "Aérodrome d'arrivée"}
          onPick={(icao) => { replaceLegEndpoint(editor.legIdx, editor.which, icao); setEditor(null); }}
          onClose={() => setEditor(null)} />
      )}
      {editor?.kind === 'split' && variant && (
        <AerodromePicker
          anchor={editor.anchor}
          currentIcao=""
          label="Escale — choisir l'aérodrome"
          onPick={(icao) => { splitLeg(editor.legIdx, icao); setEditor(null); }}
          onClose={() => setEditor(null)} />
      )}
      {editor?.kind === 'crew' && variant && (
        <CrewPicker
          anchor={editor.anchor} ac={editor.ac} legIdx={editor.legIdx} variant={variant}
          voyagePeopleIds={voyage?.peopleIds || []}
          onChange={(crew) => { setCrew(editor.legIdx, editor.ac.id, crew); }}
          onClose={() => setEditor(null)} />
      )}
      {editor?.kind === 'bags' && variant && (
        <BagsPicker
          anchor={editor.anchor} ac={editor.ac}
          bag={variant.bagsByLeg[editor.legIdx]?.[editor.ac.id] || { count: 0, unitKg: 12 }}
          onChange={(bag: import('./types').BagLoad) => { setBags(editor.legIdx, editor.ac.id, bag); }}
          onClose={() => setEditor(null)} />
      )}
      {editor?.kind === 'fuel' && variant && (
        <FuelPicker
          anchor={editor.anchor} ac={editor.ac}
          fuelL={variant.fuelLoadL[editor.legIdx]?.[editor.ac.id] || 0}
          fuelCapL={AC_MODELS[editor.ac.model]?.fuelCapL || 100}
          onChange={(fuelL: number) => { setFuel(editor.legIdx, editor.ac.id, fuelL); }}
          onClose={() => setEditor(null)} />
      )}

      {/* VAC modal */}
      {vacIcao && (
        <VacModal
          icao={vacIcao}
          onClose={() => setVacIcao(null)}
          onAddLeg={variant ? () => { insertAerodrome(selectedLegIdx, vacIcao); setSelectedLegIdx(selectedLegIdx + 1); setVacIcao(null); } : undefined}
          currentLegTo={variant?.route[selectedLegIdx + 1]}
        />
      )}
    </div>
  );
}
