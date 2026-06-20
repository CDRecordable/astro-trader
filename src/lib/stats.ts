// ============================================================
// Statistics toolkit — honest significance testing
// ============================================================
// Shared by every astro module so that "gap > 0" claims become
// real, reproducible significance readouts (p-value + baseline).
//
// Design notes:
// - Pure & dependency-free.
// - Randomized tests use a SEEDED PRNG (mulberry32) so the p-value
//   is reproducible and does not jitter between renders.
// - All return inputs are DECIMAL daily returns (0.01 = +1%), unless
//   a function name says otherwise.
// ============================================================

// ── Seeded PRNG (mulberry32) ─────────────────────────────────
/** Deterministic PRNG. Same seed → same sequence. Range [0,1). */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Basic descriptive statistics ─────────────────────────────
export function mean(xs: number[]): number {
    if (xs.length === 0) return 0;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample variance (n-1 denominator). Returns 0 for n < 2. */
export function variance(xs: number[]): number {
    const n = xs.length;
    if (n < 2) return 0;
    const m = mean(xs);
    return xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (n - 1);
}

export function stdDev(xs: number[]): number {
    return Math.sqrt(variance(xs));
}

/** Standard error of the mean. */
export function stdError(xs: number[]): number {
    if (xs.length < 2) return 0;
    return stdDev(xs) / Math.sqrt(xs.length);
}

// ── Returns helpers ──────────────────────────────────────────
/** Convert a price series to consecutive decimal returns (skips non-positive prev). */
export function pricesToReturns(prices: number[]): number[] {
    const out: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] > 0) out.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return out;
}

/**
 * Correct annualization by COMPOUNDING (geometric), not summing.
 * Given n decimal returns sampled at `periodsPerYear` cadence, returns the
 * equivalent annual return: (∏(1+rᵢ))^(periodsPerYear/n) − 1.
 * Returns a DECIMAL (0.07 = +7%/yr). Empty input → 0.
 */
export function annualizedReturn(returns: number[], periodsPerYear = 252): number {
    const n = returns.length;
    if (n === 0) return 0;
    let growth = 1;
    for (const r of returns) growth *= 1 + r;
    if (growth <= 0) return -1; // total wipeout guard
    return Math.pow(growth, periodsPerYear / n) - 1;
}

/** Annualized volatility = stdev of period returns × √periodsPerYear (decimal). */
export function annualizedVolatility(returns: number[], periodsPerYear = 252): number {
    return stdDev(returns) * Math.sqrt(periodsPerYear);
}

/**
 * Annualized Sharpe ratio. riskFreeAnnual is a DECIMAL (0.04 = 4%/yr).
 * Returns 0 when volatility is 0 or sample too small.
 */
export function sharpeRatio(returns: number[], riskFreeAnnual = 0, periodsPerYear = 252): number {
    if (returns.length < 2) return 0;
    const vol = annualizedVolatility(returns, periodsPerYear);
    if (vol === 0) return 0;
    return (annualizedReturn(returns, periodsPerYear) - riskFreeAnnual) / vol;
}

// ── Normal CDF (Abramowitz & Stegun 7.1.26 erf approx) ───────
/** Φ(z): standard normal cumulative distribution. Max abs error ≈ 1.5e-7. */
export function normalCdf(z: number): number {
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * x);
    const y =
        1 -
        ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
            t *
            Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
}

// ── Two-sample comparison ────────────────────────────────────
export interface ComparisonResult {
    nA: number;
    nB: number;
    meanA: number;            // decimal daily mean, group A
    meanB: number;            // decimal daily mean, group B
    annualizedA: number;      // decimal annualized return, group A
    annualizedB: number;      // decimal annualized return, group B
    diffAnnualized: number;   // annualizedA − annualizedB (decimal)
    /** Two-sided p-value (empirical permutation p-value by default). */
    pValue: number;
    /** Convenience: pValue < 0.05. */
    significant: boolean;
    /** Human label: 'strong' (<0.01) | 'moderate' (<0.05) | 'weak' (<0.10) | 'none'. */
    strength: SignificanceStrength;
    method: "permutation" | "ztest";
}

export type SignificanceStrength = "strong" | "moderate" | "weak" | "none";

export function significanceStrength(p: number): SignificanceStrength {
    if (p < 0.01) return "strong";
    if (p < 0.05) return "moderate";
    if (p < 0.1) return "weak";
    return "none";
}

/**
 * Parametric two-sample z-test on the difference of mean daily returns.
 * Fast, good for large n. Two-sided p-value via the normal approximation.
 * Caveat: assumes independent observations — daily market returns are mildly
 * serially correlated, so treat p as a lower bound on the true value.
 */
export function zTestDiffMeans(a: number[], b: number[]): number {
    if (a.length < 2 || b.length < 2) return 1;
    const se = Math.sqrt(variance(a) / a.length + variance(b) / b.length);
    if (se === 0) return 1;
    const z = (mean(a) - mean(b)) / se;
    return 2 * (1 - normalCdf(Math.abs(z)));
}

/**
 * Permutation test: shuffles the group labels `iterations` times and counts
 * how often the |shuffled mean difference| ≥ |observed mean difference|.
 * This is the honest, distribution-free baseline — it directly answers
 * "could this gap arise by chance from the same pooled days?".
 * Deterministic for a given seed.
 */
export function permutationPValue(
    a: number[],
    b: number[],
    iterations = 5000,
    seed = 12345,
): number {
    const nA = a.length;
    const nB = b.length;
    if (nA < 2 || nB < 2) return 1;
    const pooled = [...a, ...b];
    const N = pooled.length;
    const observed = Math.abs(mean(a) - mean(b));
    const rng = mulberry32(seed);

    let countExtreme = 0;
    for (let it = 0; it < iterations; it++) {
        // Fisher–Yates partial shuffle of `pooled`
        for (let i = N - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = pooled[i];
            pooled[i] = pooled[j];
            pooled[j] = tmp;
        }
        let sumA = 0;
        for (let i = 0; i < nA; i++) sumA += pooled[i];
        let sumB = 0;
        for (let i = nA; i < N; i++) sumB += pooled[i];
        const diff = Math.abs(sumA / nA - sumB / nB);
        if (diff >= observed - 1e-12) countExtreme++;
    }
    // +1 smoothing (avoids reporting p=0, which is never justified by finite sims)
    return (countExtreme + 1) / (iterations + 1);
}

/**
 * Full regime comparison used by Lunar / Solar / Mercury / Sector views.
 * `periodsPerYear`: 252 for stock trading days, 365 for crypto.
 */
export function compareRegimes(
    groupA: number[],
    groupB: number[],
    opts: { periodsPerYear?: number; method?: "permutation" | "ztest"; iterations?: number; seed?: number } = {},
): ComparisonResult {
    const { periodsPerYear = 252, method = "permutation", iterations = 5000, seed = 12345 } = opts;
    const annualizedA = annualizedReturn(groupA, periodsPerYear);
    const annualizedB = annualizedReturn(groupB, periodsPerYear);
    const pValue =
        method === "ztest"
            ? zTestDiffMeans(groupA, groupB)
            : permutationPValue(groupA, groupB, iterations, seed);

    return {
        nA: groupA.length,
        nB: groupB.length,
        meanA: mean(groupA),
        meanB: mean(groupB),
        annualizedA,
        annualizedB,
        diffAnnualized: annualizedA - annualizedB,
        pValue,
        significant: pValue < 0.05,
        strength: significanceStrength(pValue),
        method,
    };
}

// ── Monte-Carlo baseline for a rate / proportion ─────────────
export interface BaselineResult {
    observed: number;      // observed statistic (e.g. reversion rate 0..1)
    baselineMean: number;  // mean of the statistic under random sampling
    baselineStd: number;
    /** Percentile of `observed` within the random baseline distribution (0..100). */
    percentile: number;
    /** One-sided p-value: P(random ≥ observed). */
    pValue: number;
    /** Lift over chance: observed − baselineMean. */
    lift: number;
    iterations: number;
}

/**
 * Generic Monte-Carlo baseline. `sampleStatistic(rng)` must draw ONE random
 * comparable sample (e.g. pick N random dates and compute their reversion rate)
 * and return its statistic. Compares the real `observed` value against the
 * distribution of random draws. Deterministic for a given seed.
 *
 * This is the control the Fibonacci-confluence feature was missing: it answers
 * "is the confluence reversion rate higher than at random dates?".
 */
export function monteCarloBaseline(
    observed: number,
    sampleStatistic: (rng: () => number) => number,
    iterations = 2000,
    seed = 98765,
): BaselineResult {
    const rng = mulberry32(seed);
    const draws: number[] = [];
    let geCount = 0;
    for (let i = 0; i < iterations; i++) {
        const s = sampleStatistic(rng);
        draws.push(s);
        if (s >= observed - 1e-12) geCount++;
    }
    const baselineMean = mean(draws);
    const baselineStd = stdDev(draws);
    const below = draws.filter((d) => d < observed).length;
    return {
        observed,
        baselineMean,
        baselineStd,
        percentile: (below / iterations) * 100,
        pValue: (geCount + 1) / (iterations + 1),
        lift: observed - baselineMean,
        iterations,
    };
}

// ── Bootstrap confidence interval ────────────────────────────
export interface BootstrapCI {
    point: number;
    lower: number;
    upper: number;
    confidence: number; // e.g. 0.95
}

/**
 * Percentile bootstrap CI for any statistic of a single sample.
 * Deterministic for a given seed.
 */
export function bootstrapCI(
    values: number[],
    statistic: (xs: number[]) => number,
    opts: { iterations?: number; confidence?: number; seed?: number } = {},
): BootstrapCI {
    const { iterations = 2000, confidence = 0.95, seed = 24680 } = opts;
    const n = values.length;
    const point = statistic(values);
    if (n < 2) return { point, lower: point, upper: point, confidence };

    const rng = mulberry32(seed);
    const stats: number[] = [];
    const resample = new Array<number>(n);
    for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < n; i++) resample[i] = values[Math.floor(rng() * n)];
        stats.push(statistic(resample));
    }
    stats.sort((a, b) => a - b);
    const alpha = (1 - confidence) / 2;
    const lo = stats[Math.floor(alpha * iterations)];
    const hi = stats[Math.min(iterations - 1, Math.floor((1 - alpha) * iterations))];
    return { point, lower: lo, upper: hi, confidence };
}

// ── Formatting helpers (for UI) ──────────────────────────────
/** Human-readable p-value: "p < 0.001", "p = 0.03", "p = 0.42". */
export function formatPValue(p: number): string {
    if (p < 0.001) return "p < 0.001";
    if (p < 0.01) return `p = ${p.toFixed(3)}`;
    return `p = ${p.toFixed(2)}`;
}

/** Pearson correlation (mirrors the helper in macro-algorithm, kept here for reuse). */
export function pearson(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    const mx = mean(x.slice(0, n));
    const my = mean(y.slice(0, n));
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - mx;
        const dy = y[i] - my;
        num += dx * dy;
        dx2 += dx * dx;
        dy2 += dy * dy;
    }
    const den = Math.sqrt(dx2 * dy2);
    return den === 0 ? 0 : num / den;
}
