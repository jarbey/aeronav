// AeroNav — TypeScript interfaces matching data.js structures

export interface Aeroclub {
  id: string;
  name: string;
  code: string;
  city: string;
  color: string;
  base: string;
}

export interface User {
  id: string;
  first: string;
  last: string;
  email: string;
  aeroclubId: string;
  provider: string;
  personId: string | null;
  role: string;
  aeroclub?: Aeroclub;
}

export interface Person {
  id: string;
  first: string;
  last: string;
  weightKg: number;
  license: string;
  authorizedModels: string[];
  rolePref: 'CDB' | 'PAX';
}

export interface PersonEffective extends Person {
  _hasOverride: boolean;
  _override: PersonOverride;
}

export interface AircraftModel {
  id: string;
  label: string;
  type: string;
  fuelType: string;
  seats: number;
  cruiseKt: number;
  burnLh: number;
  fuelCapL: number;
  mtowKg: number;
  mldwKg: number;
  minRunwayM: number;
  hourlyEUR: number;
  icon: string;
}

export interface Aircraft {
  id: string;
  model: string;
  reg: string;
  color: string;
  callsign: string;
  aeroclubId: string;
  massEmptyKg: number;
  notes: string;
}

export interface Runway {
  qfu: string;
  lengthM: number;
  surface: string;
}

export interface FuelAvailability {
  h24: boolean;
  schedule?: string;
}

export interface Aerodrome {
  icao: string;
  name: string;
  city: string;
  coord: [number, number]; // [lng, lat]
  elevation: number;
  runways: Runway[];
  fuel: string[];
  fuelSchedule?: Record<string, FuelAvailability> | null;
  night: boolean;
  ppr: boolean;
  atc: string;
  taxLandingEUR: number;
  taxParkingEUR: number;
  note: string;
}

export interface CrewAssignment {
  cdb: string | null;
  pax: string[];
}

export interface BagLoad {
  count: number;
  unitKg: number;
}

export type CrewsByLeg = Record<string, CrewAssignment>[];
export type FuelLoadByLeg = Record<string, number>[];
export type BagsByLeg = Record<string, BagLoad>[];

export interface PersonOverride {
  weightKg?: number;
  authorizedModels?: string[];
}

export interface Variant {
  id: string;
  label: string;
  weather: string;
  tag: string;
  route: string[];
  stopMin: (number | null)[];
  cruiseAltFt: number[];
  taxiOutMin: number[];
  taxiInMin: number[];
  crewsByLeg: CrewsByLeg;
  fuelLoadL: FuelLoadByLeg;
  bagsByLeg: BagsByLeg;
  personOverrides?: Record<string, PersonOverride>;
  departureTime?: string; // "HH:MM"
  waypoints?: [number, number][][]; // waypoints[legIdx] = [[lng, lat], ...]
}

export interface Voyage {
  id: string;
  title: string;
  date: string;
  aeroclubId: string;
  ownerId: string;
  sharedWith: string[];
  status: 'draft' | 'planning' | 'ongoing' | 'completed';
  activeVariantId: string;
  variants: Variant[];
  aircraftIds: string[];
  peopleIds: string[];
}

// Calculation output types
export interface AircraftLegResult {
  durHr: number;
  durMin: number;
  burnL: number;
  fuelLeftL: number;
  tow: number;
  ldw: number;
  peopleMass: number;
  bagMass: number;
  fuelKg: number;
  fuelLDestKg: number;
  mtow: number;
  mtowExceeded: boolean;
  mldw: number;
  mldwExceeded: boolean;
  fuelOK: boolean;
  fuelReserve: number;
  compatRunway: boolean;
  compatFuel: boolean;
  cdbOK: boolean;
  paxOK: boolean;
  crew: CrewAssignment;
  peopleIds: string[];
  bag: BagLoad;
}

export interface LegResult {
  fromIcao: string;
  toIcao: string;
  from: Aerodrome;
  to: Aerodrome;
  distance: number;
  bearing: number;
  perAc: Record<string, AircraftLegResult>;
}

export interface VoyageResult {
  legs: LegResult[];
  flightMin: number;
  stopMin: number;
  totalMin: number;
  taxLandingTotal: number;
  taxParkingTotal: number;
  taxTotalEUR: number;
}

export interface FinanceItem {
  legIdx: number;
  acId: string;
  personId: string | null;
  hours: number;
  hourlyEUR: number;
  flightCost: number;
  landingTax: number;
  parkingTax: number;
  total: number;
  from: string;
  to: string;
  durMin: number;
}

export interface PersonBill {
  personId: string;
  total: number;
  hours: number;
  flightCost: number;
  taxesCost: number;
  items: FinanceItem[];
}

export interface AircraftBill {
  acId: string;
  total: number;
  hours: number;
  flightCost: number;
  taxesCost: number;
}

export interface FinanceTotals {
  flightCost: number;
  taxesCost: number;
  total: number;
  hours: number;
  unassignedCost: number;
}

export interface FinanceResult {
  items: FinanceItem[];
  byPerson: Record<string, PersonBill>;
  byAircraft: Record<string, AircraftBill>;
  totals: FinanceTotals;
}

// UI state types
export type EditorKind = 'aerodrome' | 'crew' | 'bags' | 'fuel';

export interface AerodromeEditorState {
  kind: 'aerodrome';
  legIdx: number;
  which: 'from' | 'to';
  anchor: DOMRect;
}

export interface SplitEditorState {
  kind: 'split';
  legIdx: number;
  anchor: DOMRect;
}

export interface CrewEditorState {
  kind: 'crew';
  ac: Aircraft;
  legIdx: number;
  anchor: DOMRect;
}

export interface BagsEditorState {
  kind: 'bags';
  ac: Aircraft;
  legIdx: number;
  anchor: DOMRect;
}

export interface FuelEditorState {
  kind: 'fuel';
  ac: Aircraft;
  legIdx: number;
  anchor: DOMRect;
}

export type EditorState =
  | AerodromeEditorState
  | SplitEditorState
  | CrewEditorState
  | BagsEditorState
  | FuelEditorState;

export type FormEditorKind = 'person' | 'voyagePerson' | 'aircraft' | 'model' | 'aerodrome';

export interface PersonFormState {
  kind: 'person';
  payload: Partial<Person> & { id?: string };
}

export interface VoyagePersonFormState {
  kind: 'voyagePerson';
  payload: Partial<Person> & { id?: string };
}

export interface AircraftFormState {
  kind: 'aircraft';
  payload: Partial<Aircraft> & { id?: string };
}

export interface ModelFormState {
  kind: 'model';
  payload: { modelKey: string; model: Partial<AircraftModel> };
}

export interface AerodromeFormState {
  kind: 'aerodrome';
  payload: Partial<Aerodrome> & { __isNew?: boolean };
}

export type FormEditorState =
  | PersonFormState
  | VoyagePersonFormState
  | AircraftFormState
  | ModelFormState
  | AerodromeFormState;

export type AppTab = 'voyages' | 'voyage' | 'aircraft' | 'aerodromes';
export type VoyageSubTab = 'map' | 'people' | 'finance' | 'recap';
