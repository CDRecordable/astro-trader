// ============================================================
// Yahoo Finance Client - Bulk scanner (Layer 1)
// ============================================================
// Server-side only. Free, no API key, no rate limits.

import YahooFinance from "yahoo-finance2";
import type { Company, HistoricalDataPoint } from "../types";
import { MARKET_GROUPS } from "../market-groups";

// Re-export for backward compat
export { MARKET_GROUPS } from "../market-groups";
export type { MarketGroupId, MarketGroup } from "../market-groups";

// yahoo-finance2 v3 requires explicit instantiation
const yf = new YahooFinance();

// Legacy: all US tickers combined
const ALL_TICKERS = [
    ...MARKET_GROUPS.us_large.tickers,
    ...MARKET_GROUPS.us_mid.tickers,
    ...MARKET_GROUPS.us_small.tickers,
];

/** Scan a batch of tickers and return Company objects */
export async function scanTickers(
    tickers: string[] = ALL_TICKERS
): Promise<Company[]> {
    const companies: Company[] = [];

    // Process in batches of 10 to avoid overwhelming Yahoo
    const batchSize = 10;
    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map((ticker) => fetchCompanyFromYahoo(ticker))
        );

        for (const result of results) {
            if (result.status === "fulfilled" && result.value) {
                companies.push(result.value);
            }
        }

        // Small delay between batches
        if (i + batchSize < tickers.length) {
            await new Promise((r) => setTimeout(r, 300));
        }
    }

    return companies;
}

/** Fetch full company data from Yahoo Finance for a single ticker */
export async function fetchCompanyFromYahoo(
    ticker: string
): Promise<Company | null> {
    try {
        // Fetch quote first (always works)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote: any = await yf.quote(ticker);
        if (!quote) return null;

        // Fetch financial data with separate calls for type safety
        let financialData: Record<string, unknown> | null = null;
        let keyStats: Record<string, unknown> | null = null;
        let incomeHistory: Array<Record<string, unknown>> = [];
        let balanceHistory: Array<Record<string, unknown>> = [];
        let sectorInfo = "";
        let description = "";

        try {
            const summary = await yf.quoteSummary(ticker, {
                modules: ["financialData", "defaultKeyStatistics", "assetProfile"],
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s = summary as any;
            financialData = s?.financialData || null;
            keyStats = s?.defaultKeyStatistics || null;
            sectorInfo = s?.assetProfile?.sector || "";
            description = s?.assetProfile?.longBusinessSummary || "";
        } catch {
            console.warn(`[Yahoo] quoteSummary partial fail for ${ticker}`);
        }

        try {
            const stmts = await yf.quoteSummary(ticker, {
                modules: ["incomeStatementHistory", "balanceSheetHistory"],
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = stmts as any;
            incomeHistory = st?.incomeStatementHistory?.incomeStatementHistory || [];
            balanceHistory = st?.balanceSheetHistory?.balanceSheetHistory || [];
        } catch {
            console.warn(`[Yahoo] statements fail for ${ticker}`);
        }

        // ── Core metrics ────────────────────────────────────────
        const marketCap = (quote.marketCap || 0) / 1_000_000;
        const price = quote.regularMarketPrice || 0;
        const yearLow = quote.fiftyTwoWeekLow || price;
        const yearHigh = quote.fiftyTwoWeekHigh || price;
        const avg50 = quote.fiftyDayAverage || price;
        const avg200 = quote.twoHundredDayAverage || price;

        // ── Equity & operating profit ───────────────────────────
        let equity = balanceHistory[0]?.totalStockholderEquity
            ? Number(balanceHistory[0].totalStockholderEquity) / 1_000_000
            : 0;

        if (equity === 0 || isNaN(equity)) {
            const pb = keyStats?.priceToBook ? Number(keyStats.priceToBook) : 0;
            if (pb > 0 && marketCap > 0) {
                equity = marketCap / pb;
            }
        }
        const opFromStatements = incomeHistory[0]?.operatingIncome
            ? Number(incomeHistory[0].operatingIncome) / 1_000_000
            : 0;
        const operatingIncome = opFromStatements ||
            ((financialData as Record<string, unknown>)?.operatingMargins
                ? Number((financialData as Record<string, unknown>).operatingMargins) *
                Number((financialData as Record<string, unknown>).totalRevenue || 0) / 1_000_000
                : 0);

        // ── FCF Yield ───────────────────────────────────────────
        const fcf = financialData?.freeCashflow ? Number(financialData.freeCashflow) : 0;
        const mcapRaw = quote.marketCap || 1;
        const fcfYield = mcapRaw > 0 ? fcf / mcapRaw : 0;

        // ── Book-to-Market ──────────────────────────────────────
        const bookValue = keyStats?.bookValue ? Number(keyStats.bookValue) : 0;
        const bookToMarket = price > 0 ? bookValue / price : 0;

        // ── Margins ─────────────────────────────────────────────
        const ebitMargin = financialData?.operatingMargins ? Number(financialData.operatingMargins) : 0;
        const grossMargin = financialData?.grossMargins ? Number(financialData.grossMargins) : 0;
        const roe = financialData?.returnOnEquity ? Number(financialData.returnOnEquity) : 0;
        const roc = keyStats?.enterpriseToEbitda
            ? 1 / Number(keyStats.enterpriseToEbitda)
            : 0;

        // ── Deltas (from income history) ────────────────────────
        let ebitMarginDelta = 0, grossMarginDelta = 0, ebitdaGrowth = 0;
        if (incomeHistory.length >= 2) {
            const rev0 = Number(incomeHistory[0]?.totalRevenue || 0);
            const rev1 = Number(incomeHistory[1]?.totalRevenue || 0);
            const op0 = Number(incomeHistory[0]?.operatingIncome || 0);
            const op1 = Number(incomeHistory[1]?.operatingIncome || 0);
            const gp0 = Number(incomeHistory[0]?.grossProfit || 0);
            const gp1 = Number(incomeHistory[1]?.grossProfit || 0);
            const ebitda0 = Number(incomeHistory[0]?.ebitda || op0);
            const ebitda1 = Number(incomeHistory[1]?.ebitda || op1);

            if (rev0 > 0 && rev1 > 0) {
                ebitMarginDelta = (op0 / rev0) - (op1 / rev1);
                grossMarginDelta = (gp0 / rev0) - (gp1 / rev1);
            }
            if (Math.abs(ebitda1) > 0) {
                ebitdaGrowth = (ebitda0 - ebitda1) / Math.abs(ebitda1);
            }
        }

        // ── Asset growth ────────────────────────────────────────
        let assetGrowth = 0;
        if (balanceHistory.length >= 2) {
            const a0 = Number(balanceHistory[0]?.totalAssets || 0);
            const a1 = Number(balanceHistory[1]?.totalAssets || 0);
            if (a1 > 0) assetGrowth = (a0 - a1) / Math.abs(a1);
        }

        // ── ROE delta ───────────────────────────────────────────
        let roeDelta = 0, rocDelta = 0;
        if (incomeHistory.length >= 2 && balanceHistory.length >= 2) {
            const ni0 = Number(incomeHistory[0]?.netIncome || 0);
            const ni1 = Number(incomeHistory[1]?.netIncome || 0);
            const eq0 = Number(balanceHistory[0]?.totalStockholderEquity || 1);
            const eq1 = Number(balanceHistory[1]?.totalStockholderEquity || 1);
            if (eq0 > 0 && eq1 > 0) roeDelta = (ni0 / eq0) - (ni1 / eq1);
            rocDelta = roeDelta * 0.8;
        }

        // ── Momentum ────────────────────────────────────────────
        const oneMonthReturn = avg50 > 0 ? (price - avg50) / avg50 : 0;
        const sixMonthReturn = avg200 > 0 ? (price - avg200) / avg200 : 0;
        const threeMonthReturn = (oneMonthReturn + sixMonthReturn) / 2;

        return {
            id: `yf_${ticker}`,
            ticker,
            name: quote.longName || quote.shortName || ticker,
            sector: sectorInfo,
            exchange: quote.exchange || "",
            description,
            historicalData: [],
            metrics: {
                marketCap,
                totalEquity: equity,
                operatingProfit: operatingIncome,
                fcfYield,
                bookToMarket,
                ebitMargin,
                grossMargin,
                roe,
                roc,
                ebitMarginDelta,
                grossMarginDelta,
                roeDelta,
                rocDelta,
                assetGrowth,
                ebitdaGrowth,
                currentPrice: price,
                fiftyTwoWeekLow: yearLow,
                fiftyTwoWeekHigh: yearHigh,
                oneMonthReturn,
                threeMonthReturn,
                sixMonthReturn,
            },
        };
    } catch (error) {
        console.error(`[Yahoo] Failed to fetch ${ticker}:`, error);
        return null;
    }
}

/** Fetch historical prices for charting */
export async function fetchYahooHistoricalPrices(
    ticker: string,
    months: number = 12
): Promise<HistoricalDataPoint[]> {
    try {
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - months);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await yf.chart(ticker, {
            period1: fromDate,
            interval: "1wk",
        });

        if (!result?.quotes) return [];

        return result.quotes
            .filter((q: any) => q.close != null)
            .map((q: any) => ({
                date: new Date(q.date).toISOString().split("T")[0],
                price: q.close,
                ebitMargin: 0,
                grossMargin: 0,
                roe: 0,
                roc: 0,
                fcfYield: 0,
            }));
    } catch (error) {
        console.error(`[Yahoo] Historical prices failed for ${ticker}:`, error);
        return [];
    }
}
