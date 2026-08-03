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
import { Pillar, type PillarResult } from "./scoring";
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

// ── Supply overhang ──────────────────────────────────────────
// How much MORE supply can still arrive, as a multiple of what circulates
// (1.0 = fully circulated, 2.0 = the float can still double).
//
// This used to be scored twice: once as "circulating / max supply" and again
// as "FDV / market cap" — which are reciprocals of each other, so a coin with
// a known max supply was rewarded (or punished) twice for one fact. They are
// now one metric.
//
// It also no longer trusts CoinGecko's `fdv` field blindly. That field comes
// back exactly equal to market cap for both Bitcoin and Ethereum, which would
// imply zero future dilution for a coin that is only ~95% circulated. When we
// can compute the overhang ourselves from the supply figures we do; a bare
// 1.0000× ratio with nothing to confirm it is an ABSENCE of data, not a
// perfect score.
const DEGENERATE_FDV_EPSILON = 0.001;

export function supplyOverhang(f: CryptoFundamentals): number | null {
    if (f.circulatingSupply && f.circulatingSupply > 0 && f.maxSupply && f.maxSupply > 0) {
        return f.maxSupply / f.circulatingSupply;
    }
    if (f.fdv !== null && f.fdv > 0 && f.marketCap > 0) {
        const r = f.fdv / f.marketCap;
        if (Math.abs(r - 1) < DEGENERATE_FDV_EPSILON) return null; // no real figure
        return r;
    }
    return null;
}

// ── Pillar 1: Tokenomics & Value ─────────────────────────────
function scoreTokenomics(f: CryptoFundamentals): PillarResult {
    const p = new Pillar();

    // Future dilution: how much supply can still hit the market
    const overhang = supplyOverhang(f);
    p.add(
        overhang !== null,
        overhang === null ? 0
            : overhang <= 1.05 ? 30 : overhang <= 1.25 ? 24 : overhang <= 1.7 ? 15 : overhang <= 2.5 ? 7 : 0,
        30,
    );

    // Liquidity: 24h volume / market cap
    const v = f.marketCap > 0 ? f.volume24h / f.marketCap : 0;
    p.add(
        f.marketCap > 0,
        v >= 0.1 ? 15 : v >= 0.05 ? 11 : v >= 0.02 ? 7 : v >= 0.01 ? 3 : 0,
        15,
    );

    // "Crypto P/S": market cap / annualized protocol fees (lower = cheaper)
    const ps = f.psRatio;
    p.add(
        ps !== null && ps > 0,
        ps === null ? 0 : ps < 10 ? 25 : ps < 20 ? 20 : ps < 40 ? 14 : ps < 80 ? 7 : ps < 200 ? 3 : 0,
        25,
    );

    // MC / TVL: capitalization backed by locked value (lower = cheaper)
    const m = f.mcapToTvl;
    p.add(
        m !== null && m > 0,
        m === null ? 0 : m < 1 ? 15 : m < 3 ? 12 : m < 8 ? 7 : m < 20 ? 3 : 0,
        15,
    );

    return p.result();
}

// ── Pillar 2: Network / On-chain Health ──────────────────────
function scoreNetwork(f: CryptoFundamentals): PillarResult {
    const p = new Pillar();

    // Developer commits (last 4 weeks). A CoinGecko value of 0 almost always
    // means "repo not tracked" rather than "dead" (Bitcoin, Hedera… report 0
    // while being actively developed), so we only score a POSITIVE signal and
    // treat 0/null as unavailable (neutral) — never a penalty.
    const commits = f.devCommits4w;
    p.add(
        commits !== null && commits > 0,
        commits === null ? 0 : commits >= 80 ? 20 : commits >= 40 ? 16 : commits >= 15 ? 11 : 5,
        20,
    );
    // Active contributors (same caveat — only count a positive signal)
    const contrib = f.devContributors;
    p.add(
        contrib !== null && contrib > 0,
        contrib === null ? 0 : contrib >= 20 ? 10 : contrib >= 8 ? 7 : contrib >= 3 ? 4 : 2,
        10,
    );
    // TVL trend (real usage momentum)
    const t = f.tvlChange7d;
    p.add(t !== null, t === null ? 0 : t > 10 ? 15 : t > 0 ? 10 : t > -10 ? 5 : 0, 15);
    // Holder count
    const h = f.holderCount;
    p.add(
        h !== null,
        h === null ? 0 : h >= 100_000 ? 10 : h >= 20_000 ? 8 : h >= 5_000 ? 5 : h >= 1_000 ? 2 : 0,
        10,
    );
    // Whale accumulation (top-25 aggregate Δ over ~30d)
    const w = f.whaleAccumulationPct;
    p.add(
        w !== null,
        w === null ? 0 : w > 5 ? 25 : w > 1 ? 18 : w > -1 ? 12 : w > -5 ? 6 : 0,
        25,
    );
    // Concentration (top-10 % of supply) — lower is healthier
    const c = f.top10ConcentrationPct;
    p.add(
        c !== null,
        c === null ? 0 : c < 25 ? 20 : c < 40 ? 14 : c < 55 ? 8 : c < 70 ? 3 : 0,
        20,
    );

    return p.result();
}

// ── Pillar 3: Momentum & Timing ──────────────────────────────
function scoreMomentum(f: CryptoFundamentals): PillarResult {
    const p = new Pillar();

    // ATH discount (deep drawdowns = opportunity)
    {
        const a = f.athChangePct;
        const pts = a <= -80 ? 30 : a <= -60 ? 24 : a <= -40 ? 15 : a <= -20 ? 8 : 3;
        p.add(true, pts, 30);
    }
    // NOTE: "distance above all-time low" used to sit here for 20 points, with
    // full marks awarded above +500%. Every asset that didn't go to zero clears
    // that bar by orders of magnitude (Ethereum measured +429,980%, Bitcoin
    // +92,925%), so it handed out a guaranteed 20/20 that could never separate
    // one coin from another — pure score inflation. Removed.

    // Medium-term trend (30d, fall back to 7d)
    {
        const c = f.change30d ?? f.change7d ?? 0;
        const pts = c >= 5 && c <= 40 ? 30 : c > 0 && c < 5 ? 20 : c > 40 && c <= 100 ? 12
            : c > 100 ? 5 : c <= 0 && c > -20 ? 8 : 0;
        p.add(true, pts, 30);
    }
    // Long-term trend (1y)
    const y = f.change1y;
    p.add(y !== null, y === null ? 0 : y > 50 ? 20 : y > 0 ? 13 : y > -50 ? 7 : 2, 20);

    return p.result();
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

    const composite = 0.40 * tokenomics.score + 0.35 * network.score + 0.25 * momentum.score;
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
        valuationScore: tokenomics.score,   // Pillar 1 → Tokenomics & Value
        trendScore: network.score,          // Pillar 2 → Development & Network
        timingScore: momentum.score,        // Pillar 3 → Momentum & Timing
        cosmicFluidityScore: 0,
        macroAdjustment,
        // Pre-adjustment composite, so the UI can show the Fear & Greed step
        // explicitly instead of leaving an unexplained gap in the arithmetic.
        compositeBeforeMacro: Math.round(composite * 10) / 10,
        coverage: { valuation: tokenomics, trend: network, timing: momentum },
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
