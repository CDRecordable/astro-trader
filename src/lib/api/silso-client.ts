// ============================================================
// SILSO client — live monthly sunspot numbers
// ============================================================
// Fetches the real SILSO monthly mean total sunspot number series
// (SN_m_tot_V2.0) from the Royal Observatory of Belgium.
//
// CSV format (semicolon-separated), one row per month:
//   year ; month ; decimal_date ; ssn_mean ; ssn_std ; n_obs ; definitive_flag
//   definitive_flag: 1 = definitive, 0 = provisional. ssn_mean = -1 → missing.
// ============================================================

import type { SunspotPoint } from "../solar-data";

const SILSO_URL = "https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.csv";

/**
 * Fetch and parse the SILSO monthly series, filtered to `fromYear` onward.
 * Drops missing months (ssn = -1). Uses Next's data cache with daily revalidation
 * (SILSO updates once a month, so a 24h cache is generous).
 * Throws on network/HTTP error so callers can fall back to the offline snapshot.
 */
export async function fetchSilsoMonthly(fromYear = 2000): Promise<SunspotPoint[]> {
    const res = await fetch(SILSO_URL, {
        // Cache for 24h; SILSO publishes monthly.
        next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`SILSO HTTP ${res.status}`);

    const text = await res.text();
    const points: SunspotPoint[] = [];

    for (const line of text.split("\n")) {
        const cols = line.split(";");
        if (cols.length < 7) continue;
        const year = Number(cols[0]);
        const month = Number(cols[1]);
        const ssn = Number(cols[3]);
        const definitive = Number(cols[6]) === 1;
        if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
        if (year < fromYear) continue;
        if (!Number.isFinite(ssn) || ssn < 0) continue; // -1 = missing
        points.push({ year, month, ssn: Math.round(ssn * 10) / 10, provisional: !definitive });
    }

    return points;
}
