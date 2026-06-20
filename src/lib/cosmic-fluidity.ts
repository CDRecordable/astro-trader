// ============================================================
// Cosmic Fluidity Score — Shared computation module
// Extracted from MacroOverview for reuse in the scoring algorithm
// ============================================================

import { getMoonPhase } from "./lunar-data";
import { isRetrograde, getNextRetrograde, MERCURY_RETROGRADES } from "./mercury-data";
import { generateMacroTimeline } from "./macro-algorithm";

// ── Individual Signals ───────────────────────────────────────

export interface FluiditySignal {
    score: number;   // 0-100
    label: string;
    trend: "up" | "down" | "stable";
}

export interface CosmicFluidityResult {
    compositeScore: number;   // 0-100 weighted composite
    turbulence: FluiditySignal;
    lunar: FluiditySignal;
    mercury: FluiditySignal;
}

function computeTurbulenceSignal(): FluiditySignal {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayData = generateMacroTimeline(todayStr, todayStr, 1)[0];
    const turbulence = todayData?.turbulenceIndex ?? 50;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureStr = futureDate.toISOString().split("T")[0];
    const futureData = generateMacroTimeline(futureStr, futureStr, 1)[0];
    const turbulenceFuture = futureData?.turbulenceIndex ?? 50;

    // Invert: low turbulence = high fluidity
    const score = Math.max(0, Math.min(100, 100 - turbulence));
    const scoreFuture = Math.max(0, Math.min(100, 100 - turbulenceFuture));

    const diff = scoreFuture - score;
    const trend: "up" | "down" | "stable" = diff > 3 ? "up" : diff < -3 ? "down" : "stable";

    const label = turbulence < 30 ? "Low Turbulence" : turbulence < 60 ? "Moderate" : turbulence < 80 ? "Elevated" : "High Turbulence";

    return { score: Math.round(score * 10) / 10, label, trend };
}

function computeLunarSignal(): FluiditySignal {
    const phase = getMoonPhase(new Date());
    // Score: distance from new moon. Phase 0 = new moon = 100, Phase 0.5 = full moon = 0
    const score = Math.round(((Math.cos(phase * 2 * Math.PI) + 1) / 2) * 100);
    const label = phase < 0.25 || phase >= 0.75 ? "New Moon Half ✦" : "Full Moon Half";
    const trend: "up" | "down" | "stable" = phase >= 0.5 ? "up" : phase < 0.5 ? "down" : "stable";

    return { score, label, trend };
}

function computeMercurySignal(): FluiditySignal {
    const now = new Date();
    const retro = isRetrograde(now);
    const next = getNextRetrograde(now);

    if (retro) {
        const currentRetro = MERCURY_RETROGRADES.find(([s, e]) => now >= new Date(s) && now <= new Date(e));
        let trend: "up" | "down" | "stable" = "stable";
        if (currentRetro) {
            const startDate = new Date(currentRetro[0]);
            const endDate = new Date(currentRetro[1]);
            const total = endDate.getTime() - startDate.getTime();
            const elapsed = now.getTime() - startDate.getTime();
            trend = elapsed > total * 0.6 ? "up" : "down";
        }
        return { score: 0, label: "⚠ Retrograde", trend };
    }

    if (next) {
        const daysUntil = Math.ceil((next.start.getTime() - now.getTime()) / 86400000);
        if (daysUntil <= 7) {
            const score = Math.round((daysUntil / 7) * 50 + 50);
            return { score, label: `Pre-Shadow (${daysUntil}d)`, trend: "down" };
        }
        const trend: "up" | "down" | "stable" = daysUntil > 30 ? "stable" : "down";
        return { score: 100, label: "✦ Direct", trend };
    }

    return { score: 100, label: "✦ Direct", trend: "stable" };
}

// ── Composite Score ──────────────────────────────────────────

/** Compute the full Cosmic Fluidity reading with all sub-signals */
export function computeCosmicFluidity(): CosmicFluidityResult {
    const turbulence = computeTurbulenceSignal();
    const lunar = computeLunarSignal();
    const mercury = computeMercurySignal();

    const compositeScore = Math.round(
        turbulence.score * 0.40 +
        lunar.score * 0.35 +
        mercury.score * 0.25
    );

    return { compositeScore, turbulence, lunar, mercury };
}

/** Quick helper: returns just the composite score (0-100) for use in algorithm */
export function computeCosmicFluidityScore(): number {
    return computeCosmicFluidity().compositeScore;
}
