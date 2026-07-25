// ============================================================
// ETF fundamentals — types + renormalized scoring engine
// ============================================================
// Same philosophy as the stock and crypto engines:
//   • three pillars, each renormalized (earned / possible × 100) so a
//     metric we DON'T have scores NEUTRAL, never penalizes;
//   • hard filters for disqualifying risks (tiny AUM → closure risk);
//   • honest N/D flags surfaced through dataQuality.
//
// What makes a *good ETF* is different from a good stock: you are buying
// a vehicle (costs matter enormously and compound), a portfolio (what's
// inside and at what valuation) and an entry point (momentum/timing).
//   Pillar 1 — Cost & Vehicle      (30%)
//   Pillar 2 — Portfolio & Value   (40%)
//   Pillar 3 — Momentum & Timing   (30%)

import type { AlgorithmScore, Company } from "./types";
import type { EtfRawData } from "./api/etf-client";
import type { EtfEntry, EtfCategory } from "./etf-registry";
import { ETF_CATEGORY_META } from "./etf-registry";

export interface EtfFundamentals extends EtfRawData {
    category: EtfCategory | null;    // curated category (null if not in registry)
    index: string | null;            // tracked index label
    accumulating: boolean | null;    // Acc (true) / Dist (false) / unknown
    region: string | null;
    ageYears: number | null;
    top10Pct: number | null;         // aggregate weight of the top-10 holdings
    maxSectorPct: number | null;     // weight of the largest sector

    dataQuality: {
        vehicle: boolean;    // TER + AUM available
        portfolio: boolean;  // holdings / sector / underlying P/E available
        momentum: boolean;   // price history available
    };
}

// ── Renormalization helper (same as crypto engine) ───────────
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

// ── Pillar 1: Cost & Vehicle ─────────────────────────────────
function scoreVehicle(f: EtfFundamentals): number {
    const p = new Pillar();

    // TER — the silent compounding killer. <0.15% excellent, >0.60% expensive.
    if (f.ter !== null) {
        const t = f.ter;
        const pts = t <= 0.0010 ? 30 : t <= 0.0020 ? 26 : t <= 0.0035 ? 19 : t <= 0.0060 ? 10 : t <= 0.0100 ? 4 : 0;
        p.add(true, pts, 30);
    }

    // AUM — liquidity + closure risk. (Fund currency; EUR/USD ≈ parity for tiers.)
    if (f.totalAssets !== null && f.totalAssets > 0) {
        const b = f.totalAssets / 1e9;
        const pts = b >= 10 ? 25 : b >= 1 ? 21 : b >= 0.5 ? 17 : b >= 0.1 ? 10 : b >= 0.05 ? 4 : 0;
        p.add(true, pts, 25);
    }

    // Track record
    if (f.ageYears !== null) {
        const a = f.ageYears;
        const pts = a >= 10 ? 15 : a >= 5 ? 12 : a >= 3 ? 8 : a >= 1 ? 4 : 1;
        p.add(true, pts, 15);
    }

    // Holdings turnover — passive indexing should be lazy.
    if (f.turnover !== null) {
        const t = f.turnover;
        const pts = t <= 0.10 ? 15 : t <= 0.30 ? 11 : t <= 0.60 ? 6 : 2;
        p.add(true, pts, 15);
    }

    // Accumulating class: no dividend-tax drag for a Spanish investor.
    if (f.accumulating !== null) {
        p.add(true, f.accumulating ? 15 : 9, 15);
    }

    return p.score();
}

// ── Pillar 2: Portfolio & Value ──────────────────────────────
function scorePortfolio(f: EtfFundamentals): number {
    const p = new Pillar();
    // Sector and thematic funds are concentrated BY DESIGN — concentration
    // blocks would punish exactly what the buyer chose. Skip those blocks
    // (renormalized out) and let valuation carry the pillar.
    const intentionallyConcentrated = f.category === "sector" || f.category === "thematic" || f.category === "gold";

    // Top-10 weight — is "diversified" real or 7 stocks in a trench coat?
    if (!intentionallyConcentrated && f.top10Pct !== null) {
        const c = f.top10Pct;
        const pts = c <= 15 ? 25 : c <= 25 ? 21 : c <= 35 ? 15 : c <= 50 ? 8 : c <= 70 ? 3 : 0;
        p.add(true, pts, 25);
    }

    // Underlying P/E — how expensive is the basket you're buying?
    if (f.underlyingPE !== null) {
        const pe = f.underlyingPE;
        const pts = pe <= 12 ? 30 : pe <= 16 ? 25 : pe <= 20 ? 19 : pe <= 25 ? 12 : pe <= 32 ? 6 : 1;
        p.add(true, pts, 30);
    }

    // Underlying P/B
    if (f.underlyingPB !== null) {
        const pb = f.underlyingPB;
        const pts = pb <= 1.5 ? 15 : pb <= 2.5 ? 12 : pb <= 4 ? 8 : pb <= 6 ? 4 : 1;
        p.add(true, pts, 15);
    }

    // Sector diversification — largest sector weight.
    if (!intentionallyConcentrated && f.maxSectorPct !== null) {
        const m = f.maxSectorPct;
        const pts = m <= 20 ? 15 : m <= 30 ? 11 : m <= 45 ? 6 : m <= 60 ? 3 : 1;
        p.add(true, pts, 15);
    }

    // Dividend yield of the basket (meaningless for a gold ETC)
    if (f.category !== "gold" && f.dividendYield !== null) {
        const y = f.dividendYield * 100;
        const pts = y >= 3 ? 15 : y >= 1.5 ? 11 : y > 0.5 ? 7 : 4;
        p.add(true, pts, 15);
    }

    return p.score();
}

// ── Pillar 3: Momentum & Timing ──────────────────────────────
function scoreMomentum(f: EtfFundamentals): number {
    const p = new Pillar();

    // Position vs the 200-day SMA — trend health without chasing.
    if (f.vsSma200Pct !== null) {
        const v = f.vsSma200Pct;
        const pts = v >= 0 && v <= 10 ? 30 : v > 10 && v <= 20 ? 22 : v > 20 ? 12
            : v >= -5 ? 15 : v >= -15 ? 8 : 3;
        p.add(true, pts, 30);
    }

    // 12-month return — steady beats euphoric.
    if (f.ret12mPct !== null) {
        const r = f.ret12mPct;
        const pts = r >= 5 && r <= 25 ? 25 : r > 0 && r < 5 ? 18 : r > 25 && r <= 50 ? 14
            : r > 50 ? 6 : r > -10 ? 10 : 4;
        p.add(true, pts, 25);
    }

    // Drawdown from 52-week high — a moderate dip in a broad index is an
    // entry, not a warning (unlike single names).
    if (f.drawdownPct !== null) {
        const d = Math.abs(f.drawdownPct);
        const pts = d >= 5 && d <= 15 ? 25 : d < 5 ? 18 : d <= 25 ? 15 : 8;
        p.add(true, pts, 25);
    }

    // Annualized volatility — the ride quality.
    if (f.volAnnPct !== null) {
        const v = f.volAnnPct;
        const pts = v <= 12 ? 20 : v <= 18 ? 16 : v <= 25 ? 10 : v <= 35 ? 5 : 2;
        p.add(true, pts, 20);
    }

    return p.score();
}

// ── Main entry ───────────────────────────────────────────────
export function calculateEtfScore(f: EtfFundamentals): AlgorithmScore {
    const vehicle = scoreVehicle(f);
    const portfolio = scorePortfolio(f);
    const momentum = scoreMomentum(f);

    const composite = 0.30 * vehicle + 0.40 * portfolio + 0.30 * momentum;
    const totalScore = Math.max(0, Math.min(100, Math.round(composite)));

    // ── Hard filters ──
    const fails: string[] = [];
    if (f.totalAssets !== null && f.totalAssets < 20_000_000) {
        fails.push("Patrimonio ínfimo (<20M) — riesgo real de cierre del fondo");
    }
    if (f.ter !== null && f.ter > 0.015) {
        fails.push(`Comisión abusiva (TER ${(f.ter * 100).toFixed(2)}%)`);
    }

    const passesHardFilters = fails.length === 0;

    let recommendation: AlgorithmScore["recommendation"];
    if (!passesHardFilters) recommendation = "AVOID";
    else if (totalScore >= 72) recommendation = "STRONG_BUY";
    else if (totalScore >= 56) recommendation = "BUY";
    else if (totalScore >= 40) recommendation = "HOLD";
    else recommendation = "AVOID";

    return {
        companyId: `etf_${f.symbol.toLowerCase()}`,
        ticker: f.symbol.split(".")[0],
        name: f.name,
        tier: "large",
        passesHardFilters,
        hardFilterReasons: fails,
        valuationScore: vehicle,     // Pillar 1 → Cost & Vehicle
        trendScore: portfolio,       // Pillar 2 → Portfolio & Value
        timingScore: momentum,       // Pillar 3 → Momentum & Timing
        cosmicFluidityScore: 0,
        macroAdjustment: 1.0,
        totalScore,
        recommendation,
    };
}

/** Assemble EtfFundamentals from raw Yahoo data + registry metadata. */
export function buildEtfFundamentals(raw: EtfRawData, entry?: EtfEntry): EtfFundamentals {
    const ageYears = raw.inceptionDate
        ? (Date.now() - new Date(raw.inceptionDate).getTime()) / (365.25 * 86400000)
        : null;
    const top10Pct = raw.topHoldings.length > 0
        ? raw.topHoldings.slice(0, 10).reduce((s, h) => s + h.pct, 0)
        : null;
    const maxSectorPct = raw.sectorWeights.length > 0 ? raw.sectorWeights[0].pct : null;

    return {
        ...raw,
        category: entry?.category ?? null,
        index: entry?.index ?? null,
        accumulating: entry ? entry.accumulating : null,
        region: entry?.region ?? null,
        ageYears,
        top10Pct,
        maxSectorPct,
        dataQuality: {
            vehicle: raw.ter !== null || raw.totalAssets !== null,
            portfolio: raw.topHoldings.length > 0 || raw.underlyingPE !== null || raw.sectorWeights.length > 0,
            momentum: raw.vsSma200Pct !== null || raw.ret12mPct !== null,
        },
    };
}

/** Map to the Company shape so all existing plumbing (watchlist, portfolio,
 *  discards, snapshots) works unchanged. */
export function mapEtfToCompany(f: EtfFundamentals): Company {
    const categoryLabel = f.category ? `ETF · ${ETF_CATEGORY_META[f.category].label}` : "ETF";
    return {
        id: `etf_${f.symbol.toLowerCase()}`,
        ticker: f.symbol.split(".")[0],
        name: f.name,
        sector: categoryLabel,
        exchange: f.symbol.includes(".") ? f.symbol.split(".")[1] : "",
        description: [f.index ? `Réplica: ${f.index}.` : "", f.fundFamily ? `Gestora: ${f.fundFamily}.` : ""].filter(Boolean).join(" "),
        metrics: {
            marketCap: f.totalAssets !== null ? f.totalAssets / 1e6 : 0, // AUM in millions
            totalEquity: 0,
            operatingProfit: 0,
            fcfYield: 0,
            bookToMarket: 0,
            ebitMargin: 0,
            grossMargin: 0,
            roe: 0,
            roc: 0,
            ebitMarginDelta: 0,
            grossMarginDelta: 0,
            roeDelta: 0,
            rocDelta: 0,
            assetGrowth: 0,
            ebitdaGrowth: 0,
            currentPrice: f.price,
            fiftyTwoWeekLow: f.low52 ?? 0,
            fiftyTwoWeekHigh: f.high52 ?? 0,
            oneMonthReturn: (f.ret1mPct ?? 0) / 100,
            threeMonthReturn: (f.ret3mPct ?? 0) / 100,
            sixMonthReturn: (f.ret6mPct ?? 0) / 100,
            peRatio: f.underlyingPE ?? undefined,
        },
        historicalData: f.historicalPrices.map((p) => ({
            date: p.date,
            price: p.price,
            ebitMargin: 0,
            grossMargin: 0,
            roe: 0,
            roc: 0,
            fcfYield: 0,
        })),
    };
}
