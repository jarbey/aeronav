/**
 * Import European aerodromes into the catalog pool.
 *
 *   Source 1 (always) — OurAirports (https://ourairports.com/data/, public domain / CC0)
 *                        → structural data: ICAO, name, city, coords, elevation, runways.
 *   Source 2 (optional) — OpenAIP (https://www.openaip.net, CC BY-NC)
 *                        → enriches the `fuel` field. Enabled only when OPENAIP_API_KEY is set.
 *                        ⚠️ OpenAIP data is licensed for NON-COMMERCIAL use — check compatibility.
 *
 * Run with:
 *   npm run import:aerodromes                 # all of Europe except France (FR already imported)
 *   npm run import:aerodromes -- --include-fr # include France too
 *   npm run import:aerodromes -- --country=GB,JE,GG,IM   # only these ISO countries
 *   OPENAIP_API_KEY=xxx npm run import:aerodromes        # + fuel enrichment
 *
 * Behaviour:
 * - Creates new aerodromes with aeroclubIds: [] (catalog pool, not assigned to any club).
 * - Skips aerodromes that already exist in the DB (preserves user-curated data).
 * - A club subscribes to an aerodrome via POST /api/aerodromes with the ICAO code.
 */
import { PrismaClient } from "@prisma/client";
import https from "https";
import { IncomingMessage } from "http";

const prisma = new PrismaClient();

const AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const RUNWAYS_URL =
  "https://davidmegginson.github.io/ourairports-data/runways.csv";

const INCLUDE_TYPES = new Set([
  "small_airport",
  "medium_airport",
  "large_airport",
]);

// A valid 4-char ICAO ident: 2 letters then 2 alphanumerics (e.g. EGJJ, LSGG).
// Filters out OurAirports local codes like "GB-0001".
const ICAO_RE = /^[A-Z]{2}[A-Z0-9]{2}$/;

const SURFACE_MAP: Record<string, string> = {
  ASPH: "Revêtue",
  ASP: "Revêtue",
  "ASPH-F": "Revêtue",
  "ASPH-G": "Revêtue",
  CON: "Revêtue",
  CONC: "Revêtue",
  "CONC-G": "Revêtue",
  BIT: "Revêtue",
  PEM: "Revêtue",
  MACA: "Revêtue",
  MAC: "Revêtue",
  GRASS: "Herbe",
  GRS: "Herbe",
  TURF: "Herbe",
  SOD: "Herbe",
  DIRT: "Herbe",
  CLAY: "Herbe",
  GRVL: "Stabilisée",
  GVL: "Stabilisée",
  GRV: "Stabilisée",
  GRAVEL: "Stabilisée",
  COR: "Stabilisée",
  SHELL: "Stabilisée",
  SAND: "Stabilisée",
  WATER: "Eau",
  WAT: "Eau",
};

function mapSurface(s: string): string {
  if (!s) return "Revêtue";
  return SURFACE_MAP[s.toUpperCase().trim()] ?? "Revêtue";
}

// ─── eAIP / VAC providers ────────────────────────────────────────────────────
// National equivalent of the French "carte VAC", keyed by ICAO prefix.
// `url` is the official AIS portal when known; otherwise we fall back to
// ChartFox (https://chartfox.org/<ICAO>) which deep-links to the aerodrome's
// official charts and is deterministic per ICAO. The `vacUrl` field is editable
// afterwards, so a club can paste a more precise link.
// NOTE: keep this table in sync with frontend/src/utils/charts.ts.
interface ChartProvider {
  label: string;
  url?: string; // official portal; omit to use the ChartFox fallback
}
// Exact 4-letter ICAO overrides (checked first).
const CHART_EXACT: Record<string, ChartProvider> = {
  EGNS: { label: "AIP (Isle of Man)" },
};
// 3-letter prefix overrides (checked before 2-letter).
const CHART_PREFIX3: Record<string, ChartProvider> = {
  EGJ: { label: "AIP (Channel Islands)" }, // Jersey / Guernsey / Alderney
};
// 2-letter ICAO prefix → national AIS.
const CHART_PREFIX2: Record<string, ChartProvider> = {
  LF: { label: "Carte VAC (SIA)" }, // France — served by the SIA proxy, no external URL
  EG: { label: "AIP (UK – NATS)", url: "https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/AIP/" },
  ED: { label: "AIP VFR (DFS)", url: "https://aip.dfs.de/BasicVFR/" },
  ET: { label: "AIP VFR (DFS)", url: "https://aip.dfs.de/BasicVFR/" },
  LS: { label: "VFR Manual (Skyguide)", url: "https://www.skybriefing.com/portal/de/vfr-manual" },
  LO: { label: "AIP VFR (Austro Control)", url: "https://eaip.austrocontrol.at/" },
  EB: { label: "AIP (skeyes)", url: "https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/index-en-GB.html" },
  EH: { label: "AIP (LVNL)", url: "https://eaip.lvnl.nl/" },
  EI: { label: "AIP (IAA)", url: "https://www.iaa.ie/general-aviation/iaip" },
  LE: { label: "AIP (ENAIRE)", url: "https://aip.enaire.es/AIP/" },
  LP: { label: "AIP (NAV Portugal)", url: "https://www.nav.pt/en/ais/aip-publication" },
  LI: { label: "AIP (ENAV)", url: "https://www.enav.it/servizi/aim" },
  EK: { label: "AIP (Naviair)" },
  EN: { label: "AIP (Avinor)" },
  ES: { label: "AIP (LFV)" },
  EF: { label: "AIP (Fintraffic)" },
  BI: { label: "AIP (Isavia)" },
  EP: { label: "AIP (PANSA)" },
  LK: { label: "AIP (ANS CR)" },
  LZ: { label: "AIP (LPS SR)" },
  LH: { label: "AIP (HungaroControl)" },
  LJ: { label: "AIP (Slovenia Control)" },
  LD: { label: "AIP (Croatia Control)" },
  LR: { label: "AIP (ROMATSA)" },
  LB: { label: "AIP (BULATSA)" },
  EE: { label: "AIP (EANS)" },
  EV: { label: "AIP (LGS)" },
  EY: { label: "AIP (Oro Navigacija)" },
  EL: { label: "AIP (Luxembourg)" },
  LG: { label: "AIP (HCAA)" },
  LM: { label: "AIP (Malta)" },
};

function chartFoxUrl(icao: string): string {
  return `https://chartfox.org/${icao}`;
}

/** Resolve the VAC/AIP chart URL to pre-fill for an ICAO. Returns null for France
 *  (the in-app SIA proxy handles it). */
function resolveVacUrl(icao: string): string | null {
  if (icao.startsWith("LF")) return null;
  const provider =
    CHART_EXACT[icao] ??
    CHART_PREFIX3[icao.slice(0, 3)] ??
    CHART_PREFIX2[icao.slice(0, 2)];
  return provider?.url ?? chartFoxUrl(icao);
}

// ─── CLI args ──────────────────────────────────────────────────────────────

interface Options {
  includeFr: boolean;
  countries: Set<string> | null; // null = whole EU continent
}

function parseArgs(argv: string[]): Options {
  let includeFr = false;
  let countries: Set<string> | null = null;
  for (const arg of argv) {
    if (arg === "--include-fr") includeFr = true;
    else if (arg.startsWith("--country=")) {
      countries = new Set(
        arg
          .slice("--country=".length)
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      );
    }
  }
  return { includeFr, countries };
}

// ─── CSV (OurAirports) ───────────────────────────────────────────────────────

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res: IncomingMessage) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? "";
    });
    rows.push(obj);
  }
  return rows;
}

// ─── JSON (OpenAIP) ──────────────────────────────────────────────────────────

function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "x-openaip-api-key": apiKey, Accept: "application/json" } },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`OpenAIP HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
  });
}

/**
 * OpenAIP fuelTypes is an array of integer enum codes. The mapping below targets
 * the vocabulary already used in this DB ("100LL", "Jet-A1", "UL91", "MOGAS").
 * ⚠️ Verify the enum against the current OpenAIP schema — unknown codes are logged
 *    at the end of the run so you can extend this map.
 */
const OPENAIP_FUEL_MAP: Record<number, string> = {
  0: "Super Plus",
  1: "100LL", // AVGAS 100LL
  2: "UL91",  // AVGAS UL91
  3: "Jet-A1",
  4: "Jet-A1",
  5: "Jet-A1", // Jet B → grouped with Jet-A1 for simplicity
  6: "Diesel",
  7: "MOGAS",
};

interface OpenAipAirport {
  icaoCode?: string;
  fuelTypes?: number[];
}
interface OpenAipPage {
  items: OpenAipAirport[];
  totalPages: number;
  page: number;
}

/**
 * Fetch the fuel types per ICAO for one ISO country from OpenAIP.
 * Returns a Map<ICAO, string[]>. Collects any unmapped enum codes in `unknownCodes`.
 */
async function fetchOpenAipFuel(
  country: string,
  apiKey: string,
  unknownCodes: Set<number>
): Promise<Map<string, string[]>> {
  const byIcao = new Map<string, string[]>();
  let page = 1;
  let totalPages = 1;
  do {
    const url =
      `https://api.core.openaip.net/api/airports` +
      `?country=${encodeURIComponent(country)}&limit=1000&page=${page}`;
    const data = await fetchJson<OpenAipPage>(url, apiKey);
    totalPages = data.totalPages ?? 1;
    for (const ap of data.items ?? []) {
      const icao = (ap.icaoCode ?? "").toUpperCase();
      if (!icao || !ap.fuelTypes?.length) continue;
      const labels: string[] = [];
      for (const code of ap.fuelTypes) {
        const label = OPENAIP_FUEL_MAP[code];
        if (label) {
          if (!labels.includes(label)) labels.push(label);
        } else {
          unknownCodes.add(code);
        }
      }
      if (labels.length) byIcao.set(icao, labels);
    }
    page++;
  } while (page <= totalPages);
  return byIcao;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log("Fetching airports.csv from OurAirports…");
  const allAirports = parseCsv(await fetchUrl(AIRPORTS_URL));

  const targets = allAirports.filter((a) => {
    if (a.continent !== "EU") return false;
    if (!INCLUDE_TYPES.has(a.type)) return false;
    if (!opts.includeFr && a.iso_country === "FR") return false;
    if (opts.countries && !opts.countries.has(a.iso_country)) return false;
    const icao = (a.icao_code || a.ident).toUpperCase();
    return ICAO_RE.test(icao);
  });

  const scope = opts.countries
    ? `countries [${[...opts.countries].join(", ")}]`
    : opts.includeFr
      ? "all Europe (incl. France)"
      : "all Europe (excl. France)";
  console.log(`Found ${targets.length} aerodromes to process — scope: ${scope}.`);

  console.log("Fetching runways.csv from OurAirports…");
  const allRunways = parseCsv(await fetchUrl(RUNWAYS_URL));

  const runwaysByIcao = new Map<string, (typeof allRunways)[number][]>();
  for (const rwy of allRunways) {
    if (!rwy.airport_ident) continue;
    const key = rwy.airport_ident.toUpperCase();
    const arr = runwaysByIcao.get(key) ?? [];
    arr.push(rwy);
    runwaysByIcao.set(key, arr);
  }

  // ── OpenAIP fuel enrichment (optional) ─────────────────────────────────────
  const apiKey = process.env.OPENAIP_API_KEY;
  const fuelByIcao = new Map<string, string[]>();
  const unknownFuelCodes = new Set<number>();
  if (apiKey) {
    const countries = opts.countries
      ? [...opts.countries]
      : [...new Set(targets.map((a) => a.iso_country))];
    console.log(
      `\nOpenAIP: fetching fuel data for ${countries.length} countries…`
    );
    for (const country of countries) {
      try {
        const map = await fetchOpenAipFuel(country, apiKey, unknownFuelCodes);
        for (const [icao, fuel] of map) fuelByIcao.set(icao, fuel);
        process.stdout.write(`\r  ${country}: ${fuelByIcao.size} aerodromes with fuel so far…`);
      } catch (e) {
        console.warn(`\n  ⚠️ OpenAIP fetch failed for ${country}: ${(e as Error).message}`);
      }
    }
    console.log("");
  } else {
    console.log(
      "\nOpenAIP: skipped (set OPENAIP_API_KEY to enrich the `fuel` field)."
    );
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  let invalid = 0;
  let withFuel = 0;

  for (let i = 0; i < targets.length; i++) {
    const ap = targets[i];
    const icao = (ap.icao_code || ap.ident).toUpperCase();

    const lng = parseFloat(ap.longitude_deg);
    const lat = parseFloat(ap.latitude_deg);
    if (!isFinite(lng) || !isFinite(lat) || (lng === 0 && lat === 0)) {
      invalid++;
      continue;
    }

    const existing = await prisma.aerodrome.findUnique({ where: { icao } });
    if (existing) {
      skipped++;
      continue;
    }

    const elevationFt = parseInt(ap.elevation_ft) || 0;
    const fuel = fuelByIcao.get(icao) ?? [];
    if (fuel.length) withFuel++;

    const apRunways = (runwaysByIcao.get(icao) ?? []).filter(
      (r) => r.closed !== "1" && (r.le_ident || r.he_ident)
    );

    const aerodrome = await prisma.aerodrome.create({
      data: {
        icao,
        name: ap.name || icao,
        city: ap.municipality || "",
        lngLat: [lng, lat],
        elevationFt,
        fuel,
        fuelUpdatedAt: fuel.length ? new Date() : null,
        night: false,
        ppr: false,
        atc: "",
        taxLanding: 0,
        taxParking: 0,
        notes: null,
        vacUrl: resolveVacUrl(icao),
        aeroclubIds: [],
      },
    });

    for (const rwy of apRunways) {
      const lengthFt = parseFloat(rwy.length_ft);
      if (!isFinite(lengthFt) || lengthFt <= 0) continue;

      const qfu =
        rwy.le_ident && rwy.he_ident
          ? `${rwy.le_ident}/${rwy.he_ident}`
          : rwy.le_ident || rwy.he_ident || "?";

      await prisma.runway.create({
        data: {
          aerodromeId: aerodrome.id,
          qfu,
          lengthM: Math.round(lengthFt * 0.3048),
          surface: mapSurface(rwy.surface),
        },
      });
    }

    created++;
    if ((created + skipped) % 100 === 0) {
      process.stdout.write(
        `\r  Progress: ${i + 1}/${targets.length} (created: ${created}, skipped: ${skipped})…`
      );
    }
  }

  console.log(`\n\nImport complete:`);
  console.log(`  Created : ${created}  (with fuel from OpenAIP: ${withFuel})`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Invalid (bad coords)   : ${invalid}`);
  if (unknownFuelCodes.size) {
    console.log(
      `  ⚠️ Unmapped OpenAIP fuel codes (extend OPENAIP_FUEL_MAP): ${[...unknownFuelCodes].join(", ")}`
    );
  }
  console.log(
    `\nTo subscribe a club to an aerodrome, use POST /api/aerodromes with the ICAO code.`
  );
}

main()
  .catch((e) => {
    console.error("\nImport failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
