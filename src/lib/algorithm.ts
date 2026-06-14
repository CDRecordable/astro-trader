// ============================================================
// Astro Trader Insights - Scoring Algorithm
// ============================================================
// Each scoring function is isolated for testability and future extension.
// v2: Tier-adaptive hard filters (small/mid/large cap).

import type { Company, AlgorithmScore, MacroContext, MarketCapTier } from "./types";
import { calculateCryptoScore } from "./api/crypto-algorithm";
import type { CoinGeckoMarketData } from "./api/coingecko-client";
import { clamp, proximityTo52WeekLow } from "./utils";

/**
 * Reconstructs a dummy CoinGeckoMarketData from a Company object just to pass into the score calculator.
 */
function companyToMockCoinGecko(c: Company): CoinGeckoMarketData {
    return {
        id: c.id.replace("cg_", ""),
        symbol: c.ticker,
        name: c.name,
        current_price: c.metrics.currentPrice,
        market_cap: c.metrics.marketCap * 1_000_000,
        market_cap_rank: 0,
        fully_diluted_valuation: null,
        total_volume: (c.metrics.fcfYield * c.metrics.marketCap) * 1_000_000, // Reversing the map
        high_24h: 0,
        low_24h: 0,
        price_change_24h: 0,
        price_change_percentage_24h: c.metrics.ebitMargin * 100, // Reversing
        market_cap_change_24h: 0,
        market_cap_change_percentage_24h: 0,
        circulating_supply: c.metrics.bookToMarket, // Reversing
        max_supply: 1, // So ratio is just bookToMarket
        total_supply: null,
        ath: c.metrics.fiftyTwoWeekHigh,
        ath_change_percentage: c.metrics.fiftyTwoWeekHigh ? ((c.metrics.currentPrice - c.metrics.fiftyTwoWeekHigh) / c.metrics.fiftyTwoWeekHigh) * 100 : 0,
        atl: c.metrics.fiftyTwoWeekLow,
        atl_change_percentage: c.metrics.fiftyTwoWeekLow ? ((c.metrics.currentPrice - c.metrics.fiftyTwoWeekLow) / c.metrics.fiftyTwoWeekLow) * 100 : 0,
        ath_date: "",
        atl_date: "",
        price_change_percentage_7d_in_currency: c.metrics.grossMargin * 100, // Reversing
    };
}

// ── Weights ──────────────────────────────────────────────────
// Serious-mode scoring: fundamentals only. The cosmic factor was removed
// from the composite (it was a constant across all stocks — inert for
// ranking — and pure astrology has no place in the analysis app).
const WEIGHTS = {
    valuation: 0.40,   // FCF Yield + B/M → "not overpriced"
    trend: 0.30,       // Quality levels + improving fundamentals
    timing: 0.30,      // Position in range + uptrend ignition
    // macro adjustment applied as multiplier ×0.90-1.00
} as const;

// ── Tier Classification ─────────────────────────────────────
export function classifyTier(marketCapM: number): MarketCapTier {
    if (marketCapM >= 50_000) return "large";    // > $50B
    if (marketCapM >= 2_000) return "mid";       // $2B - $50B
    return "small";                               // < $2B
}

export function tierLabel(tier: MarketCapTier): string {
    switch (tier) {
        case "large": return "Large-Cap";
        case "mid": return "Mid-Cap";
        case "small": return "Small-Cap";
    }
}

// ── 1. Hard Filters (Tier-Adaptive) ─────────────────────────
export function applyHardFilters(
    company: Company,
    tier: MarketCapTier,
    maxMarketCap: number = 5_000_000
): { passes: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const m = company.metrics;

    // Market cap filter (universal)
    if (m.marketCap > maxMarketCap) {
        reasons.push(`Market cap $${m.marketCap.toFixed(0)}M exceeds $${maxMarketCap}M`);
    }

    switch (tier) {
        case "small":
            // STRICT: Small-caps must have positive equity and operating profit
            if (m.totalEquity <= 0)
                reasons.push("Negative equity");
            if (m.operatingProfit <= 0)
                reasons.push("Negative operating profit");
            break;

        case "mid":
            // MODERATE: Allow negative equity if FCF is positive (buybacks)
            if (m.totalEquity <= 0 && m.fcfYield <= 0)
                reasons.push("Negative equity with no positive FCF");
            if (m.operatingProfit <= 0)
                reasons.push("Negative operating profit");
            break;

        case "large":
            // RELAXED: Large-caps often have negative equity (AAPL buybacks)
            // Only flag if operating profit AND FCF are both negative
            if (m.operatingProfit <= 0 && m.fcfYield <= 0)
                reasons.push("No operating profit and no positive FCF");
            break;
    }

    // ── Solvency filters (all tiers — leverage kills regardless of size) ──
    if (m.dataQuality?.solvency) {
        if (m.netDebtToEbitda !== undefined && m.netDebtToEbitda > 5) {
            reasons.push(`Excessive leverage: net debt ${m.netDebtToEbitda.toFixed(1)}× EBITDA (>5×)`);
        }
        if (m.interestCoverage !== undefined && m.interestCoverage < 1) {
            reasons.push(`EBIT does not cover interest expense (coverage ${m.interestCoverage.toFixed(1)}×)`);
        }
    }

    return { passes: reasons.length === 0, reasons };
}

// ── 2. Valuation Score ──────────────────────────────────────
// Leverage-proof valuation: FCF yield on ENTERPRISE VALUE (mcap + net debt),
// book-to-market on TANGIBLE book when available, plus an explicit solvency
// block. A levered company can no longer look artificially cheap: its debt
// is in the denominator and its leverage is scored directly.
// Blocks without data are renormalized out (neutral), as in scoreTrend.
export function scoreValuation(company: Company, tier: MarketCapTier): number {
    const m = company.metrics;
    const hasSolvency = m.dataQuality?.solvency === true;

    let earned = 0;
    let possible = 0;

    // ── Block A: FCF yield (50) — on EV when net debt is known ──
    possible += 50;
    if (hasSolvency && m.evFcfYield !== undefined) {
        // EV-based targets (structurally lower than equity-based ones)
        const evTargets = {
            small: { full: 0.08, mid: 0.04 },
            mid: { full: 0.05, mid: 0.025 },
            large: { full: 0.035, mid: 0.015 },
        }[tier];
        if (m.evFcfYield >= evTargets.full) earned += 50;
        else if (m.evFcfYield >= evTargets.mid) earned += 33 + (m.evFcfYield - evTargets.mid) / (evTargets.full - evTargets.mid) * 17;
        else if (m.evFcfYield > 0) earned += (m.evFcfYield / evTargets.mid) * 33;
    } else {
        // Fallback: equity-based FCF yield (legacy data without net-debt info)
        const t = {
            small: { full: 0.10, mid: 0.05 },
            mid: { full: 0.06, mid: 0.03 },
            large: { full: 0.04, mid: 0.02 },
        }[tier];
        if (m.fcfYield >= t.full) earned += 50;
        else if (m.fcfYield >= t.mid) earned += 33 + (m.fcfYield - t.mid) / (t.full - t.mid) * 17;
        else if (m.fcfYield > 0) earned += (m.fcfYield / t.mid) * 33;
    }

    // ── Block B: book-to-market (25) — tangible book preferred ──
    possible += 25;
    const useTangible = m.tangibleBookToMarket !== undefined;
    const bm = useTangible ? m.tangibleBookToMarket! : m.bookToMarket;
    // Tangible book strips goodwill → use lower thresholds for it
    const bmTargets = useTangible
        ? { small: { full: 0.60, mid: 0.30 }, mid: { full: 0.45, mid: 0.18 }, large: { full: 0.22, mid: 0.07 } }[tier]
        : { small: { full: 0.80, mid: 0.40 }, mid: { full: 0.60, mid: 0.25 }, large: { full: 0.30, mid: 0.10 } }[tier];
    if (bm >= bmTargets.full) earned += 25;
    else if (bm >= bmTargets.mid) earned += 13 + (bm - bmTargets.mid) / (bmTargets.full - bmTargets.mid) * 12;
    else if (bm > 0) earned += (bm / bmTargets.mid) * 13;
    // bm ≤ 0 (negative tangible book — all goodwill): 0 points.

    // ── Block C: solvency (25) — leverage + interest coverage ──
    if (hasSolvency) {
        if (m.netDebtToEbitda !== undefined) {
            possible += 15;
            const lev = m.netDebtToEbitda;
            if (lev < 0) earned += 15;        // net cash
            else if (lev < 1.5) earned += 12;
            else if (lev < 3) earned += 8;
            else if (lev < 4) earned += 3;
            // ≥4×: 0 points (and ≥5× already hard-fails)
        }
        if (m.interestCoverage !== undefined) {
            possible += 10;
            const cov = m.interestCoverage;
            if (cov > 8) earned += 10;
            else if (cov > 4) earned += 7;
            else if (cov > 2) earned += 4;
            else if (cov > 1) earned += 1;
        }
    }

    return possible > 0 ? clamp((earned / possible) * 100, 0, 100) : 50;
}

// ── 3. Trend & Quality Score ────────────────────────────────
// Quality LEVELS (always available) + YoY trend + reinvestment efficiency.
// Unavailable metric groups are RENORMALIZED OUT (neutral), never scored
// as a failure: score = earned / possible × 100 over the available blocks.
export function scoreTrend(company: Company): number {
    const m = company.metrics;
    // Legacy data (mock/older cache rows) carries no flags → assume present,
    // which preserves the old behavior for that data.
    const dq = m.dataQuality ?? { deltas: true, roc: true, growth: true };

    let earned = 0;
    let possible = 0;

    // ── Block A: quality levels (TTM, virtually always available) ──
    possible += 15; // EBIT margin
    if (m.ebitMargin > 0.25) earned += 15;
    else if (m.ebitMargin > 0.15) earned += 12;
    else if (m.ebitMargin > 0.10) earned += 8;
    else if (m.ebitMargin > 0.05) earned += 4;
    else if (m.ebitMargin > 0) earned += 2;

    possible += 15; // ROE — with a leverage reality check:
    // high debt mechanically inflates ROE, so a LOW ROE on a levered balance
    // sheet means the underlying return on capital is genuinely poor.
    const leveredAndWeak = dq.solvency === true
        && m.netDebtToEbitda !== undefined && m.netDebtToEbitda > 3
        && m.roe < 0.10;
    if (leveredAndWeak) { /* 0 points — leverage-inflated yet still weak */ }
    else if (m.roe > 0.25) earned += 15;
    else if (m.roe > 0.15) earned += 12;
    else if (m.roe > 0.10) earned += 8;
    else if (m.roe > 0) earned += 4;

    possible += 10; // Gross margin
    if (m.grossMargin > 0.50) earned += 10;
    else if (m.grossMargin > 0.35) earned += 7;
    else if (m.grossMargin > 0.20) earned += 4;

    if (dq.roc) {
        possible += 10; // Return on capital (EBIT / invested capital)
        if (m.roc > 0.20) earned += 10;
        else if (m.roc > 0.12) earned += 7;
        else if (m.roc > 0.08) earned += 5;
        else if (m.roc > 0) earned += 2;
    }

    // ── Block B: YoY improvement (needs 2 annual statements) ──
    if (dq.deltas) {
        possible += 10; // EBIT margin trend (flat within ±1pp tolerated)
        if (m.ebitMarginDelta > 0.01) earned += 10;
        else if (m.ebitMarginDelta > 0) earned += 7;
        else if (m.ebitMarginDelta > -0.01) earned += 4;

        possible += 10; // ROE trend
        if (m.roeDelta > 0.01) earned += 10;
        else if (m.roeDelta > 0) earned += 7;
        else if (m.roeDelta > -0.01) earned += 4;

        possible += 10; // Gross margin trend
        if (m.grossMarginDelta > 0.005) earned += 10;
        else if (m.grossMarginDelta > 0) earned += 7;
        else if (m.grossMarginDelta > -0.005) earned += 4;
    }

    // ── Block C: reinvestment efficiency ──
    if (dq.growth) {
        possible += 20;
        // Nuance: shrinking assets at a levered company is forced deleveraging,
        // not capital efficiency — score it neutral instead of rewarding it.
        const deleveraging = m.assetGrowth < -0.02
            && dq.solvency === true
            && m.netDebtToEbitda !== undefined && m.netDebtToEbitda > 3;
        if (deleveraging) earned += 10;
        else if (m.ebitdaGrowth > 0 && m.ebitdaGrowth >= m.assetGrowth) earned += 20;
        else if (m.ebitdaGrowth > 0) earned += 12;
        else if (m.ebitdaGrowth > -0.05) earned += 5;
    }

    // ── Block D: shareholder dilution (share-count CAGR) ──
    if (dq.dilution && m.sharesDilution !== undefined) {
        possible += 10;
        if (m.sharesDilution < -0.01) earned += 10;       // buying back shares
        else if (m.sharesDilution <= 0.005) earned += 7;  // flat share count
        else if (m.sharesDilution <= 0.03) earned += 3;   // mild dilution
        // >3%/yr dilution: 0 — silently robbing shareholders
    }

    // ── Block E: accruals (earnings backed by cash?) ──
    if (dq.accruals && m.accrualRatio !== undefined) {
        possible += 10;
        if (m.accrualRatio <= 0) earned += 10;            // cash flow ≥ reported earnings
        else if (m.accrualRatio <= 0.03) earned += 7;
        else if (m.accrualRatio <= 0.08) earned += 3;
        // high accruals: 0 — possible aggressive accounting
    }

    // ── Block F: analyst EPS estimate revisions (strong empirical factor) ──
    if (dq.revisions && (m.epsRevisionsUp30d !== undefined || m.epsTrend30d !== undefined)) {
        possible += 10;
        const net = (m.epsRevisionsUp30d ?? 0) - (m.epsRevisionsDown30d ?? 0);
        const drift = m.epsTrend30d ?? 0;
        if (net > 0 && drift >= 0) earned += 10;      // analysts raising estimates
        else if (net > 0) earned += 7;
        else if (net === 0 && drift >= -0.01) earned += 5;
        else if (drift > -0.03) earned += 2;
        // net cuts with estimate falling >3%: 0 — negative momentum in fundamentals
    }

    // Nothing measurable at all → neutral, not zero.
    return possible > 0 ? clamp((earned / possible) * 100, 0, 100) : 50;
}

// ── 4. Timing Score ─────────────────────────────────────────
// Tuned for the opportunity hunter: cheap relative to its own range AND
// showing uptrend ignition — not chasing highs, not catching falling knives.
export function scoreTiming(company: Company): number {
    const m = company.metrics;
    let score = 0;

    // A. Position in 52-week range — "not overpriced" (0-30)
    // 0 = at the 52w low, 1 = at the high.
    const range = proximityTo52WeekLow(
        m.currentPrice,
        m.fiftyTwoWeekLow,
        m.fiftyTwoWeekHigh
    );
    if (range <= 0.35) score += 30;       // bargain zone
    else if (range <= 0.60) score += 20;  // reasonable
    else if (range <= 0.85) score += 8;   // getting expensive
    // top 15% of range: 0 — chasing highs

    // B. Short-term ignition: price vs 50-day average (0-35)
    const vs50 = m.oneMonthReturn;
    if (vs50 > 0 && vs50 <= 0.12) score += 35;  // fresh uptrend, not extended
    else if (vs50 > 0.12) score += 15;          // extended — late entry
    else if (vs50 > -0.05) score += 18;         // basing just under the average
    else score += 4;                            // falling knife

    // C. Medium trend: price vs 200-day average (0-25)
    const vs200 = m.sixMonthReturn;
    if (vs200 > 0 && vs200 <= 0.20) score += 25; // confirmed, room to run
    else if (vs200 > 0.20) score += 10;          // already ran hard
    else if (vs200 > -0.15) score += 14;         // turning zone
    else score += 5;                             // deep downtrend

    // D. Ignition bonus: above BOTH averages while still cheap in range (0-10)
    if (vs50 > 0 && vs200 > 0 && range <= 0.60) score += 10;

    // E. Insider cluster-buying bonus (additive, US Form 4 data only).
    // Multiple insiders buying in the open market is one of the best-evidenced
    // bullish signals; absence of data simply means no bonus, never a penalty.
    if (m.dataQuality?.insiders
        && (m.insiderBuyCount6m ?? 0) >= 3
        && ((m.insiderNetPct6m ?? 0) > 0 || (m.insiderBuyCount6m ?? 0) >= 2 * (m.insiderSellCount6m ?? 0))) {
        score += 8;
    }

    return clamp(score, 0, 100);
}

// ── 5. Macro Adjustment ─────────────────────────────────────
export function macroMultiplier(macro: MacroContext): number {
    switch (macro.interestRateTrend) {
        case "rising": return 0.90;
        case "stable": return 0.95;
        case "falling": return 1.00;
    }
}

// ── Composite Score ─────────────────────────────────────────
export function evaluateCompany(
    company: Company,
    macro: MacroContext,
    maxMarketCap: number = 5_000_000
): AlgorithmScore {
    if (company.exchange === "Crypto") {
        return calculateCryptoScore(companyToMockCoinGecko(company));
    }

    const tier = classifyTier(company.metrics.marketCap);
    const { passes, reasons } = applyHardFilters(company, tier, maxMarketCap);

    const valuationScore = Math.round(scoreValuation(company, tier));
    const trendScore = Math.round(scoreTrend(company));
    const timingScore = Math.round(scoreTiming(company));
    // Cosmic factor intentionally excluded from the serious composite:
    // it was identical for every stock on a given day (inert for ranking).
    const cosmicFluidityScore = 0;
    const macroAdj = macroMultiplier(macro);

    const rawScore =
        valuationScore * WEIGHTS.valuation +
        trendScore * WEIGHTS.trend +
        timingScore * WEIGHTS.timing;

    const totalScore = clamp(Math.round(rawScore * macroAdj), 0, 100);

    let recommendation: AlgorithmScore["recommendation"];
    if (!passes) recommendation = "AVOID";
    else if (totalScore >= 75) recommendation = "STRONG_BUY";
    else if (totalScore >= 55) recommendation = "BUY";
    else if (totalScore >= 35) recommendation = "HOLD";
    else recommendation = "AVOID";

    return {
        companyId: company.id,
        ticker: company.ticker,
        name: company.name,
        tier,
        passesHardFilters: passes,
        hardFilterReasons: reasons,
        valuationScore,
        trendScore,
        timingScore,
        cosmicFluidityScore,
        macroAdjustment: macroAdj,
        totalScore,
        recommendation,
    };
}

// ── Batch Evaluation ────────────────────────────────────────
export function evaluateAll(
    companies: Company[],
    macro: MacroContext,
    maxMarketCap: number = 5_000_000
): AlgorithmScore[] {
    return companies
        .map((c) => evaluateCompany(c, macro, maxMarketCap))
        .sort((a, b) => b.totalScore - a.totalScore);
}
