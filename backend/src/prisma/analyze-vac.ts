/**
 * AeroNav — VAC analyzer
 * Fetches SIA VAC PDFs, extracts operational data via pdftotext,
 * and updates the database.
 *
 * Usage:
 *   npm run analyze:vac                   — update all aerodromes
 *   npm run analyze:vac -- --dry-run      — preview without writing
 *   npm run analyze:vac -- --icao LFRS    — single aerodrome
 *   npm run analyze:vac -- --debug        — print raw PDF text
 *   npm run analyze:vac -- --concurrency 3
 *
 * Requires: pdftotext (poppler-utils) — install with:
 *   apk add poppler-utils   (Alpine/Docker)
 *   apt install poppler-utils (Debian)
 */

import { PrismaClient } from "@prisma/client";
import { execFile } from "child_process";
import https from "https";

const prisma = new PrismaClient();

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN    = args.includes("--dry-run");
const DEBUG      = args.includes("--debug");
const SINGLE_ICAO = (() => { const i = args.indexOf("--icao"); return i !== -1 ? args[i + 1]?.toUpperCase() : null; })();
const CONCURRENCY = (() => { const i = args.indexOf("--concurrency"); return i !== -1 ? parseInt(args[i + 1]) || 5 : 5; })();

// ─── AIRAC date ───────────────────────────────────────────────────────────────

const AIRAC_REF = new Date("2025-01-23T00:00:00Z");
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function airacDate(offset = 0): string {
  const daysSince = Math.floor((Date.now() - AIRAC_REF.getTime()) / 86_400_000);
  const start = new Date(AIRAC_REF.getTime() + (Math.floor(daysSince / 28) + offset) * 28 * 86_400_000);
  return `${String(start.getUTCDate()).padStart(2,"0")}_${MONTHS[start.getUTCMonth()]}_${start.getUTCFullYear()}`;
}

// ─── PDF fetch ────────────────────────────────────────────────────────────────

const SIA_BASE = "https://www.sia.aviation-civile.gouv.fr/media/dvd";
const PDF_PATH = (icao: string) => `Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${icao}.pdf`;

async function fetchPdf(icao: string): Promise<Buffer | null> {
  for (const offset of [0, -1]) {
    const url = `${SIA_BASE}/eAIP_${airacDate(offset)}/${PDF_PATH(icao)}`;
    const buf = await new Promise<Buffer | null>((resolve) => {
      const req = https.get(url, { headers: { "User-Agent": "AeroNav/1.0" } }, (res) => {
        if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      });
      req.on("error", () => resolve(null));
    });
    if (buf) return buf;
  }
  return null;
}

// ─── pdftotext extraction ─────────────────────────────────────────────────────

function pdfToText(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // "-" as input = stdin, "-" as output = stdout
    const proc = execFile("pdftotext", ["-", "-"], { maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    proc.stdin!.write(buf);
    proc.stdin!.end();
  });
}

// ─── Parser ───────────────────────────────────────────────────────────────────

type FuelAvailability = { h24: boolean; schedule?: string };

interface ParsedVAC {
  fuel: string[];
  fuelSchedule: Record<string, FuelAvailability>;
  atc?: string;
  night?: boolean;
  nightFound: boolean;   // true = section found in PDF (even if value unchanged)
  ppr?: boolean;
}

function parseVAC(raw: string): ParsedVAC {
  const lines = raw.split(/\r?\n/);

  // ── Fuel (section 10 - AVT) ──────────────────────────────────────────────────
  // Format: "10 - AVT : Carburants / Fuel : 100 LL. JET A1 - Lubrifiants / Lubricants : NIL"
  // or:     "10 - AVT : Jet A1 - AVGAS - Automat"
  const fuel: string[] = [];
  const fuelSchedule: Record<string, FuelAvailability> = {};

  const avtLine = lines.find(l => /\bAVT\s*:/.test(l));
  if (avtLine) {
    const avtUpper = avtLine.toUpperCase();
    // Extract the part after "AVT :" (and skip "Lubrifiants / Lubricants" part)
    const afterAvt = avtUpper.replace(/LUBRIFIANTS.*$/, "").replace(/LUBRICANTS.*$/, "");

    const H24_RE  = /H\s*24|24\s*H|PERMANENT/;
    const TIME_RE = /(\d{1,2}[H:]\s*\d{2}\s*[-–]\s*\d{1,2}[H:]\s*\d{2}(?:\s*(?:LT|UTC))?(?:.*?(?:LUN|MAR|MER|JEU|VEN|SAM|DIM).*?)?)/i;

    const FUEL_DEFS: Array<{ name: string; test: RegExp }> = [
      { name: "100LL",        test: /100\s*LL|AVGAS/ },
      { name: "Jet-A1",       test: /JET\s*A\s*1/ },
      { name: "MOGAS / UL91", test: /MOGAS|UL\s*91/ },
    ];

    for (const { name, test } of FUEL_DEFS) {
      const m = afterAvt.match(test);
      if (!m || m.index === undefined) continue;
      fuel.push(name);

      // Look at up to 80 chars after the keyword for schedule
      const ctx = afterAvt.slice(m.index, m.index + 80);
      if (H24_RE.test(ctx) || !ctx.match(/\d{2}\s*[H:]/)) {
        // H24 or no specific time → assume H24
        fuelSchedule[name] = { h24: true };
      } else {
        const t = ctx.match(TIME_RE);
        fuelSchedule[name] = t
          ? { h24: false, schedule: t[1].trim().replace(/\s+/g, " ").slice(0, 60) }
          : { h24: false };
      }
    }

    // Also scan nearby lines for fuel-specific schedules (they can be on separate lines)
    const avtIdx = lines.indexOf(avtLine);
    const nearLines = lines.slice(avtIdx + 1, avtIdx + 8).join(" ").toUpperCase();
    for (const { name } of FUEL_DEFS) {
      if (!fuelSchedule[name]) continue;
      if (!fuelSchedule[name].h24) continue;
      // Check if there's a time constraint on the next few lines for this fuel
      const fuelTest = name === "100LL" ? /100\s*LL|AVGAS/ : name === "Jet-A1" ? /JET\s*A\s*1/ : /MOGAS|UL\s*91/;
      const nearMatch = nearLines.match(fuelTest);
      if (nearMatch && nearMatch.index !== undefined) {
        const ctx2 = nearLines.slice(nearMatch.index, nearMatch.index + 60);
        const t2 = ctx2.match(TIME_RE);
        if (t2) fuelSchedule[name] = { h24: false, schedule: t2[1].trim().replace(/\s+/g, " ").slice(0, 60) };
      }
    }
  }

  // ── Night VFR (section 3 - VFR de nuit) ──────────────────────────────────────
  // Canonical format: "3 - VFR de nuit / Night VFR : Agréé / Approved"
  // The PDF often has bare "VFR de nuit" / "Night VFR" headers earlier on the
  // page (section titles in the chart), which must not be confused with the
  // data line that carries the actual status. We look for the section-numbered
  // line ("3 - VFR de nuit …: Agréé") first, then fall back to any line that
  // carries both the keyword AND a status keyword on the same line.
  let night: boolean | undefined;
  let nightFound = false;
  const nightLine =
    lines.find(l => /^\s*3\s*[-–]\s*VFR de nuit/i.test(l)) ??
    lines.find(l => /VFR de nuit|Night VFR/i.test(l) && /agr|approv|non agr|not appr|interdit|forbid/i.test(l));
  if (nightLine) {
    nightFound = true;
    const u = nightLine.toUpperCase();
    if (/NON AGR|NOT APPR|INTERDIT|FORBIDDEN/.test(u)) night = false;
    else if (/AGR|APPROV/.test(u))                     night = true;
  }

  // ── ATC type (from frequency header lines) ───────────────────────────────────
  // Formats: "TWR : 118.650"  /  "APP : NIL"  /  "AFIS : 118.225"  /  "A/A : 118.505"
  let atc: string | undefined;
  const hasTwr  = lines.some(l => /^\s*TWR\s*:/.test(l) && !/NIL/.test(l));
  const hasApp  = lines.some(l => /^\s*APP\s*:/.test(l) && !/NIL/.test(l));
  const hasAfis = lines.some(l => /^\s*AFIS\s*:/.test(l) && !/NIL/.test(l));
  const hasMil  = lines.some(l => /^\s*MIL\s*:/.test(l));

  if      (hasMil)              atc = "MIL";
  else if (hasTwr && hasApp)    atc = "Tour+Approche";
  else if (hasTwr)              atc = "Tour";
  else if (hasAfis)             atc = "AFIS";

  // ── PPR ───────────────────────────────────────────────────────────────────────
  // Detect genuine aerodrome-wide PPR (not procedure-specific mentions).
  // Patterns found in SIA VAC texts:
  //   "ARP AD : PPR ATS"  (LFKC, common pattern)
  //   "PPR obligatoire"
  //   "PPR 24 HR" / "PPR 1 HR" as a general requirement
  //   "ACCES SUR PPR"
  const fullText = raw.toUpperCase();
  const ppr = (
    /ARP\s*(?:AD)?\s*:\s*PPR/.test(fullText)        ||   // ARP AD : PPR ATS…
    /PPR\s+OBLIGATOIRE/.test(fullText)                ||   // PPR obligatoire
    /ACCES\s+SUR\s+PPR/.test(fullText)                ||   // Accès sur PPR
    (/\bPPR\b/.test(fullText) && !hasTwr && fuel.length > 0)  // PPR + no TWR + fuel found
  );

  return { fuel, fuelSchedule, atc, night, nightFound, ppr };
}

// ─── DB update ────────────────────────────────────────────────────────────────

type Aerodrome = {
  id: string; icao: string;
  fuel: string[]; fuelSchedule: unknown;
  atc: string; night: boolean; ppr: boolean;
};

type UpdatePatch = {
  fuel?: string[]; fuelSchedule?: Record<string, FuelAvailability>;
  atc?: string; night?: boolean; ppr?: boolean;
};

function buildPatch(current: Aerodrome, parsed: ParsedVAC): UpdatePatch {
  const patch: UpdatePatch = {};
  if (parsed.fuel.length > 0) {
    patch.fuel = parsed.fuel;
    patch.fuelSchedule = parsed.fuelSchedule;
  }
  if (parsed.atc && parsed.atc !== current.atc) patch.atc = parsed.atc;
  if (parsed.night !== undefined && parsed.night !== current.night) patch.night = parsed.night;
  // PPR: only set to true automatically (don't remove an existing PPR without manual review)
  if (parsed.ppr === true && !current.ppr) patch.ppr = true;
  return patch;
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  await Promise.all(
    Array.from({ length: limit }, async (_, w) => {
      for (let i = w; i < items.length; i += limit) await fn(items[i]);
    })
  );
}

// ─── Process one aerodrome ────────────────────────────────────────────────────

async function processAerodrome(
  ad: Aerodrome,
  stats: { ok: number; noVac: number; err: number; updated: number }
) {
  process.stdout.write(`  ${ad.icao.padEnd(6)} `);

  const buf = await fetchPdf(ad.icao);
  if (!buf) {
    process.stdout.write("✗ pas de VAC\n");
    stats.noVac++;
    return;
  }

  let text: string;
  try {
    text = await pdfToText(buf);
  } catch (e) {
    process.stdout.write(`✗ pdftotext: ${(e as Error).message?.slice(0, 50)}\n`);
    stats.err++;
    return;
  }

  if (DEBUG) {
    console.log(`\n── TEXTE BRUT ${ad.icao} ${"─".repeat(40)}`);
    console.log(text.slice(0, 3000));
    console.log("─".repeat(54));
  }

  const parsed = parseVAC(text);
  const patch  = buildPatch(ad, parsed);

  // Night VFR status — always shown regardless of whether a patch is needed
  const nightStatus = parsed.nightFound
    ? (parsed.night === true  ? "✓ agréé"   :
       parsed.night === false ? "✗ non agréé" : "? (trouvé mais statut ambigu)")
    : "? non trouvé dans le PDF";

  if (Object.keys(patch).length === 0) {
    process.stdout.write(`○ aucun changement  [nuit: ${nightStatus}]\n`);
    stats.ok++;
    return;
  }

  const summary = [
    patch.fuel        ? `carburant: [${patch.fuel.join(", ")}]`          : null,
    patch.fuelSchedule ? `horaires: ${JSON.stringify(patch.fuelSchedule).slice(0, 60)}` : null,
    patch.atc         ? `ATC: ${patch.atc}`                              : null,
    patch.night !== undefined ? `nuit: ${patch.night ? "agréé" : "non agréé"}` : null,
    patch.ppr !== undefined   ? `PPR: ${patch.ppr}`                      : null,
  ].filter(Boolean).join(" | ");
  const nightSuffix = `  [nuit: ${nightStatus}]`;

  if (DRY_RUN) {
    process.stdout.write(`○ [dry-run] ${summary}${nightSuffix}\n`);
  } else {
    await prisma.aerodrome.update({
      where: { id: ad.id },
      data: patch as Parameters<typeof prisma.aerodrome.update>[0]["data"],
    });
    process.stdout.write(`✓ ${summary}${nightSuffix}\n`);
    stats.updated++;
  }
  stats.ok++;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Verify pdftotext is available
  await new Promise<void>((resolve, reject) => {
    execFile("pdftotext", ["-v"], (err) => {
      if (err?.code === "ENOENT") reject(new Error("pdftotext introuvable. Installez poppler-utils : apk add poppler-utils"));
      else resolve();
    });
  });

  console.log(`\nAeroNav — Analyse VAC${DRY_RUN ? " [DRY-RUN]" : ""}`);
  console.log(`Cycle AIRAC courant : eAIP_${airacDate(0)}\n`);

  const where = SINGLE_ICAO ? { icao: SINGLE_ICAO } : { icao: { startsWith: "LF" } };
  const aerodromes = await prisma.aerodrome.findMany({
    where,
    orderBy: { icao: "asc" },
  });

  console.log(`${aerodromes.length} aérodrome(s) à traiter · concurrence: ${CONCURRENCY}\n`);

  const stats = { ok: 0, noVac: 0, err: 0, updated: 0 };
  await pool(aerodromes, CONCURRENCY, (ad) => processAerodrome(ad as unknown as Aerodrome, stats));

  console.log("\n─────────────────────────────────");
  console.log(`Traités       : ${stats.ok + stats.noVac + stats.err}`);
  console.log(`Mis à jour    : ${stats.updated}${DRY_RUN ? " (dry-run, non écrit)" : ""}`);
  console.log(`Sans VAC      : ${stats.noVac}`);
  console.log(`Erreurs       : ${stats.err}`);
}

main()
  .catch((e) => { console.error("Erreur:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
