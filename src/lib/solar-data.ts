// ============================================================
// Solar Data — Monthly mean sunspot numbers (SILSO / Royal Observatory Belgium)
// ============================================================
// Source: SILSO (Solar Influences Data Analysis Center), series SN_m_tot_V2.0
// https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.csv
//
// This static array is an OFFLINE SNAPSHOT of the real SILSO series, used as a
// fallback. At runtime the app fetches the live SILSO CSV via /api/solar and
// replaces this data through `hydrateSunspots()` so values stay current.
//
// Provenance: values up to `PROVISIONAL_FROM` are SILSO *definitive*; from that
// month on they are SILSO *provisional* (revised in later months). NO value here
// is invented/estimated — earlier versions contained fabricated 2025-26 figures
// which have been replaced with the real SILSO numbers.
//
// Solar cycles ~11 years: Cycle 23 (1996-2008), Cycle 24 (2008-2019), Cycle 25 (2019-present)

/** A single monthly sunspot observation with provenance. */
export interface SunspotPoint {
    year: number;
    month: number;
    ssn: number;
    /** true = SILSO provisional (recent, will be revised); false = definitive. */
    provisional: boolean;
}

/** First month (inclusive) considered SILSO *provisional* in the offline snapshot. */
export let PROVISIONAL_FROM = "2026-01";

/** Human-readable provenance label, updated when live data is hydrated. */
export let SOLAR_SOURCE = "SILSO / Royal Observatory of Belgium (offline snapshot)";

/**
 * Monthly mean total sunspot number. Each entry: [year, month, sunspot_number].
 * SSN ≈ 0 at solar minimum, peaks ~150-250 at solar maximum. Real SILSO values.
 * Declared with `let` so `hydrateSunspots()` can swap in the live SILSO series.
 */
export let MONTHLY_SUNSPOT_DATA: [number, number, number][] = [
    // 2000 — Cycle 23 maximum
    [2000, 1, 112.5], [2000, 2, 122.3], [2000, 3, 138.2], [2000, 4, 125.5],
    [2000, 5, 118.3], [2000, 6, 124.2], [2000, 7, 170.1], [2000, 8, 130.5],
    [2000, 9, 109.7], [2000, 10, 99.4], [2000, 11, 106.8], [2000, 12, 104.4],
    // 2001 — Cycle 23 peak/plateau
    [2001, 1, 95.6], [2001, 2, 80.6], [2001, 3, 113.5], [2001, 4, 109.9],
    [2001, 5, 96.6], [2001, 6, 134.0], [2001, 7, 81.4], [2001, 8, 106.4],
    [2001, 9, 150.7], [2001, 10, 125.5], [2001, 11, 106.5], [2001, 12, 132.2],
    // 2002 — Cycle 23 second peak
    [2002, 1, 114.1], [2002, 2, 107.0], [2002, 3, 98.4], [2002, 4, 120.7],
    [2002, 5, 120.8], [2002, 6, 88.3], [2002, 7, 99.6], [2002, 8, 116.4],
    [2002, 9, 109.6], [2002, 10, 97.6], [2002, 11, 94.8], [2002, 12, 80.8],
    // 2003 — Declining from peak
    [2003, 1, 79.7], [2003, 2, 46.2], [2003, 3, 61.5], [2003, 4, 60.0],
    [2003, 5, 55.2], [2003, 6, 77.4], [2003, 7, 85.0], [2003, 8, 72.7],
    [2003, 9, 48.7], [2003, 10, 65.6], [2003, 11, 68.9], [2003, 12, 46.5],
    // 2004 — Descending
    [2004, 1, 37.3], [2004, 2, 45.8], [2004, 3, 49.1], [2004, 4, 39.3],
    [2004, 5, 41.5], [2004, 6, 43.2], [2004, 7, 51.0], [2004, 8, 40.9],
    [2004, 9, 28.4], [2004, 10, 48.4], [2004, 11, 43.8], [2004, 12, 17.9],
    // 2005 — Descending
    [2005, 1, 31.4], [2005, 2, 29.2], [2005, 3, 24.5], [2005, 4, 24.4],
    [2005, 5, 42.8], [2005, 6, 39.6], [2005, 7, 39.9], [2005, 8, 36.4],
    [2005, 9, 22.1], [2005, 10, 8.3], [2005, 11, 18.0], [2005, 12, 41.3],
    // 2006 — Near minimum
    [2006, 1, 15.5], [2006, 2, 5.0], [2006, 3, 10.8], [2006, 4, 30.2],
    [2006, 5, 22.2], [2006, 6, 13.9], [2006, 7, 12.2], [2006, 8, 12.9],
    [2006, 9, 14.4], [2006, 10, 10.5], [2006, 11, 21.5], [2006, 12, 13.6],
    // 2007 — Deep minimum approaching
    [2007, 1, 16.9], [2007, 2, 10.6], [2007, 3, 4.8], [2007, 4, 3.7],
    [2007, 5, 11.7], [2007, 6, 12.1], [2007, 7, 10.1], [2007, 8, 6.2],
    [2007, 9, 2.4], [2007, 10, 0.9], [2007, 11, 1.7], [2007, 12, 10.1],
    // 2008 — Cycle 23/24 minimum
    [2008, 1, 3.4], [2008, 2, 2.1], [2008, 3, 9.3], [2008, 4, 2.9],
    [2008, 5, 2.9], [2008, 6, 3.1], [2008, 7, 0.5], [2008, 8, 0.5],
    [2008, 9, 1.1], [2008, 10, 2.9], [2008, 11, 4.1], [2008, 12, 0.8],
    // 2009 — Extended minimum
    [2009, 1, 1.5], [2009, 2, 1.4], [2009, 3, 0.7], [2009, 4, 1.2],
    [2009, 5, 2.9], [2009, 6, 2.6], [2009, 7, 3.5], [2009, 8, 0.0],
    [2009, 9, 4.2], [2009, 10, 4.6], [2009, 11, 4.2], [2009, 12, 10.8],
    // 2010 — Cycle 24 starts ascending
    [2010, 1, 13.1], [2010, 2, 18.6], [2010, 3, 15.4], [2010, 4, 7.9],
    [2010, 5, 8.8], [2010, 6, 13.5], [2010, 7, 16.1], [2010, 8, 19.6],
    [2010, 9, 25.2], [2010, 10, 23.5], [2010, 11, 21.7], [2010, 12, 14.5],
    // 2011 — Ascending
    [2011, 1, 19.0], [2011, 2, 29.4], [2011, 3, 56.2], [2011, 4, 54.4],
    [2011, 5, 42.4], [2011, 6, 37.0], [2011, 7, 43.7], [2011, 8, 50.6],
    [2011, 9, 78.0], [2011, 10, 88.0], [2011, 11, 96.7], [2011, 12, 73.2],
    // 2012 — Ascending toward Cycle 24 max
    [2012, 1, 58.3], [2012, 2, 33.4], [2012, 3, 64.2], [2012, 4, 55.2],
    [2012, 5, 69.0], [2012, 6, 64.5], [2012, 7, 66.5], [2012, 8, 63.0],
    [2012, 9, 61.5], [2012, 10, 53.3], [2012, 11, 61.5], [2012, 12, 40.8],
    // 2013 — Cycle 24 first peak
    [2013, 1, 62.9], [2013, 2, 38.0], [2013, 3, 57.9], [2013, 4, 72.4],
    [2013, 5, 78.7], [2013, 6, 52.5], [2013, 7, 57.0], [2013, 8, 66.0],
    [2013, 9, 36.9], [2013, 10, 85.6], [2013, 11, 77.6], [2013, 12, 90.3],
    // 2014 — Cycle 24 maximum
    [2014, 1, 82.0], [2014, 2, 102.8], [2014, 3, 92.2], [2014, 4, 84.7],
    [2014, 5, 75.0], [2014, 6, 71.0], [2014, 7, 75.5], [2014, 8, 74.7],
    [2014, 9, 87.6], [2014, 10, 60.6], [2014, 11, 64.9], [2014, 12, 78.0],
    // 2015 — Descending from Cycle 24 maximum
    [2015, 1, 67.0], [2015, 2, 44.8], [2015, 3, 38.4], [2015, 4, 54.4],
    [2015, 5, 57.2], [2015, 6, 45.6], [2015, 7, 57.0], [2015, 8, 64.6],
    [2015, 9, 46.6], [2015, 10, 44.6], [2015, 11, 56.7], [2015, 12, 57.2],
    // 2016 — Descending
    [2016, 1, 56.6], [2016, 2, 57.2], [2016, 3, 38.4], [2016, 4, 38.0],
    [2016, 5, 37.2], [2016, 6, 17.2], [2016, 7, 27.0], [2016, 8, 34.5],
    [2016, 9, 44.7], [2016, 10, 33.6], [2016, 11, 20.4], [2016, 12, 19.2],
    // 2017 — Descending toward minimum
    [2017, 1, 26.1], [2017, 2, 26.0], [2017, 3, 17.7], [2017, 4, 32.3],
    [2017, 5, 18.8], [2017, 6, 19.2], [2017, 7, 17.8], [2017, 8, 33.4],
    [2017, 9, 43.6], [2017, 10, 13.2], [2017, 11, 5.7], [2017, 12, 8.2],
    // 2018 — Approaching minimum
    [2018, 1, 6.7], [2018, 2, 10.6], [2018, 3, 2.5], [2018, 4, 8.9],
    [2018, 5, 13.2], [2018, 6, 15.9], [2018, 7, 1.6], [2018, 8, 8.8],
    [2018, 9, 3.4], [2018, 10, 4.3], [2018, 11, 5.9], [2018, 12, 3.1],
    // 2019 — Cycle 24/25 minimum
    [2019, 1, 7.0], [2019, 2, 0.0], [2019, 3, 9.4], [2019, 4, 9.1],
    [2019, 5, 9.9], [2019, 6, 1.0], [2019, 7, 1.6], [2019, 8, 0.4],
    [2019, 9, 1.1], [2019, 10, 0.4], [2019, 11, 0.5], [2019, 12, 1.5],
    // 2020 — Cycle 25 begins
    [2020, 1, 6.3], [2020, 2, 0.2], [2020, 3, 1.5], [2020, 4, 5.2],
    [2020, 5, 0.2], [2020, 6, 5.7], [2020, 7, 6.1], [2020, 8, 8.1],
    [2020, 9, 0.5], [2020, 10, 14.5], [2020, 11, 34.5], [2020, 12, 21.8],
    // 2021 — Cycle 25 ascending
    [2021, 1, 10.4], [2021, 2, 7.1], [2021, 3, 28.9], [2021, 4, 27.3],
    [2021, 5, 22.0], [2021, 6, 35.7], [2021, 7, 36.6], [2021, 8, 18.5],
    [2021, 9, 51.4], [2021, 10, 36.3], [2021, 11, 28.3], [2021, 12, 67.0],
    // 2022 — Cycle 25 ascending rapidly
    [2022, 1, 59.7], [2022, 2, 56.6], [2022, 3, 73.6], [2022, 4, 84.0],
    [2022, 5, 96.0], [2022, 6, 70.6], [2022, 7, 92.4], [2022, 8, 74.7],
    [2022, 9, 94.3], [2022, 10, 88.3], [2022, 11, 80.0], [2022, 12, 113.0],
    // 2023 — Cycle 25 surging past predictions
    [2023, 1, 143.6], [2023, 2, 111.2], [2023, 3, 122.6], [2023, 4, 97.6],
    [2023, 5, 137.0], [2023, 6, 163.4], [2023, 7, 159.1], [2023, 8, 115.0],
    [2023, 9, 134.1], [2023, 10, 99.4], [2023, 11, 105.4], [2023, 12, 114.2],
    // 2024 — Cycle 25 maximum (SILSO definitive)
    [2024, 1, 126.0], [2024, 2, 123.0], [2024, 3, 103.7], [2024, 4, 137.0],
    [2024, 5, 172.1], [2024, 6, 164.1], [2024, 7, 196.8], [2024, 8, 216.0],
    [2024, 9, 141.1], [2024, 10, 165.8], [2024, 11, 154.1], [2024, 12, 154.6],
    // 2025 — Cycle 25 plateau (SILSO definitive)
    [2025, 1, 137.0], [2025, 2, 155.7], [2025, 3, 134.2], [2025, 4, 141.4],
    [2025, 5, 78.5], [2025, 6, 114.6], [2025, 7, 125.9], [2025, 8, 133.7],
    [2025, 9, 129.7], [2025, 10, 114.8], [2025, 11, 91.7], [2025, 12, 124.2],
    // 2026 — SILSO provisional (revised monthly; superseded by live /api/solar fetch)
    [2026, 1, 112.5], [2026, 2, 78.2], [2026, 3, 85.9], [2026, 4, 79.3], [2026, 5, 101.4],
];

/** Solar activity regime thresholds */
export const SOLAR_THRESHOLDS = {
    low: 40,   // SSN < 40 → Solar Minimum regime
    high: 120, // SSN > 120 → Solar Maximum regime
    // 40–120 → Moderate Activity
};

type SolarRegime = "minimum" | "moderate" | "maximum";

/**
 * Get the interpolated sunspot number for a given date.
 * Uses linear interpolation between monthly data points.
 */
export function getSunspotNumber(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Find enclosing months
    const idx = MONTHLY_SUNSPOT_DATA.findIndex(
        ([y, m]) => y === year && m === month
    );
    if (idx === -1) {
        // Outside our data range — return nearest boundary
        const first = MONTHLY_SUNSPOT_DATA[0];
        const last = MONTHLY_SUNSPOT_DATA[MONTHLY_SUNSPOT_DATA.length - 1];
        if (year < first[0] || (year === first[0] && month < first[1])) return first[2];
        return last[2];
    }

    const current = MONTHLY_SUNSPOT_DATA[idx];
    const next = MONTHLY_SUNSPOT_DATA[idx + 1];

    if (!next) return current[2];

    // Linear interpolation within the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const frac = (day - 1) / daysInMonth;
    return current[2] + frac * (next[2] - current[2]);
}

/**
 * Get the solar cycle phase for a given date.
 */
export function getSolarCyclePhase(date: Date): "minimum" | "ascending" | "maximum" | "descending" {
    const ssn = getSunspotNumber(date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Determine slope: compare SSN 3 months before vs 3 months after
    const before = new Date(year, month - 4, 15);
    const after = new Date(year, month + 2, 15);
    const ssnBefore = getSunspotNumber(before);
    const ssnAfter = getSunspotNumber(after);
    const slope = ssnAfter - ssnBefore;

    if (ssn < SOLAR_THRESHOLDS.low) return "minimum";
    if (ssn > SOLAR_THRESHOLDS.high) return "maximum";
    return slope > 0 ? "ascending" : "descending";
}

/**
 * Classify a date into a solar activity regime.
 */
export function classifySolarDay(date: Date): SolarRegime {
    const ssn = getSunspotNumber(date);
    if (ssn < SOLAR_THRESHOLDS.low) return "minimum";
    if (ssn > SOLAR_THRESHOLDS.high) return "maximum";
    return "moderate";
}

/**
 * Get SSN for an array of dates (for chart rendering).
 * Returns [dateString, ssn][] 
 */
export function getSolarTimeline(startYear: number, endYear: number): { date: string; ssn: number }[] {
    return MONTHLY_SUNSPOT_DATA
        .filter(([y]) => y >= startYear && y <= endYear)
        .map(([y, m, ssn]) => ({
            date: `${y}-${String(m).padStart(2, "0")}-15`,
            ssn,
        }));
}

// ── Live data hydration (from /api/solar → real SILSO CSV) ───
/**
 * Returns true if `date` falls within the covered data range (so callers can
 * avoid presenting an extrapolated boundary value as if it were a real reading).
 */
export function hasSunspotData(date: Date): boolean {
    if (MONTHLY_SUNSPOT_DATA.length === 0) return false;
    const ym = date.getFullYear() * 12 + date.getMonth(); // month index
    const [fy, fm] = MONTHLY_SUNSPOT_DATA[0];
    const [ly, lm] = MONTHLY_SUNSPOT_DATA[MONTHLY_SUNSPOT_DATA.length - 1];
    return ym >= fy * 12 + (fm - 1) && ym <= ly * 12 + (lm - 1);
}

/** True if the date's month is SILSO *provisional* (recent, subject to revision). */
export function isProvisional(date: Date): boolean {
    const [py, pm] = PROVISIONAL_FROM.split("-").map(Number);
    const provIdx = py * 12 + (pm - 1);
    const dateIdx = date.getFullYear() * 12 + date.getMonth();
    return dateIdx >= provIdx;
}

/**
 * Replace the in-memory sunspot series with live SILSO data fetched at runtime.
 * Idempotent and safe: ignores empty input. Updates provenance metadata so the
 * UI can label the source and the provisional cutoff honestly.
 */
export function hydrateSunspots(points: SunspotPoint[], source?: string): void {
    if (!points || points.length === 0) return;
    MONTHLY_SUNSPOT_DATA = points.map((p) => [p.year, p.month, p.ssn] as [number, number, number]);
    const firstProv = points.find((p) => p.provisional);
    if (firstProv) {
        PROVISIONAL_FROM = `${firstProv.year}-${String(firstProv.month).padStart(2, "0")}`;
    } else {
        // All definitive → set cutoff just past the last point
        const last = points[points.length - 1];
        PROVISIONAL_FROM = `${last.year}-${String(last.month + 1).padStart(2, "0")}`;
    }
    if (source) SOLAR_SOURCE = source;
}
