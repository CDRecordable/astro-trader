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

// ── Renormalization helper (shared with the stock & crypto engines) ──
// Note the distinction this pillar draws: a metric that is MISSING enters
// the exam and drags coverage down, while a metric that is NOT APPLICABLE
// (concentration on a deliberately concentrated sector fund) is never added
// at all — we're not failing to measure it, it simply doesn't apply.
import { Pillar, type PillarResult } from "./scoring";

// ── Pillar 1: Cost & Vehicle ─────────────────────────────────
function scoreVehicle(f: EtfFundamentals): PillarResult {
    const p = new Pillar();

    // TER — the silent compounding killer. <0.15% excellent, >0.60% expensive.
    const t = f.ter;
    p.add(
        t !== null,
        t === null ? 0 : t <= 0.0010 ? 30 : t <= 0.0020 ? 26 : t <= 0.0035 ? 19 : t <= 0.0060 ? 10 : t <= 0.0100 ? 4 : 0,
        30,
    );

    // AUM — liquidity + closure risk. (Fund currency; EUR/USD ≈ parity for tiers.)
    const aum = f.totalAssets;
    const b = aum !== null ? aum / 1e9 : 0;
    p.add(
        aum !== null && aum > 0,
        b >= 10 ? 25 : b >= 1 ? 21 : b >= 0.5 ? 17 : b >= 0.1 ? 10 : b >= 0.05 ? 4 : 0,
        25,
    );

    // Track record
    const a = f.ageYears;
    p.add(a !== null, a === null ? 0 : a >= 10 ? 15 : a >= 5 ? 12 : a >= 3 ? 8 : a >= 1 ? 4 : 1, 15);

    // Holdings turnover — passive indexing should be lazy.
    const to = f.turnover;
    p.add(to !== null, to === null ? 0 : to <= 0.10 ? 15 : to <= 0.30 ? 11 : to <= 0.60 ? 6 : 2, 15);

    // Accumulating class: no dividend-tax drag for a Spanish investor.
    p.add(f.accumulating !== null, f.accumulating ? 15 : 9, 15);

    return p.result();
}

// ── Pillar 2: Portfolio & Value ──────────────────────────────
function scorePortfolio(f: EtfFundamentals): PillarResult {
    const p = new Pillar();
    // Sector and thematic funds are concentrated BY DESIGN — concentration
    // blocks would punish exactly what the buyer chose. Those blocks are NOT
    // APPLICABLE here (never added to the pillar), which is different from
    // data we wanted and couldn't get: they don't count against coverage.
    const intentionallyConcentrated = f.category === "sector" || f.category === "thematic" || f.category === "gold";

    // Top-10 weight — is "diversified" real or 7 stocks in a trench coat?
    if (!intentionallyConcentrated) {
        const c = f.top10Pct;
        p.add(
            c !== null,
            c === null ? 0 : c <= 15 ? 25 : c <= 25 ? 21 : c <= 35 ? 15 : c <= 50 ? 8 : c <= 70 ? 3 : 0,
            25,
        );
    }

    // Underlying P/E — how expensive is the basket you're buying?
    const pe = f.underlyingPE;
    p.add(
        pe !== null,
        pe === null ? 0 : pe <= 12 ? 30 : pe <= 16 ? 25 : pe <= 20 ? 19 : pe <= 25 ? 12 : pe <= 32 ? 6 : 1,
        30,
    );

    // Underlying P/B
    const pb = f.underlyingPB;
    p.add(
        pb !== null,
        pb === null ? 0 : pb <= 1.5 ? 15 : pb <= 2.5 ? 12 : pb <= 4 ? 8 : pb <= 6 ? 4 : 1,
        15,
    );

    // Sector diversification — largest sector weight.
    if (!intentionallyConcentrated) {
        const m = f.maxSectorPct;
        p.add(
            m !== null,
            m === null ? 0 : m <= 20 ? 15 : m <= 30 ? 11 : m <= 45 ? 6 : m <= 60 ? 3 : 1,
            15,
        );
    }

    // Dividend yield of the basket (not applicable to a gold ETC)
    if (f.category !== "gold") {
        const y = f.dividendYield !== null ? f.dividendYield * 100 : 0;
        p.add(
            f.dividendYield !== null,
            y >= 3 ? 15 : y >= 1.5 ? 11 : y > 0.5 ? 7 : 4,
            15,
        );
    }

    return p.result();
}

// ── Pillar 3: Momentum & Timing ──────────────────────────────
function scoreMomentum(f: EtfFundamentals): PillarResult {
    const p = new Pillar();

    // Position vs the 200-day SMA — trend health without chasing.
    const v200 = f.vsSma200Pct;
    p.add(
        v200 !== null,
        v200 === null ? 0
            : v200 >= 0 && v200 <= 10 ? 30 : v200 > 10 && v200 <= 20 ? 22 : v200 > 20 ? 12
                : v200 >= -5 ? 15 : v200 >= -15 ? 8 : 3,
        30,
    );

    // 12-month return — steady beats euphoric.
    const r = f.ret12mPct;
    p.add(
        r !== null,
        r === null ? 0
            : r >= 5 && r <= 25 ? 25 : r > 0 && r < 5 ? 18 : r > 25 && r <= 50 ? 14
                : r > 50 ? 6 : r > -10 ? 10 : 4,
        25,
    );

    // Drawdown from 52-week high — a moderate dip in a broad index is an
    // entry, not a warning (unlike single names).
    const d = f.drawdownPct !== null ? Math.abs(f.drawdownPct) : 0;
    p.add(
        f.drawdownPct !== null,
        d >= 5 && d <= 15 ? 25 : d < 5 ? 18 : d <= 25 ? 15 : 8,
        25,
    );

    // Annualized volatility — the ride quality.
    const vol = f.volAnnPct;
    p.add(
        vol !== null,
        vol === null ? 0 : vol <= 12 ? 20 : vol <= 18 ? 16 : vol <= 25 ? 10 : vol <= 35 ? 5 : 2,
        20,
    );

    return p.result();
}

// ── Main entry ───────────────────────────────────────────────
export function calculateEtfScore(f: EtfFundamentals): AlgorithmScore {
    const vehicle = scoreVehicle(f);
    const portfolio = scorePortfolio(f);
    const momentum = scoreMomentum(f);

    const composite = 0.30 * vehicle.score + 0.40 * portfolio.score + 0.30 * momentum.score;
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
        valuationScore: vehicle.score,     // Pillar 1 → Cost & Vehicle
        trendScore: portfolio.score,       // Pillar 2 → Portfolio & Value
        timingScore: momentum.score,       // Pillar 3 → Momentum & Timing
        cosmicFluidityScore: 0,
        macroAdjustment: 1.0,
        compositeBeforeMacro: Math.round(composite * 10) / 10,
        coverage: { valuation: vehicle, trend: portfolio, timing: momentum },
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
