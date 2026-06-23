// National equivalent of the French "carte VAC", resolved from an ICAO code.
// Keep this table in sync with backend/scripts/import-aerodromes.ts.

interface ChartProvider {
  label: string;
  url?: string; // official portal; omitted → ChartFox fallback
}

const CHART_EXACT: Record<string, ChartProvider> = {
  EGNS: { label: 'AIP (Isle of Man)' },
};

const CHART_PREFIX3: Record<string, ChartProvider> = {
  EGJ: { label: 'AIP (Channel Islands)' }, // Jersey / Guernsey / Alderney
};

const CHART_PREFIX2: Record<string, ChartProvider> = {
  LF: { label: 'Carte VAC (SIA)' },
  EG: { label: 'AIP (UK – NATS)', url: 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/AIP/' },
  ED: { label: 'AIP VFR (DFS)', url: 'https://aip.dfs.de/BasicVFR/' },
  ET: { label: 'AIP VFR (DFS)', url: 'https://aip.dfs.de/BasicVFR/' },
  LS: { label: 'VFR Manual (Skyguide)', url: 'https://www.skybriefing.com/portal/de/vfr-manual' },
  LO: { label: 'AIP VFR (Austro Control)', url: 'https://eaip.austrocontrol.at/' },
  EB: { label: 'AIP (skeyes)', url: 'https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/index-en-GB.html' },
  EH: { label: 'AIP (LVNL)', url: 'https://eaip.lvnl.nl/' },
  EI: { label: 'AIP (IAA)', url: 'https://www.iaa.ie/general-aviation/iaip' },
  LE: { label: 'AIP (ENAIRE)', url: 'https://aip.enaire.es/AIP/' },
  LP: { label: 'AIP (NAV Portugal)', url: 'https://www.nav.pt/en/ais/aip-publication' },
  LI: { label: 'AIP (ENAV)', url: 'https://www.enav.it/servizi/aim' },
  EK: { label: 'AIP (Naviair)' },
  EN: { label: 'AIP (Avinor)' },
  ES: { label: 'AIP (LFV)' },
  EF: { label: 'AIP (Fintraffic)' },
  BI: { label: 'AIP (Isavia)' },
  EP: { label: 'AIP (PANSA)' },
  LK: { label: 'AIP (ANS CR)' },
  LZ: { label: 'AIP (LPS SR)' },
  LH: { label: 'AIP (HungaroControl)' },
  LJ: { label: 'AIP (Slovenia Control)' },
  LD: { label: 'AIP (Croatia Control)' },
  LR: { label: 'AIP (ROMATSA)' },
  LB: { label: 'AIP (BULATSA)' },
  EE: { label: 'AIP (EANS)' },
  EV: { label: 'AIP (LGS)' },
  EY: { label: 'AIP (Oro Navigacija)' },
  EL: { label: 'AIP (Luxembourg)' },
  LG: { label: 'AIP (HCAA)' },
  LM: { label: 'AIP (Malta)' },
};

const chartFoxUrl = (icao: string) => `https://chartfox.org/${icao}`;

export interface ResolvedChart {
  /** France uses the in-app SIA proxy (iframe); everyone else opens an external link. */
  isFrance: boolean;
  /** Button / section label: "Carte VAC" for France, the national AIP name otherwise. */
  label: string;
  /** External chart URL (null for France — handled by the proxy). */
  url: string | null;
}

/**
 * Resolve the chart provider for an aerodrome.
 * @param icao  ICAO code (e.g. "EGJJ").
 * @param vacUrl  Optional stored/edited URL — takes precedence over the resolved default.
 */
export function chartProvider(icao: string, vacUrl?: string | null): ResolvedChart {
  const code = icao.toUpperCase();
  const isFrance = code.startsWith('LF');
  const provider =
    CHART_EXACT[code] ??
    CHART_PREFIX3[code.slice(0, 3)] ??
    CHART_PREFIX2[code.slice(0, 2)];

  if (isFrance) {
    return { isFrance: true, label: provider?.label ?? 'Carte VAC', url: null };
  }
  return {
    isFrance: false,
    label: provider?.label ?? 'AIP',
    url: vacUrl || provider?.url || chartFoxUrl(code),
  };
}
