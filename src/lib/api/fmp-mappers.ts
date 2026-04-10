// ============================================================
// FMP Mappers - Transform FMP responses → domain types
// ============================================================
// Pure functions: easy to test, easy to swap data sources later.

import type { Company, FinancialMetrics, HistoricalDataPoint } from "../types";
import type {
    FMPScreenerResult,
    FMPProfile,
    FMPKeyMetricsTTM,
    FMPRatiosTTM,
    FMPQuote,
    FMPHistoricalPrice,
    FMPIncomeStatement,
    FMPBalanceSheet,
} from "./types";

/** Map a screener result to a lightweight Company (metrics will be partial) */
export function mapScreenerToCompany(item: FMPScreenerResult): Company {
    return {
        id: `fmp_${item.symbol}`,
        ticker: item.symbol,
        name: item.companyName,
        sector: item.sector || "Unknown",
        exchange: item.exchangeShortName || item.exchange || "",
        description: "",
        historicalData: [],
        metrics: {
            marketCap: item.marketCap / 1_000_000, // FMP returns raw, we store in millions
            totalEquity: 0,    // filled on detail load
            operatingProfit: 0, // filled on detail load
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
            currentPrice: item.price,
            fiftyTwoWeekLow: item.price, // filled on detail load
            fiftyTwoWeekHigh: item.price, // filled on detail load
            oneMonthReturn: 0,
            threeMonthReturn: 0,
            sixMonthReturn: 0,
        },
    };
}

/** Enrich a Company with detailed data from multiple endpoints */
export function enrichCompanyWithDetails(
    base: Company,
    profile: FMPProfile | null,
    metrics: FMPKeyMetricsTTM | null,
    ratios: FMPRatiosTTM | null,
    quote: FMPQuote | null,
    historicalPrices: FMPHistoricalPrice[],
    incomeStatements: FMPIncomeStatement[],
    balanceSheets: FMPBalanceSheet[],
): Company {
    const m = { ...base.metrics };

    // ── Profile ────────────────────────────────────────────────
    if (profile) {
        base = {
            ...base,
            description: profile.description || base.description,
            exchange: profile.exchangeShortName || base.exchange,
        };
    }

    // ── Quote (price & 52-week) ────────────────────────────────
    if (quote) {
        m.currentPrice = quote.price;
        m.fiftyTwoWeekLow = quote.yearLow;
        m.fiftyTwoWeekHigh = quote.yearHigh;
        m.marketCap = quote.marketCap / 1_000_000;

        // Compute momentum from price averages
        if (quote.priceAvg50 > 0) {
            m.oneMonthReturn = (quote.price - quote.priceAvg50) / quote.priceAvg50;
        }
        if (quote.priceAvg200 > 0) {
            m.sixMonthReturn = (quote.price - quote.priceAvg200) / quote.priceAvg200;
        }
        // 3M return: estimate from midpoint of 50 and 200-day averages
        if (quote.priceAvg50 > 0 && quote.priceAvg200 > 0) {
            const avg3m = (quote.priceAvg50 + quote.priceAvg200) / 2;
            m.threeMonthReturn = (quote.price - avg3m) / avg3m;
        }
    }

    // ── Key Metrics TTM ────────────────────────────────────────
    if (metrics) {
        m.fcfYield = metrics.freeCashFlowYieldTTM || 0;
        m.roe = metrics.roeTTM || 0;
        m.roc = metrics.roicTTM || 0;

        // Book-to-Market: inverse of P/B ratio
        if (metrics.pbRatioTTM && metrics.pbRatioTTM > 0) {
            m.bookToMarket = 1 / metrics.pbRatioTTM;
        }
    }

    // ── Ratios TTM ─────────────────────────────────────────────
    if (ratios) {
        m.ebitMargin = ratios.operatingProfitMarginTTM || 0;
        m.grossMargin = ratios.grossProfitMarginTTM || 0;
    }

    // ── Income Statements (trends from last 2 years) ───────────
    if (incomeStatements.length >= 2) {
        const [latest, prior] = incomeStatements; // FMP returns newest first
        m.operatingProfit = (latest.operatingIncome || 0) / 1_000_000;

        // EBIT Margin delta
        const latestEbitMargin = latest.revenue > 0 ? latest.operatingIncome / latest.revenue : 0;
        const priorEbitMargin = prior.revenue > 0 ? prior.operatingIncome / prior.revenue : 0;
        m.ebitMarginDelta = latestEbitMargin - priorEbitMargin;

        // Gross Margin delta
        const latestGrossMargin = latest.revenue > 0 ? latest.grossProfit / latest.revenue : 0;
        const priorGrossMargin = prior.revenue > 0 ? prior.grossProfit / prior.revenue : 0;
        m.grossMarginDelta = latestGrossMargin - priorGrossMargin;

        // EBITDA growth
        if (prior.ebitda > 0) {
            m.ebitdaGrowth = (latest.ebitda - prior.ebitda) / Math.abs(prior.ebitda);
        }
    } else if (incomeStatements.length === 1) {
        m.operatingProfit = (incomeStatements[0].operatingIncome || 0) / 1_000_000;
    }

    // ── Balance Sheets (equity, asset growth) ──────────────────
    if (balanceSheets.length >= 1) {
        m.totalEquity = (balanceSheets[0].totalStockholdersEquity || 0) / 1_000_000;
    }

    if (balanceSheets.length >= 2) {
        const [latest, prior] = balanceSheets;
        if (prior.totalAssets > 0) {
            m.assetGrowth = (latest.totalAssets - prior.totalAssets) / Math.abs(prior.totalAssets);
        }

        // ROE delta (approximate from equity changes)
        const latestROE = latest.totalStockholdersEquity > 0
            ? (incomeStatements[0]?.netIncome || 0) / latest.totalStockholdersEquity
            : 0;
        const priorROE = prior.totalStockholdersEquity > 0 && incomeStatements[1]
            ? (incomeStatements[1]?.netIncome || 0) / prior.totalStockholdersEquity
            : 0;
        m.roeDelta = latestROE - priorROE;
        m.rocDelta = m.roeDelta * 0.8; // approximate ROC delta
    }

    // ── Historical Prices → chart data ─────────────────────────
    const historicalData = mapHistoricalPrices(historicalPrices, ratios);

    return {
        ...base,
        metrics: m,
        historicalData,
    };
}

/** Map FMP historical prices to our chart format */
function mapHistoricalPrices(
    prices: FMPHistoricalPrice[],
    ratios: FMPRatiosTTM | null
): HistoricalDataPoint[] {
    // FMP returns newest first — reverse for chronological order
    const sorted = [...prices].reverse();

    return sorted.map((p) => ({
        date: p.date,
        price: p.close,
        // For historical margins/ratios we only have TTM snapshots;
        // we spread the current TTM values uniformly (UI shows trend direction)
        ebitMargin: ratios?.operatingProfitMarginTTM || 0,
        grossMargin: ratios?.grossProfitMarginTTM || 0,
        roe: ratios?.returnOnEquityTTM || 0,
        roc: ratios?.returnOnCapitalEmployedTTM || 0,
        fcfYield: 0, // not available per data point
    }));
}
