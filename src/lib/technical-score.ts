// ============================================================
// Technical score — 3 renormalized pillars over the indicator snapshot
// ============================================================
// Same scoring philosophy as the fundamental engines: metrics we can't
// measure (no OHLC → no stochastic/ATR/ADX; no volume → no OBV) leave the
// exam instead of failing it, and a thinly-measured pillar is pulled toward
// neutral by the shared coverage shrink. No hard filters here — the technical
// read is an overlay, not a gatekeeper.
//
// Thresholds reuse the crypto ladder (72/56/40): the technical signal is
// noisier and shorter-horizon than fundamentals, so it does not deserve the
// stock engine's stricter 75 bar.

import { Pillar, type PillarResult } from "./scoring";
import {
    computeSnapshot,
    type Candle,
    type IndicatorReading,
    type TechnicalSnapshot,
    type TechnicalSignal,
} from "./technical";

export type TechnicalVerdict = "strong" | "moderate" | "weak" | "avoid";

export interface TechnicalScore {
    score: number;                       // 0-100
    verdict: TechnicalVerdict;
    pillars: {
        trend: PillarResult;
        momentum: PillarResult;
        volatility: PillarResult;
    };
    /** Fixed blend used for the composite — surfaced for the UI arithmetic. */
    weights: { trend: number; momentum: number; volatility: number };
    snapshot: TechnicalSnapshot;
    /** Date of the last candle the score was computed from. */
    asOf: string;
}

export const TECHNICAL_WEIGHTS = { trend: 0.4, momentum: 0.35, volatility: 0.25 } as const;

/** Minimum candles for the score to mean anything at all. */
const MIN_CANDLES = 60;

// ── Signal → points helper ───────────────────────────────────
// Every metric grades the same way: neutral = half marks, bullish scales up
// with strength, bearish scales down. Keeps the mapping legible and uniform.
function pts(reading: IndicatorReading | undefined, possible: number): {
    present: boolean; earned: number;
} {
    if (!reading || !reading.available) return { present: false, earned: 0 };
    const half = possible / 2;
    const dir = reading.signal === "bullish" ? 1 : reading.signal === "bearish" ? -1 : 0;
    return { present: true, earned: Math.round(half + dir * reading.strength * half) };
}

function get(snapshot: TechnicalSnapshot, id: IndicatorReading["id"]): IndicatorReading | undefined {
    return snapshot.readings.find((r) => r.id === id);
}

// ── Main entry ───────────────────────────────────────────────

export function computeTechnicalScore(candles: Candle[]): TechnicalScore {
    const snapshot = computeSnapshot(candles);
    const s = snapshot;

    // ── Pillar 1: Trend (40%) — mostly close-only, so crypto stays covered ──
    const trend = new Pillar();
    {
        const structure = get(s, "sma_structure");
        // Price vs SMA200 (the regime line) and the 50/200 structure are the
        // same reading split in two weights: level (10) + alignment (10).
        const p1 = pts(structure, 10);
        trend.add(p1.present, p1.earned, 10);

        const cross = get(s, "golden_cross");
        const p2 = pts(cross, 10);
        trend.add(p2.present, p2.earned, 10);

        // Price vs SMA50 — short trend. Derived from structure's extra.
        if (structure?.available && structure.extra?.sma50 !== undefined && candles.length) {
            const price = candles[candles.length - 1].close;
            const rel = (price - structure.extra.sma50) / structure.extra.sma50;
            const earned = rel > 0.05 ? 6 : rel > 0 ? 5 : rel > -0.05 ? 2 : 0;
            trend.add(true, earned, 6);
        } else {
            trend.add(false, 0, 6);
        }

        const macdR = get(s, "macd");
        const p4 = pts(macdR, 8);
        trend.add(p4.present, p4.earned, 8);

        const adxR = get(s, "adx");           // N/D without OHLC
        const p5 = pts(adxR, 6);
        trend.add(p5.present, p5.earned, 6);
    }

    // ── Pillar 2: Momentum (35%) ──
    const momentum = new Pillar();
    {
        const p1 = pts(get(s, "rsi"), 10);
        momentum.add(p1.present, p1.earned, 10);

        const p2 = pts(get(s, "divergence"), 6);
        momentum.add(p2.present, p2.earned, 6);

        const p3 = pts(get(s, "bollinger"), 7);
        momentum.add(p3.present, p3.earned, 7);

        const p4 = pts(get(s, "macd_momentum"), 6);
        momentum.add(p4.present, p4.earned, 6);

        const p5 = pts(get(s, "stochastic"), 6); // N/D without OHLC
        momentum.add(p5.present, p5.earned, 6);
    }

    // ── Pillar 3: Volume & Volatility (25%) ──
    const volatility = new Pillar();
    {
        const p1 = pts(get(s, "obv"), 8);          // N/D without volume
        volatility.add(p1.present, p1.earned, 8);

        const p2 = pts(get(s, "volume_trend"), 5); // N/D without volume
        volatility.add(p2.present, p2.earned, 5);

        // Squeeze: compression itself is direction-less, but a squeeze while
        // the trend pillar leans one way slightly favors continuation. We keep
        // it neutral-graded (half marks) and only surface it as a flag.
        const sq = get(s, "squeeze");
        volatility.add(!!sq?.available, sq?.available ? 2.5 : 0, 5);

        // Volatility regime from ATR% — moderate vol scores best; extremes
        // (dead or violent) score neutral-to-low. Close-only fallback uses
        // squeeze bandwidth, so this stays partially covered for crypto.
        const atrR = get(s, "atr");
        if (atrR?.available && atrR.value !== null) {
            const v = atrR.value; // ATR as % of price
            const earned = v < 1 ? 2 : v < 3 ? 4 : v < 5 ? 3 : 1;
            volatility.add(true, earned, 4);
        } else {
            volatility.add(false, 0, 4);
        }

        // Annualized close-to-close volatility — always computable.
        if (candles.length >= 40) {
            const closes = candles.map((c) => c.close);
            let ss = 0, n = 0;
            for (let i = closes.length - 30; i < closes.length; i++) {
                if (i <= 0) continue;
                const r = Math.log(closes[i] / closes[i - 1]);
                ss += r * r; n++;
            }
            const ann = n ? Math.sqrt((ss / n) * 252) * 100 : 0;
            // Calm-to-moderate vol is tradeable; chaos is not.
            const earned = ann < 20 ? 3 : ann < 40 ? 2 : ann < 70 ? 1 : 0;
            volatility.add(true, earned, 3);
        } else {
            volatility.add(false, 0, 3);
        }
    }

    const trendR = trend.result();
    const momentumR = momentum.result();
    const volatilityR = volatility.result();

    const composite =
        trendR.score * TECHNICAL_WEIGHTS.trend +
        momentumR.score * TECHNICAL_WEIGHTS.momentum +
        volatilityR.score * TECHNICAL_WEIGHTS.volatility;

    const score = Math.max(0, Math.min(100, Math.round(composite)));

    let verdict: TechnicalVerdict;
    if (score >= 72) verdict = "strong";
    else if (score >= 56) verdict = "moderate";
    else if (score >= 40) verdict = "weak";
    else verdict = "avoid";

    return {
        score,
        verdict,
        pillars: { trend: trendR, momentum: momentumR, volatility: volatilityR },
        weights: { ...TECHNICAL_WEIGHTS },
        snapshot,
        asOf: candles.length ? candles[candles.length - 1].date : "",
    };
}

/** Guard used by callers to decide whether a score is worth showing. */
export function hasEnoughHistory(candles: Candle[]): boolean {
    return candles.length >= MIN_CANDLES;
}

// ── Overall stance for quick badges ──────────────────────────
// The single simplest read: where do the directional signals point, weighted
// by strength? Used by the ficha block and the AI prompt as grounding.
export function overallStance(snapshot: TechnicalSnapshot): {
    stance: TechnicalSignal; bullish: number; bearish: number;
} {
    let bull = 0, bear = 0;
    for (const r of snapshot.readings) {
        if (!r.available) continue;
        if (r.signal === "bullish") bull += r.strength;
        if (r.signal === "bearish") bear += r.strength;
    }
    const gap = bull - bear;
    return {
        stance: gap > 0.6 ? "bullish" : gap < -0.6 ? "bearish" : "neutral",
        bullish: Math.round(bull * 10) / 10,
        bearish: Math.round(bear * 10) / 10,
    };
}
