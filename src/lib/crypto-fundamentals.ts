// ============================================================
// Crypto fundamentals — types + renormalized scoring engine
// ============================================================
// Mirrors the philosophy of the stock algorithm:
//   • three real pillars, each renormalized (earned / possible × 100)
//     so a metric we DON'T have scores NEUTRAL, never penalizes;
//   • hard filters for disqualifying risks;
//   • a mild macro adjustment (here: crypto Fear & Greed).
//
// It deliberately ignores trader sentiment and price-prediction. It
// surfaces tokenomics, on-chain health, dev activity and catalysts —
// the signals that survive in a highly speculative market.

import type { AlgorithmScore } from "./types";
import type { CryptoCatalyst } from "./api/coinmarketcal-client";
import type { HederaNetworkStats } from "./api/hedera-client";

export interface CryptoFundamentals {
    id: string;
    symbol: string;
    name: string;

    // Market basics
    price: number;
    marketCap: number;          // USD
    volume24h: number;          // USD
    circulatingSupply: number | null;
    maxSupply: number | null;
    fdv: number | null;
    athChangePct: number;       // negative (distance below ATH)
    atlChangePct: number;       // positive (distance above ATL)
    change7d: number | null;
    change30d: number | null;
    change1y: number | null;

    // Tokenomics & value
    tvl: number | null;
    tvlChange7d: number | null;
    annualizedFees: number | null;
    annualizedRevenue: number | null;
    psRatio: number | null;     // marketCap / annualizedFees
    mcapToTvl: number | null;

    // Network / dev
    devCommits4w: number | null;
    devContributors: number | null;

    // On-chain whales
    holderCount: number | null;
    top10ConcentrationPct: number | null;
    whaleAccumulationPct: number | null;
    whaleWindowDays: number | null;      // window the accumulation is measured over
    whaleHistoryPoints: number;          // local snapshots gathered so far

    // Catalysts & sentiment
    catalysts: CryptoCatalyst[];
    nextUnlockDays: number | null;
    fearGreed: number | null;
    fearGreedLabel: string | null;

    // Chain-specific stats (currently Hedera Mirror Node: TPS, supply, tx mix)
    networkStats: HederaNetworkStats | null;

    dataQuality: {
        tokenomics: boolean;
        value: boolean;
        dev: boolean;
        onchain: boolean;
        catalysts: boolean;
    };
}

// ── Renormalization helper ───────────────────────────────────
// Accumulate earned/possible only for blocks whose data is present,
// then express the pillar as a 0-100 score (neutral 50 if nothing).
class Pillar {
    earned = 0;
    possible = 0;
    add(present: boolean, earned: number, possible: number) {
        if (!present) return;
        this.earned += earned;
        this.possible += possible;
    }
    score(): number {
        return this.possible > 0 ? Math.round((this.earned / this.possible) * 100) : 50;
    }
}

// ── Pillar 1: Tokenomics & Value ─────────────────────────────
function scoreTokenomics(f: CryptoFundamentals): number {
    const p = new Pillar();

    // Supply dilution: how much of max supply already circulates
    if (f.circulatingSupply && f.maxSupply && f.maxSupply > 0) {
        const r = f.circulatingSupply / f.maxSupply;
        const pts = r >= 0.95 ? 25 : r >= 0.8 ? 20 : r >= 0.6 ? 12 : r >= 0.4 ? 6 : 2;
        p.add(true, pts, 25);
    }

    // Liquidity: 24h volume / market cap (always available)
    if (f.marketCap > 0) {
        const v = f.volume24h / f.marketCap;
        const pts = v >= 0.1 ? 15 : v >= 0.05 ? 11 : v >= 0.02 ? 7 : v >= 0.01 ? 3 : 0;
        p.add(true, pts, 15);
    }

    // "Crypto P/S": market cap / annualized protocol fees (lower = cheaper)
    if (f.psRatio !== null && f.psRatio > 0) {
        const ps = f.psRatio;
        const pts = ps < 10 ? 25 : ps < 20 ? 20 : ps < 40 ? 14 : ps < 80 ? 7 : ps < 200 ? 3 : 0;
        p.add(true, pts, 25);
    }

    // MC / TVL: capitalization backed by locked value (lower = cheaper)
    if (f.mcapToTvl !== null && f.mcapToTvl > 0) {
        const m = f.mcapToTvl;
        const pts = m < 1 ? 15 : m < 3 ? 12 : m < 8 ? 7 : m < 20 ? 3 : 0;
        p.add(true, pts, 15);
    }

    // FDV / MC overhang: future dilution risk (closer to 1 = less)
    if (f.fdv !== null && f.fdv > 0 && f.marketCap > 0) {
        const r = f.fdv / f.marketCap;
        const pts = r <= 1.1 ? 20 : r <= 1.5 ? 15 : r <= 2.5 ? 9 : r <= 5 ? 4 : 0;
        p.add(true, pts, 20);
    }

    return p.score();
}

// ── Pillar 2: Network / On-chain Health ──────────────────────
function scoreNetwork(f: CryptoFundamentals): number {
    const p = new Pillar();

    // Developer commits (last 4 weeks). A CoinGecko value of 0 almost always
    // means "repo not tracked" rather than "dead" (Bitcoin, Hedera… report 0
    // while being actively developed), so we only score a POSITIVE signal and
    // treat 0/null as unavailable (neutral) — never a penalty.
    if (f.devCommits4w !== null && f.devCommits4w > 0) {
        const c = f.devCommits4w;
        const pts = c >= 80 ? 20 : c >= 40 ? 16 : c >= 15 ? 11 : 5;
        p.add(true, pts, 20);
    }
    // Active contributors (same caveat — only count a positive signal)
    if (f.devContributors !== null && f.devContributors > 0) {
        const c = f.devContributors;
        const pts = c >= 20 ? 10 : c >= 8 ? 7 : c >= 3 ? 4 : 2;
        p.add(true, pts, 10);
    }
    // TVL trend (real usage momentum)
    if (f.tvlChange7d !== null) {
        const t = f.tvlChange7d;
        const pts = t > 10 ? 15 : t > 0 ? 10 : t > -10 ? 5 : 0;
        p.add(true, pts, 15);
    }
    // Holder count
    if (f.holderCount !== null) {
        const h = f.holderCount;
        const pts = h >= 100_000 ? 10 : h >= 20_000 ? 8 : h >= 5_000 ? 5 : h >= 1_000 ? 2 : 0;
        p.add(true, pts, 10);
    }
    // Whale accumulation (top-25 aggregate Δ over ~30d)
    if (f.whaleAccumulationPct !== null) {
        const w = f.whaleAccumulationPct;
        const pts = w > 5 ? 25 : w > 1 ? 18 : w > -1 ? 12 : w > -5 ? 6 : 0;
        p.add(true, pts, 25);
    }
    // Concentration (top-10 % of supply) — lower is healthier
    if (f.top10ConcentrationPct !== null) {
        const c = f.top10ConcentrationPct;
        const pts = c < 25 ? 20 : c < 40 ? 14 : c < 55 ? 8 : c < 70 ? 3 : 0;
        p.add(true, pts, 20);
    }

    return p.score();
}

// ── Pillar 3: Momentum & Timing ──────────────────────────────
function scoreMomentum(f: CryptoFundamentals): number {
    const p = new Pillar();

    // ATH discount (deep drawdowns = opportunity)
    {
        const a = f.athChangePct;
        const pts = a <= -80 ? 30 : a <= -60 ? 24 : a <= -40 ? 15 : a <= -20 ? 8 : 3;
        p.add(true, pts, 30);
    }
    // ATL distance (support established well below)
    {
        const a = f.atlChangePct;
        const pts = a > 500 ? 20 : a > 100 ? 14 : a > 50 ? 8 : 3;
        p.add(true, pts, 20);
    }
    // Medium-term trend (30d, fall back to 7d)
    {
        const c = f.change30d ?? f.change7d ?? 0;
        const pts = c >= 5 && c <= 40 ? 30 : c > 0 && c < 5 ? 20 : c > 40 && c <= 100 ? 12
            : c > 100 ? 5 : c <= 0 && c > -20 ? 8 : 0;
        p.add(true, pts, 30);
    }
    // Long-term trend (1y)
    if (f.change1y !== null) {
        const c = f.change1y;
        const pts = c > 50 ? 20 : c > 0 ? 13 : c > -50 ? 7 : 2;
        p.add(true, pts, 20);
    }

    return p.score();
}

// ── Macro adjustment from Fear & Greed (contrarian, mild) ────
function fearGreedMultiplier(fg: number | null): number {
    if (fg === null) return 1.0;
    if (fg <= 25) return 1.05;   // extreme fear → contrarian boost
    if (fg <= 45) return 1.02;
    if (fg <= 55) return 1.0;
    if (fg <= 75) return 0.98;
    return 0.95;                  // extreme greed → trim
}

// ── Main entry ───────────────────────────────────────────────
export function calculateCryptoScoreV2(f: CryptoFundamentals): AlgorithmScore {
    const tokenomics = scoreTokenomics(f);
    const network = scoreNetwork(f);
    const momentum = scoreMomentum(f);

    const composite = 0.40 * tokenomics + 0.35 * network + 0.25 * momentum;
    const macroAdjustment = fearGreedMultiplier(f.fearGreed);
    const totalScore = Math.max(0, Math.min(100, Math.round(composite * macroAdjustment)));

    // ── Hard filters ──
    const fails: string[] = [];
    if (f.volume24h < 500_000) fails.push("Iliquidez (volumen 24h < $500k)");
    if (f.marketCap < 3_000_000) fails.push("Micro-cap (<$3M)");
    if (f.top10ConcentrationPct !== null && f.top10ConcentrationPct > 90) {
        fails.push(`Centralización extrema (top-10 posee ${f.top10ConcentrationPct.toFixed(0)}% del supply)`);
    }
    if (f.nextUnlockDays !== null && f.nextUnlockDays >= 0 && f.nextUnlockDays <= 10) {
        fails.push(`Desbloqueo de tokens inminente (en ${f.nextUnlockDays}d)`);
    }

    const passesHardFilters = fails.length === 0;

    let recommendation: AlgorithmScore["recommendation"];
    if (!passesHardFilters) recommendation = "AVOID";
    else if (totalScore >= 72) recommendation = "STRONG_BUY";
    else if (totalScore >= 56) recommendation = "BUY";
    else if (totalScore >= 40) recommendation = "HOLD";
    else recommendation = "AVOID";

    return {
        companyId: `cg_${f.id}`,
        ticker: f.symbol.toUpperCase(),
        name: f.name,
        tier: "large",
        passesHardFilters,
        hardFilterReasons: fails,
        valuationScore: tokenomics,   // Pillar 1 → Tokenomics & Value
        trendScore: network,          // Pillar 2 → Network / On-chain
        timingScore: momentum,        // Pillar 3 → Momentum & Timing
        cosmicFluidityScore: 0,
        macroAdjustment,
        totalScore,
        recommendation,
    };
}

/** Find the soonest upcoming token-unlock catalyst, in days (or null). */
export function deriveNextUnlockDays(catalysts: CryptoCatalyst[]): number | null {
    const unlocks = catalysts
        .filter((c) => /unlock|release|vesting|desbloqueo/i.test(`${c.category ?? ""} ${c.title}`))
        .map((c) => c.daysUntil)
        .filter((d): d is number => d !== null && d >= 0);
    return unlocks.length ? Math.min(...unlocks) : null;
}
