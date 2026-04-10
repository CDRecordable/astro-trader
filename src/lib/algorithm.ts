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
const WEIGHTS = {
    valuation: 0.40,   // FCF Yield + B/M → strongest predictors
    trend: 0.30,       // Margins, ROE/ROC, reinvestment efficiency
    timing: 0.20,      // 52-wk low proximity + momentum
    macro: 0.10,       // interest-rate adjustment
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

    return { passes: reasons.length === 0, reasons };
}

// ── 2. Valuation Score ──────────────────────────────────────
export function scoreValuation(company: Company, tier: MarketCapTier): number {
    const m = company.metrics;
    let score = 0;

    // FCF Yield scoring adapts by tier
    const fcfTargets = {
        small: { full: 0.10, mid: 0.05 },    // Small-caps: need high FCF
        mid: { full: 0.06, mid: 0.03 },       // Mid-caps: moderate FCF
        large: { full: 0.04, mid: 0.02 },     // Large-caps: even lower is acceptable
    };
    const t = fcfTargets[tier];

    if (m.fcfYield >= t.full) score += 60;
    else if (m.fcfYield >= t.mid) score += 40 + (m.fcfYield - t.mid) / (t.full - t.mid) * 20;
    else if (m.fcfYield > 0) score += (m.fcfYield / t.mid) * 40;

    // Book-to-Market adapts by tier
    const bmTargets = {
        small: { full: 0.80, mid: 0.40 },     // Traditional value
        mid: { full: 0.60, mid: 0.25 },        // Moderate value
        large: { full: 0.30, mid: 0.10 },      // Large-caps rarely trade at high B/M
    };
    const b = bmTargets[tier];

    if (m.bookToMarket >= b.full) score += 40;
    else if (m.bookToMarket >= b.mid) score += 20 + (m.bookToMarket - b.mid) / (b.full - b.mid) * 20;
    else if (m.bookToMarket > 0) score += (m.bookToMarket / b.mid) * 20;

    return clamp(score, 0, 100);
}

// ── 3. Trend & Quality Score ────────────────────────────────
export function scoreTrend(company: Company): number {
    const m = company.metrics;
    let score = 0;

    // Margin expansion (0-30 pts)
    if (m.ebitMarginDelta > 0) score += 15;
    if (m.grossMarginDelta > 0) score += 15;

    // ROE / ROC improvement (0-30 pts)
    if (m.roeDelta > 0) score += 15;
    if (m.rocDelta > 0) score += 15;

    // Reinvestment efficiency (0-40 pts)
    if (m.ebitdaGrowth >= m.assetGrowth && m.ebitdaGrowth > 0) {
        score += 40;
    } else if (m.ebitdaGrowth > 0) {
        const ratio = m.ebitdaGrowth / Math.max(m.assetGrowth, 0.01);
        score += clamp(ratio * 40, 0, 40);
    }

    return clamp(score, 0, 100);
}

// ── 4. Timing Score ─────────────────────────────────────────
export function scoreTiming(company: Company): number {
    const m = company.metrics;
    let score = 0;

    // Proximity to 52-week low (0-40 pts)
    const proximity = proximityTo52WeekLow(
        m.currentPrice,
        m.fiftyTwoWeekLow,
        m.fiftyTwoWeekHigh
    );
    score += (1 - proximity) * 40;

    // 1-month momentum: slightly positive is good (0-30 pts)
    if (m.oneMonthReturn > 0 && m.oneMonthReturn < 0.10) {
        score += 30;
    } else if (m.oneMonthReturn >= 0.10) {
        score += 15;
    } else {
        score += Math.max(0, 15 + m.oneMonthReturn * 100);
    }

    // 6-month momentum: negative = mean reversion (0-30 pts)
    if (m.sixMonthReturn < -0.10) {
        score += 30;
    } else if (m.sixMonthReturn < 0) {
        score += 20;
    } else if (m.sixMonthReturn < 0.20) {
        score += 10;
    }

    return clamp(score, 0, 100);
}

// ── 5. Macro Adjustment ─────────────────────────────────────
export function macroMultiplier(macro: MacroContext): number {
    switch (macro.interestRateTrend) {
        case "rising": return 0.85;
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
