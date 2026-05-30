/**
 * Import all French aerodromes from OurAirports (https://ourairports.com/data/)
 * Run with: npm run import:aerodromes
 *
 * Behaviour:
 * - Creates new aerodromes with aeroclubIds: [] (catalog pool, not assigned to any club)
 * - Skips aerodromes that already exist in the DB (preserves user-curated data)
 * - Aerodromes with empty aeroclubIds are discoverable via GET /api/aerodromes/catalog
 * - A club subscribes to an aerodrome by POST /api/aerodromes with the ICAO code
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

async function main() {
  console.log("Fetching airports.csv from OurAirports…");
  const airportsCsv = await fetchUrl(AIRPORTS_URL);
  const allAirports = parseCsv(airportsCsv);

  // Keep only official ICAO-registered aerodromes (4-letter codes starting with LF).
  // FR-XXXX codes are non-ICAO fields (ULM strips, private altisurfaces, etc.).
  const ICAO_FR = /^LF[A-Z0-9]{2}$/;
  const frAirports = allAirports.filter(
    (a) => a.iso_country === "FR" && INCLUDE_TYPES.has(a.type) && ICAO_FR.test(a.ident)
  );
  console.log(`Found ${frAirports.length} French aerodromes to process.`);

  console.log("Fetching runways.csv from OurAirports…");
  const runwaysCsv = await fetchUrl(RUNWAYS_URL);
  const allRunways = parseCsv(runwaysCsv);

  const runwaysByIcao = new Map<string, (typeof allRunways)[number][]>();
  for (const rwy of allRunways) {
    if (!rwy.airport_ident) continue;
    const key = rwy.airport_ident.toUpperCase();
    const arr = runwaysByIcao.get(key) ?? [];
    arr.push(rwy);
    runwaysByIcao.set(key, arr);
  }

  let created = 0;
  let skipped = 0;
  let invalid = 0;

  for (let i = 0; i < frAirports.length; i++) {
    const ap = frAirports[i];
    const icao = ap.ident.toUpperCase();

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
        fuel: [],
        night: false,
        ppr: false,
        atc: "",
        taxLanding: 0,
        taxParking: 0,
        notes: null,
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
        `\r  Progress: ${i + 1}/${frAirports.length} (created: ${created}, skipped: ${skipped})…`
      );
    }
  }

  console.log(`\n\nImport complete:`);
  console.log(`  Created : ${created}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Invalid (bad coords)   : ${invalid}`);
  console.log(
    `\nTo subscribe a club to an aerodrome, use POST /api/aerodromes with the ICAO code.`
  );
  console.log(
    `To search the catalog, use GET /api/aerodromes/catalog?q=<query>.`
  );
}

main()
  .catch((e) => {
    console.error("\nImport failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
