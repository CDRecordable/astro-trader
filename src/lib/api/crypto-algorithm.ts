// ============================================================
// Crypto Tokenomics & Momentum Scoring Algorithm (100 pts)
// ============================================================

import type { AlgorithmScore } from "../types";
import type { CoinGeckoMarketData } from "./coingecko-client";

/**
 * Evaluates a single cryptocurrency asset and calculates its score out of 100.
 * Splits into: Tokenomics (50%), Momentum & Timing (50%).
 */
export function calculateCryptoScore(asset: CoinGeckoMarketData): AlgorithmScore {
    let tokenomicsScore = 0; // out of 50
    let momentumScore = 0; // out of 50
    const fails: string[] = [];

    // --- Hard Filters ---
    if (asset.total_volume < 1_000_000) {
        fails.push(`Low 24h Volume (<$1M)`);
    }
    if (asset.market_cap < 10_000_000) {
        fails.push(`Micro-cap risk (<$10M)`);
    }

    // ==========================================
    // 1. TOKENOMICS & LIQUIDITY (50 points)
    // ==========================================

    // A. Supply Dilution (Max 25 points)
    // How much of the max supply is already circulating?
    // 100% circulated = inflation is over (25 pts).
    if (asset.circulating_supply && asset.max_supply && asset.max_supply > 0) {
        const circulationRatio = asset.circulating_supply / asset.max_supply;
        if (circulationRatio >= 0.95) tokenomicsScore += 25;
        else if (circulationRatio >= 0.80) tokenomicsScore += 20;
        else if (circulationRatio >= 0.60) tokenomicsScore += 12;
        else if (circulationRatio >= 0.40) tokenomicsScore += 5;
        else tokenomicsScore += 0; // High dilution risk
    } else {
        // If no max supply (e.g., Ethereum), assign a neutral score (15) 
        // to avoid penalizing indefinitely inflationary tokens unjustly if deflationary mechanics exist.
        tokenomicsScore += 15;
    }

    // B. Liquidity & Interest (Max 25 points)
    // 24h Volume relative to Market Cap. Shows real activity.
    if (asset.market_cap > 0) {
        const volumeRatio = asset.total_volume / asset.market_cap;
        if (volumeRatio >= 0.10) tokenomicsScore += 25; // Extremely liquid (>10%)
        else if (volumeRatio >= 0.05) tokenomicsScore += 18;
        else if (volumeRatio >= 0.02) tokenomicsScore += 10;
        else if (volumeRatio >= 0.01) tokenomicsScore += 5;
        else tokenomicsScore += 0; // Dead chain / Illiquid
    }

    // ==========================================
    // 2. TIMING & MOMENTUM (50 points)
    // ==========================================

    // C. ATH Discount (Max 20 points)
    // Distance from All-Time High. Buying drawdowns.
    // ath_change_percentage is negative (e.g., -80 for 80% down).
    const athDist = asset.ath_change_percentage || 0;
    if (athDist <= -80) momentumScore += 20; // 80%+ discount (deep bear cycle buy)
    else if (athDist <= -60) momentumScore += 16;
    else if (athDist <= -40) momentumScore += 10;
    else if (athDist <= -20) momentumScore += 5;
    else momentumScore += 0; // Buying near ATH (0 points)

    // D. ATL Proximity (Max 15 points)
    // We want distance FROM the ATL so we aren't catching falling knives that just broke support.
    // atl_change_percentage is positive (e.g., 500 for 500% up from ATL).
    const atlDist = asset.atl_change_percentage || 0;
    if (atlDist > 500) momentumScore += 15; // Established support far below
    else if (atlDist > 100) momentumScore += 10;
    else if (atlDist > 50) momentumScore += 5;
    else momentumScore += 0; // Hovering near all time lows (risky)

    // E. Short-Term Momentum (Max 15 points)
    // 7-day or 24h price change to ride early waves.
    const change7d = asset.price_change_percentage_7d_in_currency || asset.price_change_percentage_24h || 0;
    if (change7d >= 10 && change7d <= 50) momentumScore += 15; // Healthy uptrend
    else if (change7d > 0 && change7d < 10) momentumScore += 10; // Slow uptrend
    else if (change7d > 50) momentumScore += 5; // Too euphoric, risk of pullback
    else momentumScore += 0; // Downtrend

    // ==========================================
    // TOTAL SCORE CALCULATION
    // ==========================================
    const totalScore = tokenomicsScore + momentumScore;

    // We still apply a macro adjustment just to keep the interface consistent,
    // although for crypto we could map it to a 'Fear & Greed' index in the future.
    // Defaulting to 1.0 (neutral) for now.
    const macroAdjustment = 1.0;
    const finalScoreRaw = Math.round(totalScore * macroAdjustment);
    const finalScore = Math.min(100, Math.max(0, finalScoreRaw));

    // Determine Recommendation badge
    let recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "AVOID" = "AVOID";

    if (fails.length > 0) {
        recommendation = "AVOID";
    } else if (finalScore >= 75) {
        recommendation = "STRONG_BUY";
    } else if (finalScore >= 55) {
        recommendation = "BUY";
    } else if (finalScore >= 35) {
        recommendation = "HOLD";
    } else {
        recommendation = "AVOID";
    }

    return {
        companyId: `cg_${asset.id}`,
        ticker: asset.symbol.toUpperCase(),
        name: asset.name,
        tier: "large", // Not really applicable but required by typing
        passesHardFilters: fails.length === 0,
        hardFilterReasons: fails,
        valuationScore: tokenomicsScore, // Mapped to Valuation slot to reuse UI components
        trendScore: momentumScore,       // Mapped to Trend & Quality slot
        timingScore: 0,                  // Unused in crypto for now, folded into Momentum
        cosmicFluidityScore: 0,          // Not used in crypto scoring
        macroAdjustment,
        totalScore: finalScore,
        recommendation,
    };
}
