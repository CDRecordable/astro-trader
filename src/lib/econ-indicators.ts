// ============================================================
// Macro-economic country indicators — registry & classification
// ============================================================
// The "one layer above the stock": each country gets the classic
// top-down read (job market / inflation / activity), every indicator
// is bucketed into LOW / NORMAL / HIGH bands and mapped to the policy
// stance it implies for the central bank (expansionary / neutral /
// contractionary), mirroring the standard macro playbook:
//   weak economy   → cut rates / QE      (expansionary)
//   hot economy    → hike rates / QT     (contractionary)
//   high inflation → hike rates / QT     (contractionary)
// Pure data + pure functions — imported by both the API route (server)
// and the EconomyView (client). No fetching here.

export type CountryId = "us" | "ea" | "es";
export type EconCategory = "jobs" | "inflation" | "activity" | "policy";
/** Band the latest value falls into. */
export type Band = "low" | "normal" | "high";
/** What the reading pushes the central bank towards. */
export type Stance = "expansionary" | "neutral" | "contractionary";
/** Economic temperature implied by the reading (for the aggregate dial). */
export type EconRead = "weak" | "ok" | "strong";

/** How the raw series becomes the displayed number. */
export type Transform =
    | "level"       // value as-is
    | "yoy"         // % change vs 12 periods ago (monthly series)
    | "mom"         // % change vs previous period
    | "delta";      // arithmetic change vs previous period

export type Unit = "percent" | "points" | "thousands" | "index";

export interface IndicatorDef {
    key: string;                   // translation + payload key
    category: EconCategory;
    source: { kind: "fred"; id: string } | { kind: "dbnomics"; id: string };
    transform: Transform;
    unit: Unit;
    decimals: number;
    /** Band edges: value < lo → "low", value > hi → "high", else "normal". */
    bands?: { lo: number; hi: number };
    /**
     * Economic reading per band. E.g. unemployment: high → weak economy;
     * payrolls: high → strong economy; CPI: high → high inflation (mapped
     * to "strong" heat for the aggregate).
     */
    read?: Record<Band, EconRead>;
    /** Policy stance implied per band (the 4th column of the playbook). */
    stance?: Record<Band, Stance>;
    /** Informational rows (policy rate) carry no bands/stance. */
}

// Shared band → read/stance shapes ---------------------------------------

/** "High value = weak economy" (unemployment, jobless claims). */
const INVERSE_READ: Record<Band, EconRead> = { low: "strong", normal: "ok", high: "weak" };
const INVERSE_STANCE: Record<Band, Stance> = { low: "contractionary", normal: "neutral", high: "expansionary" };

/** "High value = strong economy" (payrolls, activity, confidence). */
const DIRECT_READ: Record<Band, EconRead> = { low: "weak", normal: "ok", high: "strong" };
const DIRECT_STANCE: Record<Band, Stance> = { low: "expansionary", normal: "neutral", high: "contractionary" };

/** Inflation gauges: high = hot → hike. (Read maps to heat for aggregate.) */
const INFLATION_READ: Record<Band, EconRead> = { low: "weak", normal: "ok", high: "strong" };
const INFLATION_STANCE: Record<Band, Stance> = { low: "expansionary", normal: "neutral", high: "contractionary" };

// ── Registry ─────────────────────────────────────────────────

export const COUNTRIES: Record<CountryId, { flag: string; indicators: IndicatorDef[] }> = {
    us: {
        flag: "🇺🇸",
        indicators: [
            // Job market
            { key: "unemployment", category: "jobs", source: { kind: "fred", id: "UNRATE" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 4, hi: 5.5 }, read: INVERSE_READ, stance: INVERSE_STANCE },
            { key: "joblessClaims", category: "jobs", source: { kind: "fred", id: "ICSA" }, transform: "level", unit: "thousands", decimals: 0, bands: { lo: 250_000, hi: 350_000 }, read: INVERSE_READ, stance: INVERSE_STANCE },
            { key: "payrolls", category: "jobs", source: { kind: "fred", id: "PAYEMS" }, transform: "delta", unit: "thousands", decimals: 0, bands: { lo: 50, hi: 250 }, read: DIRECT_READ, stance: DIRECT_STANCE },
            // Inflation
            { key: "cpi", category: "inflation", source: { kind: "fred", id: "CPIAUCSL" }, transform: "yoy", unit: "percent", decimals: 1, bands: { lo: 1.5, hi: 2.5 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            { key: "coreCpi", category: "inflation", source: { kind: "fred", id: "CPILFESL" }, transform: "yoy", unit: "percent", decimals: 1, bands: { lo: 1.5, hi: 2.5 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            { key: "ppi", category: "inflation", source: { kind: "fred", id: "PPIFIS" }, transform: "mom", unit: "percent", decimals: 2, bands: { lo: 0, hi: 0.2 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            // Activity
            { key: "indProduction", category: "activity", source: { kind: "fred", id: "INDPRO" }, transform: "yoy", unit: "percent", decimals: 1, bands: { lo: 0, hi: 2 }, read: DIRECT_READ, stance: DIRECT_STANCE },
            { key: "consumerSentiment", category: "activity", source: { kind: "fred", id: "UMCSENT" }, transform: "level", unit: "index", decimals: 1, bands: { lo: 70, hi: 90 }, read: DIRECT_READ, stance: DIRECT_STANCE },
            // Policy (informational)
            { key: "policyRate", category: "policy", source: { kind: "fred", id: "FEDFUNDS" }, transform: "level", unit: "percent", decimals: 2 },
        ],
    },
    ea: {
        flag: "🇪🇺",
        indicators: [
            { key: "unemployment", category: "jobs", source: { kind: "dbnomics", id: "Eurostat/une_rt_m/M.SA.TOTAL.PC_ACT.T.EA20" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 7, hi: 9 }, read: INVERSE_READ, stance: INVERSE_STANCE },
            { key: "hicp", category: "inflation", source: { kind: "dbnomics", id: "Eurostat/prc_hicp_manr/M.RCH_A.CP00.EA20" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 1.5, hi: 2.5 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            { key: "coreHicp", category: "inflation", source: { kind: "dbnomics", id: "Eurostat/prc_hicp_manr/M.RCH_A.TOT_X_NRG_FOOD.EA20" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 1.5, hi: 2.5 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            { key: "esi", category: "activity", source: { kind: "dbnomics", id: "Eurostat/ei_bssi_m_r2/M.BS-ESI-I.SA.EA20" }, transform: "level", unit: "index", decimals: 1, bands: { lo: 95, hi: 105 }, read: DIRECT_READ, stance: DIRECT_STANCE },
            { key: "policyRate", category: "policy", source: { kind: "dbnomics", id: "ECB/FM/B.U2.EUR.4F.KR.DFR.LEV" }, transform: "level", unit: "percent", decimals: 2 },
        ],
    },
    es: {
        flag: "🇪🇸",
        indicators: [
            // Spain's structural unemployment sits far above the EA average —
            // bands are country-specific, not the EA ones.
            { key: "unemployment", category: "jobs", source: { kind: "dbnomics", id: "Eurostat/une_rt_m/M.SA.TOTAL.PC_ACT.T.ES" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 11, hi: 15 }, read: INVERSE_READ, stance: INVERSE_STANCE },
            { key: "hicp", category: "inflation", source: { kind: "dbnomics", id: "Eurostat/prc_hicp_manr/M.RCH_A.CP00.ES" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 1.5, hi: 2.5 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            { key: "coreHicp", category: "inflation", source: { kind: "dbnomics", id: "Eurostat/prc_hicp_manr/M.RCH_A.TOT_X_NRG_FOOD.ES" }, transform: "level", unit: "percent", decimals: 1, bands: { lo: 1.5, hi: 2.5 }, read: INFLATION_READ, stance: INFLATION_STANCE },
            { key: "esi", category: "activity", source: { kind: "dbnomics", id: "Eurostat/ei_bssi_m_r2/M.BS-ESI-I.SA.ES" }, transform: "level", unit: "index", decimals: 1, bands: { lo: 95, hi: 105 }, read: DIRECT_READ, stance: DIRECT_STANCE },
            // Spain has no own policy rate — the ECB's applies.
            { key: "policyRate", category: "policy", source: { kind: "dbnomics", id: "ECB/FM/B.U2.EUR.4F.KR.DFR.LEV" }, transform: "level", unit: "percent", decimals: 2 },
        ],
    },
};

// ── Classification ───────────────────────────────────────────

export function classifyBand(def: IndicatorDef, value: number): Band | null {
    if (!def.bands) return null;
    if (value < def.bands.lo) return "low";
    if (value > def.bands.hi) return "high";
    return "normal";
}

export interface IndicatorReading {
    key: string;
    band: Band | null;
    read: EconRead | null;
    stance: Stance | null;
}

export function readIndicator(def: IndicatorDef, value: number): IndicatorReading {
    const band = classifyBand(def, value);
    return {
        key: def.key,
        band,
        read: band && def.read ? def.read[band] : null,
        stance: band && def.stance ? def.stance[band] : null,
    };
}

// ── Aggregate: the country dial ──────────────────────────────

export interface CountryAggregate {
    /** Growth temperature from jobs+activity indicators only. */
    economy: EconRead;
    /** Net central-bank bias implied by ALL scored indicators. */
    bias: Stance;
    counts: { expansionary: number; neutral: number; contractionary: number };
}

export function aggregateCountry(readings: IndicatorReading[], defs: IndicatorDef[]): CountryAggregate | null {
    const byKey = new Map(defs.map((d) => [d.key, d]));
    const scored = readings.filter((r) => r.stance !== null);
    if (scored.length === 0) return null;

    const counts = { expansionary: 0, neutral: 0, contractionary: 0 };
    for (const r of scored) counts[r.stance!]++;

    // Net policy bias: majority vote over stances, ties → neutral.
    const bias: Stance =
        counts.contractionary > counts.expansionary + counts.neutral ? "contractionary"
            : counts.expansionary > counts.contractionary + counts.neutral ? "expansionary"
                : counts.contractionary > counts.expansionary ? "contractionary"
                    : counts.expansionary > counts.contractionary ? "expansionary"
                        : "neutral";

    // Economy heat: only growth-type indicators (jobs + activity).
    const growth = readings.filter((r) => {
        const cat = byKey.get(r.key)?.category;
        return r.read !== null && (cat === "jobs" || cat === "activity");
    });
    let heat = 0;
    for (const g of growth) heat += g.read === "strong" ? 1 : g.read === "weak" ? -1 : 0;
    const economy: EconRead = growth.length === 0 ? "ok"
        : heat >= Math.ceil(growth.length / 3) ? "strong"
            : heat <= -Math.ceil(growth.length / 3) ? "weak" : "ok";

    return { economy, bias, counts };
}
