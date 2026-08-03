// ============================================================
// Scoring primitives — renormalization WITH a coverage floor
// ============================================================
// Every engine (stocks, crypto, ETFs) renormalizes its pillars:
// a metric we don't have is excluded from the exam rather than
// scored as a failure — `earned / possible × 100`.
//
// That rule is right, but on its own it has a sharp edge: excluding a
// question doesn't just avoid punishing the asset, it hands the whole
// pillar to whichever metrics happen to survive. Measured against live
// data, Ethereum's "Tokenomics" pillar was decided by 2 of 5 metrics
// (35 of 100 possible points) and 57% of it came from a single ratio
// that is 1.0000 for every coin CoinGecko reports an FDV for. A pillar
// resting on two answers is not an 87; it's "we don't really know".
//
// So renormalization now carries a confidence term. The raw score is
// still earned/possible, but it is pulled toward NEUTRAL in proportion
// to how much of the pillar we were actually able to measure. Full data
// → untouched. Half the exam missing → half the conviction.
//
// This can only ever move a pillar TOWARD 50: it never invents a
// penalty, and a well-covered pillar scores exactly as it did before.

/** At or above this coverage a pillar is trusted at face value. */
export const FULL_CONFIDENCE_COVERAGE = 0.6;

/** Neutral score — what a pillar decays toward as coverage drops. */
export const NEUTRAL = 50;

/**
 * How much of a pillar's deviation from neutral we keep, given how much
 * of it we measured. Linear ramp: 0 coverage → 0 conviction,
 * FULL_CONFIDENCE_COVERAGE or better → full conviction.
 */
export function confidenceWeight(coverage: number): number {
    if (coverage >= FULL_CONFIDENCE_COVERAGE) return 1;
    return Math.max(0, coverage) / FULL_CONFIDENCE_COVERAGE;
}

export interface PillarResult {
    /** Final 0-100 pillar score, after the coverage shrink. */
    score: number;
    /** earned / possible × 100 — the score before the shrink. */
    raw: number;
    earned: number;
    /** Points actually on the exam (metrics we had data for). */
    possible: number;
    /** Points if every metric had been available. */
    maxPossible: number;
    /** possible / maxPossible, 0-1. */
    coverage: number;
    /**
     * Metrics measured / metrics defined. Only the engines that accumulate
     * through `Pillar` count individual metrics; the stock engine renormalizes
     * in blocks, so it reports coverage in points alone.
     */
    measured?: number;
    total?: number;
}

/**
 * Build a PillarResult from block totals, for engines that accumulate
 * `earned`/`possible` inline rather than through the `Pillar` class.
 *
 * @param maxPossible points the pillar would be worth with complete data
 */
export function renormalize(
    earned: number,
    possible: number,
    maxPossible: number,
    counts?: { measured: number; total: number },
): PillarResult {
    const coverage = maxPossible > 0 ? possible / maxPossible : 0;
    const raw = possible > 0 ? (earned / possible) * 100 : NEUTRAL;
    const score = NEUTRAL + (raw - NEUTRAL) * confidenceWeight(coverage);
    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        raw: Math.round(raw),
        earned,
        possible,
        maxPossible,
        coverage,
        ...counts,
    };
}

/**
 * Accumulates a pillar. `add` is called once per metric, present or not,
 * so the pillar knows the size of the exam it *didn't* sit.
 */
export class Pillar {
    private earned = 0;
    private possible = 0;
    private maxPossible = 0;
    private measured = 0;
    private total = 0;

    /**
     * @param present  whether we have the data for this metric
     * @param earned   points scored (ignored when absent)
     * @param possible points this metric is worth
     */
    add(present: boolean, earned: number, possible: number): void {
        this.maxPossible += possible;
        this.total += 1;
        if (!present) return;
        this.earned += earned;
        this.possible += possible;
        this.measured += 1;
    }

    result(): PillarResult {
        const coverage = this.maxPossible > 0 ? this.possible / this.maxPossible : 0;
        const raw = this.possible > 0 ? (this.earned / this.possible) * 100 : NEUTRAL;
        const score = NEUTRAL + (raw - NEUTRAL) * confidenceWeight(coverage);
        return {
            score: Math.max(0, Math.min(100, Math.round(score))),
            raw: Math.round(raw),
            earned: this.earned,
            possible: this.possible,
            maxPossible: this.maxPossible,
            coverage,
            measured: this.measured,
            total: this.total,
        };
    }

    score(): number {
        return this.result().score;
    }
}

/** Per-pillar coverage, surfaced so the UI can flag a thin pillar. */
export interface ScoreCoverage {
    valuation: PillarResult;
    trend: PillarResult;
    timing: PillarResult;
}

/**
 * Coverage below this reads as "barely measured" in the UI — the pillar
 * is shown with a warning rather than as a confident number.
 */
export const THIN_COVERAGE = 0.5;
