// ============================================================
// ETF data client — Yahoo Finance, hybrid UCITS + US-proxy enrichment
// ============================================================
// UCITS listings on Yahoo often miss portfolio data (holdings, sector
// weights, underlying P/E) that their US-listed equivalents expose. This
// client fetches the UCITS listing first and, when portfolio data is
// missing and the registry knows a US proxy, fills the gaps from the
// proxy — recording exactly which fields were proxied so the UI can
// disclose the equivalence honestly.

import YahooFinance from "yahoo-finance2";
import type { EtfEntry } from "../etf-registry";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface EtfHolding { symbol: string; name: string; pct: number }
export interface EtfSectorWeight { sector: string; pct: number }
export interface EtfPricePoint { date: string; price: number }

export interface EtfRawData {
    symbol: string;
    name: string;
    currency: string;
    price: number;

    // Vehicle
    ter: number | null;             // decimal (0.0022 = 0.22%)
    terSource: "curated" | "yahoo" | null;
    totalAssets: number | null;     // fund AUM, fund currency
    inceptionDate: string | null;   // ISO
    turnover: number | null;        // decimal annual holdings turnover
    dividendYield: number | null;   // decimal
    beta3y: number | null;
    fundFamily: string | null;
    yahooCategory: string | null;

    // Portfolio
    topHoldings: EtfHolding[];
    sectorWeights: EtfSectorWeight[];
    underlyingPE: number | null;    // P/E of the underlying basket
    underlyingPB: number | null;

    // Momentum (computed from 1y daily bars)
    vsSma200Pct: number | null;     // % above (+) / below (−) the 200-day SMA
    ret1mPct: number | null;
    ret3mPct: number | null;
    ret6mPct: number | null;
    ret12mPct: number | null;
    volAnnPct: number | null;       // annualized daily volatility, %
    drawdownPct: number | null;     // % below the 52-week high (≤ 0)
    high52: number | null;
    low52: number | null;

    // Chart (5y weekly closes)
    historicalPrices: EtfPricePoint[];

    // Provenance
    proxySymbol: string | null;     // US proxy used for enrichment (if any)
    proxiedFields: string[];        // which fields came from the proxy
}

/** Yahoo reports basket P/E and P/B as reciprocals (<1). Normalize. */
function normalizeRatio(v: unknown): number | null {
    if (typeof v !== "number" || !isFinite(v) || v <= 0) return null;
    return v < 1 ? 1 / v : v;
}

const SECTOR_LABELS: Record<string, string> = {
    technology: "Tecnología",
    financial_services: "Servicios financieros",
    healthcare: "Salud",
    consumer_cyclical: "Consumo discrecional",
    consumer_defensive: "Consumo básico",
    industrials: "Industrial",
    communication_services: "Comunicación",
    energy: "Energía",
    basic_materials: "Materiales",
    utilities: "Utilities",
    realestate: "Inmobiliario",
};

type QuoteSummaryModules = {
    fundProfile?: {
        family?: string;
        categoryName?: string;
        feesExpensesInvestment?: { annualReportExpenseRatio?: number; annualHoldingsTurnover?: number };
    };
    topHoldings?: {
        holdings?: Array<{ symbol?: string; holdingName?: string; holdingPercent?: number }>;
        sectorWeightings?: Array<Record<string, number>>;
        equityHoldings?: { priceToEarnings?: number; priceToBook?: number };
    };
    defaultKeyStatistics?: { totalAssets?: number; beta3Year?: number; fundInceptionDate?: Date };
    summaryDetail?: { yield?: number; totalAssets?: number };
    price?: { longName?: string; shortName?: string; currency?: string; regularMarketPrice?: number };
};

async function fetchSummary(symbol: string): Promise<QuoteSummaryModules | null> {
    try {
        return await yf.quoteSummary(symbol, {
            modules: ["fundProfile", "topHoldings", "defaultKeyStatistics", "summaryDetail", "price"],
        }) as QuoteSummaryModules;
    } catch {
        return null;
    }
}

function parseHoldings(q: QuoteSummaryModules | null): EtfHolding[] {
    return (q?.topHoldings?.holdings ?? [])
        .filter((h) => typeof h.holdingPercent === "number")
        .map((h) => ({
            symbol: h.symbol ?? "",
            name: h.holdingName ?? h.symbol ?? "?",
            pct: (h.holdingPercent ?? 0) * 100,
        }));
}

function parseSectors(q: QuoteSummaryModules | null): EtfSectorWeight[] {
    const out: EtfSectorWeight[] = [];
    for (const obj of q?.topHoldings?.sectorWeightings ?? []) {
        const [k, v] = Object.entries(obj)[0] ?? [];
        if (k && typeof v === "number" && v > 0) {
            out.push({ sector: SECTOR_LABELS[k] ?? k, pct: v * 100 });
        }
    }
    return out.sort((a, b) => b.pct - a.pct);
}

/** Compute momentum stats from ~1y of daily closes. */
function momentumFromDaily(closes: { date: Date; close: number | null }[]) {
    const pts = closes.filter((c): c is { date: Date; close: number } => c.close != null && isFinite(c.close));
    if (pts.length < 30) return null;
    const last = pts[pts.length - 1].close;

    const backPct = (days: number): number | null => {
        const idx = pts.length - 1 - days;
        if (idx < 0) return null;
        const base = pts[idx].close;
        return base > 0 ? ((last / base) - 1) * 100 : null;
    };

    // 200-day SMA (needs enough history)
    let vsSma200Pct: number | null = null;
    if (pts.length >= 200) {
        const sma = pts.slice(-200).reduce((s, p) => s + p.close, 0) / 200;
        vsSma200Pct = sma > 0 ? ((last / sma) - 1) * 100 : null;
    }

    // Annualized volatility from daily log returns
    const rets: number[] = [];
    for (let i = 1; i < pts.length; i++) {
        if (pts[i - 1].close > 0) rets.push(Math.log(pts[i].close / pts[i - 1].close));
    }
    const meanR = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + (r - meanR) ** 2, 0) / (rets.length - 1);
    const volAnnPct = Math.sqrt(variance) * Math.sqrt(252) * 100;

    const high52 = Math.max(...pts.map((p) => p.close));
    const low52 = Math.min(...pts.map((p) => p.close));
    const drawdownPct = high52 > 0 ? ((last / high52) - 1) * 100 : null;

    return {
        vsSma200Pct,
        ret1mPct: backPct(21),
        ret3mPct: backPct(63),
        ret6mPct: backPct(126),
        ret12mPct: pts.length >= 240 ? backPct(pts.length - 1) : null,
        volAnnPct,
        drawdownPct,
        high52,
        low52,
    };
}

/**
 * Fetch everything we can about an ETF from Yahoo, enriching portfolio
 * gaps from the registry's US proxy when available.
 */
export async function fetchEtfDetail(symbol: string, entry?: EtfEntry): Promise<EtfRawData | null> {
    const now = new Date();
    const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1); oneYearAgo.setDate(oneYearAgo.getDate() - 30);
    const fiveYearsAgo = new Date(now); fiveYearsAgo.setFullYear(now.getFullYear() - 5);

    const [summary, daily, weekly] = await Promise.all([
        fetchSummary(symbol),
        yf.chart(symbol, { period1: oneYearAgo, interval: "1d" }).catch(() => null),
        yf.chart(symbol, { period1: fiveYearsAgo, interval: "1wk" }).catch(() => null),
    ]);

    const price = summary?.price?.regularMarketPrice;
    if (!summary || price == null) return null;

    // ── Base fields from the UCITS listing ──
    let topHoldings = parseHoldings(summary);
    let sectorWeights = parseSectors(summary);
    let underlyingPE = normalizeRatio(summary.topHoldings?.equityHoldings?.priceToEarnings);
    let underlyingPB = normalizeRatio(summary.topHoldings?.equityHoldings?.priceToBook);
    let dividendYield = summary.summaryDetail?.yield ?? null;
    let beta3y = summary.defaultKeyStatistics?.beta3Year ?? null;
    let turnover = summary.fundProfile?.feesExpensesInvestment?.annualHoldingsTurnover ?? null;

    // TER: curated value wins (Yahoo often reports 0 for UCITS)
    const yahooTer = summary.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio ?? null;
    let ter: number | null = null;
    let terSource: EtfRawData["terSource"] = null;
    if (entry?.ter != null && entry.ter >= 0) { ter = entry.ter; terSource = "curated"; }
    else if (yahooTer != null && yahooTer > 0) { ter = yahooTer; terSource = "yahoo"; }

    // ── Proxy enrichment for missing portfolio data ──
    // Physical gold ETCs have no basket: proxying yield/turnover from GLD
    // would be nonsense, so they never enrich.
    const proxiedFields: string[] = [];
    let proxySymbol: string | null = null;
    const isGold = entry?.category === "gold";
    const needsProxy = !isGold && entry?.usProxy &&
        (topHoldings.length === 0 || sectorWeights.length === 0 || underlyingPE === null ||
            dividendYield === null || turnover === null || beta3y === null);

    if (needsProxy && entry?.usProxy) {
        const proxy = await fetchSummary(entry.usProxy);
        if (proxy) {
            proxySymbol = entry.usProxy;
            if (topHoldings.length === 0) {
                const ph = parseHoldings(proxy);
                if (ph.length > 0) { topHoldings = ph; proxiedFields.push("holdings"); }
            }
            if (sectorWeights.length === 0) {
                const ps = parseSectors(proxy);
                if (ps.length > 0) { sectorWeights = ps; proxiedFields.push("sectors"); }
            }
            if (underlyingPE === null) {
                underlyingPE = normalizeRatio(proxy.topHoldings?.equityHoldings?.priceToEarnings);
                if (underlyingPE !== null) proxiedFields.push("pe");
            }
            if (underlyingPB === null) {
                underlyingPB = normalizeRatio(proxy.topHoldings?.equityHoldings?.priceToBook);
            }
            if (dividendYield === null && proxy.summaryDetail?.yield != null) {
                dividendYield = proxy.summaryDetail.yield;
                proxiedFields.push("yield");
            }
            if (beta3y === null && proxy.defaultKeyStatistics?.beta3Year != null) {
                beta3y = proxy.defaultKeyStatistics.beta3Year;
            }
            if (turnover === null) {
                const pt = proxy.fundProfile?.feesExpensesInvestment?.annualHoldingsTurnover;
                if (pt != null) { turnover = pt; proxiedFields.push("turnover"); }
            }
            if (proxiedFields.length === 0) proxySymbol = null; // nothing actually used
        }
    }

    // ── Momentum from daily bars ──
    const dailyQuotes = (daily?.quotes ?? []).map((q) => ({ date: q.date, close: q.close ?? q.adjclose ?? null }));
    const mom = momentumFromDaily(dailyQuotes);

    // ── 5y weekly chart ──
    const historicalPrices: EtfPricePoint[] = (weekly?.quotes ?? [])
        .filter((q) => (q.close ?? q.adjclose) != null)
        .map((q) => ({
            date: q.date.toISOString().slice(0, 10),
            price: (q.close ?? q.adjclose) as number,
        }));

    const inception = summary.defaultKeyStatistics?.fundInceptionDate;

    return {
        symbol,
        name: summary.price?.longName ?? summary.price?.shortName ?? entry?.name ?? symbol,
        currency: summary.price?.currency ?? "EUR",
        price,

        ter,
        terSource,
        totalAssets: summary.defaultKeyStatistics?.totalAssets ?? summary.summaryDetail?.totalAssets ?? null,
        inceptionDate: inception ? new Date(inception).toISOString() : null,
        turnover,
        dividendYield,
        beta3y,
        fundFamily: summary.fundProfile?.family ?? null,
        yahooCategory: summary.fundProfile?.categoryName ?? null,

        topHoldings,
        sectorWeights,
        underlyingPE,
        underlyingPB,

        vsSma200Pct: mom?.vsSma200Pct ?? null,
        ret1mPct: mom?.ret1mPct ?? null,
        ret3mPct: mom?.ret3mPct ?? null,
        ret6mPct: mom?.ret6mPct ?? null,
        ret12mPct: mom?.ret12mPct ?? null,
        volAnnPct: mom?.volAnnPct ?? null,
        drawdownPct: mom?.drawdownPct ?? null,
        high52: mom?.high52 ?? null,
        low52: mom?.low52 ?? null,

        historicalPrices,

        proxySymbol,
        proxiedFields,
    };
}
