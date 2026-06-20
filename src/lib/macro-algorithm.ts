// ============================================================
// Astrological Macro Turbulence — now backed by a REAL ephemeris
// ============================================================
// The turbulence curve and the transit registry are no longer hand-typed.
// `generateMacroTimeline` delegates to the ephemeris (astronomy-engine):
// turbulence is computed from actual slow-planet aspect angles for each date.
// `PLANETARY_TRANSITS` is the COMPUTED list of exact generational aspects
// (see src/lib/astro/transits-data.ts), not a curated set of dates.
// ============================================================

import { COMPUTED_TRANSITS } from "./astro/transits-data";
import { generateRealMacroTimeline } from "./astro/ephemeris";

export interface MacroDataPoint {
    date: string;               // YYYY-MM-DD
    timestamp: number;
    turbulenceIndex: number;    // 0 = Peak Fluidity/Risk-On, 100 = Peak Tension/Risk-Off
    activeTransits: string[];
}

// ── Transit registry (computed, with human-readable descriptions) ──
export interface PlanetaryTransit {
    name: string;
    date: string;
    type: "tension" | "fluidity";
    intensity: number;
    spreadDays: number;
    description: string;
}

const PAIR_DESC: Record<string, string> = {
    "Saturn-Pluto": "Saturn (structure) and Pluto (transformation) — power structures are stressed and forced to transform. Historically linked to major economic resets and geopolitical tension.",
    "Saturn-Uranus": "Saturn (the established order) versus Uranus (disruption, technology) — friction between legacy systems and disruptive change; often coincides with systemic shocks.",
    "Saturn-Neptune": "Saturn (reality) meets Neptune (illusion, speculation) — speculative excess confronts hard truths about valuation and systemic risk.",
    "Uranus-Pluto": "A multi-year generational aspect reshaping the relationship between technology and power; prolonged market-regime change.",
    "Neptune-Pluto": "The slowest planetary cycle — deep, civilizational shifts in collective values and structures.",
    "Uranus-Neptune": "Innovation meets collective vision — paradigm shifts in ideology and technology.",
};

function describeTransit(pair: string, aspect: string, type: "tension" | "fluidity"): string {
    const base = PAIR_DESC[pair] ?? "A slow generational planetary alignment.";
    const flavor = type === "tension"
        ? ` The ${aspect.toLowerCase()} is a hard, tension-building angle.`
        : ` The ${aspect.toLowerCase()} is a harmonious, flowing angle.`;
    return base + flavor;
}

/** Computed exact generational transits, 2000–2032 (from the real ephemeris). */
export const PLANETARY_TRANSITS: PlanetaryTransit[] = COMPUTED_TRANSITS.map((r) => ({
    name: r.name,
    date: r.date,
    type: r.type,
    intensity: r.intensity,
    spreadDays: r.spreadDays,
    description: describeTransit(r.pair, r.aspect, r.type),
}));

// ── Pearson correlation helper ─────────────────────────────────
export function pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 5) return 0;
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
    const meanY = ySlice.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xSlice[i] - meanX;
        const dy = ySlice[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
}

/**
 * Macro turbulence timeline — computed from the real ephemeris.
 * Same signature/shape as before, so all existing consumers keep working,
 * but every turbulence value now comes from actual planetary aspect angles.
 */
export function generateMacroTimeline(startDateStr: string, endDateStr: string, steps: number = 300): MacroDataPoint[] {
    return generateRealMacroTimeline(startDateStr, endDateStr, steps);
}
