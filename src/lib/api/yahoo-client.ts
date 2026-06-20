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

/** One annual row from fundamentalsTimeSeries (only the fields we read). */
interface AnnualRow {
    date?: Date | string;
    totalRevenue?: number;
    grossProfit?: number;
    EBITDA?: number;
    EBIT?: number;
    operatingIncome?: number;
    netIncome?: number;
    totalAssets?: number;
    stockholdersEquity?: number;
    investedCapital?: number;
    netDebt?: number;
    totalDebt?: number;
    interestExpense?: number;
    operatingCashFlow?: number;
    ordinarySharesNumber?: number;
    shareIssued?: number;
    tangibleBookValue?: number;
}

/**
 * Fetch up to 4 annual statement rows via fundamentalsTimeSeries.
 * The legacy quoteSummary statement modules (incomeStatementHistory /
 * balanceSheetHistory) have returned almost no data since Nov 2024 —
 * this is the supported replacement. Returns rows sorted oldest→newest.
 */
async function fetchAnnualFundamentals(ticker: string): Promise<AnnualRow[]> {
    try {
        const period2 = new Date();
        const period1 = new Date();
        period1.setFullYear(period1.getFullYear() - 4);
        const rows = await yf.fundamentalsTimeSeries(ticker, {
            period1, period2, type: "annual", module: "all",
        }) as AnnualRow[];
        if (!Array.isArray(rows)) return [];
        return rows
            .filter((r) => r && (r.totalRevenue || r.totalAssets))
            .sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
    } catch {
        console.warn(`[Yahoo] fundamentalsTimeSeries fail for ${ticker}`);
        return [];
    }
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
        let sectorInfo = "";
        let description = "";
        // Catalysts & sentiment (same single quoteSummary call — no extra request)
        let nextEarningsDate: string | undefined;
        let exDividendDate: string | undefined;
        let insiderBuyCount6m: number | undefined;
        let insiderSellCount6m: number | undefined;
        let insiderNetPct6m: number | undefined;
        let epsRevisionsUp30d: number | undefined;
        let epsRevisionsDown30d: number | undefined;
        let epsTrend30d: number | undefined;
        let hasInsiders = false;
        let hasRevisions = false;

        try {
            const summary = await yf.quoteSummary(ticker, {
                modules: [
                    "financialData", "defaultKeyStatistics", "assetProfile",
                    "calendarEvents", "netSharePurchaseActivity", "earningsTrend",
                ],
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s = summary as any;
            financialData = s?.financialData || null;
            keyStats = s?.defaultKeyStatistics || null;
            sectorInfo = s?.assetProfile?.sector || "";
            description = s?.assetProfile?.longBusinessSummary || "";

            // Calendar: next earnings + ex-dividend
            const ed = s?.calendarEvents?.earnings?.earningsDate?.[0];
            if (ed) nextEarningsDate = new Date(ed).toISOString();
            const xd = s?.calendarEvents?.exDividendDate;
            if (xd) exDividendDate = new Date(xd).toISOString();

            // Insider activity (US Form 4 — counts are 0/absent for most EU tickers)
            const ns = s?.netSharePurchaseActivity;
            if (ns && (Number(ns.buyInfoCount || 0) + Number(ns.sellInfoCount || 0)) > 0) {
                insiderBuyCount6m = Number(ns.buyInfoCount || 0);
                insiderSellCount6m = Number(ns.sellInfoCount || 0);
                insiderNetPct6m = ns.netPercentInsiderShares !== undefined ? Number(ns.netPercentInsiderShares) : undefined;
                hasInsiders = true;
            }

            // Analyst EPS estimate revisions (current fiscal year) — works for EU too
            const trend0y = s?.earningsTrend?.trend?.find((tr: { period?: string }) => tr?.period === "0y");
            if (trend0y?.epsRevisions) {
                epsRevisionsUp30d = Number(trend0y.epsRevisions.upLast30days || 0);
                epsRevisionsDown30d = Number(trend0y.epsRevisions.downLast30days || 0);
                const cur = Number(trend0y.epsTrend?.current || 0);
                const ago = Number(trend0y.epsTrend?.["30daysAgo"] || 0);
                if (cur && ago) epsTrend30d = cur / ago - 1;
                hasRevisions = true;
            }
        } catch {
            console.warn(`[Yahoo] quoteSummary partial fail for ${ticker}`);
        }

        // Classic solvency metrics (net debt/EBITDA, interest coverage) are
        // meaningless for banks/insurers: customer deposits count as "debt",
        // interest is their cost of goods, EBITDA isn't a real measure. Flag
        // the whole solvency block N/A so it renormalizes out and the hard
        // filter is skipped — financials get valued on equity FCF + B/M instead.
        const isFinancialSector = /financial/i.test(sectorInfo);

        // Annual statement history (modern endpoint; legacy modules are dead)
        const annual = await fetchAnnualFundamentals(ticker);
        const latest = annual[annual.length - 1];
        const prior = annual[annual.length - 2];

        // ── Core metrics ────────────────────────────────────────
        const marketCap = (quote.marketCap || 0) / 1_000_000;
        const price = quote.regularMarketPrice || 0;
        const yearLow = quote.fiftyTwoWeekLow || price;
        const yearHigh = quote.fiftyTwoWeekHigh || price;
        const avg50 = quote.fiftyDayAverage || price;
        const avg200 = quote.twoHundredDayAverage || price;

        // ── Equity & operating profit ───────────────────────────
        let equity = latest?.stockholdersEquity
            ? Number(latest.stockholdersEquity) / 1_000_000
            : 0;
        if (equity === 0 || isNaN(equity)) {
            const pb = keyStats?.priceToBook ? Number(keyStats.priceToBook) : 0;
            if (pb > 0 && marketCap > 0) equity = marketCap / pb;
        }

        const operatingIncome = latest?.operatingIncome
            ? Number(latest.operatingIncome) / 1_000_000
            : (financialData?.operatingMargins
                ? Number(financialData.operatingMargins) * Number(financialData.totalRevenue || 0) / 1_000_000
                : 0);

        // ── FCF Yield ───────────────────────────────────────────
        const fcf = financialData?.freeCashflow ? Number(financialData.freeCashflow) : 0;
        const mcapRaw = quote.marketCap || 1;
        const fcfYield = mcapRaw > 0 ? fcf / mcapRaw : 0;

        // ── Book-to-Market ──────────────────────────────────────
        const bookValue = keyStats?.bookValue ? Number(keyStats.bookValue) : 0;
        const bookToMarket = price > 0 ? bookValue / price : 0;

        // ── Margins & returns (TTM levels from financialData) ───
        const ebitMargin = financialData?.operatingMargins ? Number(financialData.operatingMargins) : 0;
        const grossMargin = financialData?.grossMargins ? Number(financialData.grossMargins) : 0;
        const roe = financialData?.returnOnEquity ? Number(financialData.returnOnEquity) : 0;

        // Real Return on Capital: EBIT / invested capital (latest annual).
        // (The old 1/EV-EBITDA formula was a valuation yield, not a return —
        // it reported 3.7% for a company whose true ROC is ~35%.)
        let roc = 0;
        let hasRoc = false;
        if (latest?.EBIT && latest?.investedCapital && Number(latest.investedCapital) > 0) {
            roc = Number(latest.EBIT) / Number(latest.investedCapital);
            hasRoc = true;
        } else if (financialData?.returnOnAssets) {
            roc = Number(financialData.returnOnAssets); // honest fallback: real ROA
            hasRoc = true;
        }

        // ── YoY deltas (real, from two annual statements) ───────
        let ebitMarginDelta = 0, grossMarginDelta = 0, roeDelta = 0, rocDelta = 0;
        let hasDeltas = false;
        if (latest && prior) {
            const rev0 = Number(latest.totalRevenue || 0);
            const rev1 = Number(prior.totalRevenue || 0);
            if (rev0 > 0 && rev1 > 0) {
                hasDeltas = true;
                const op0 = Number(latest.operatingIncome || 0);
                const op1 = Number(prior.operatingIncome || 0);
                ebitMarginDelta = op0 / rev0 - op1 / rev1;
                const gp0 = Number(latest.grossProfit || 0);
                const gp1 = Number(prior.grossProfit || 0);
                if (gp0 && gp1) grossMarginDelta = gp0 / rev0 - gp1 / rev1;

                const eq0 = Number(latest.stockholdersEquity || 0);
                const eq1 = Number(prior.stockholdersEquity || 0);
                if (eq0 > 0 && eq1 > 0) {
                    roeDelta = Number(latest.netIncome || 0) / eq0 - Number(prior.netIncome || 0) / eq1;
                }
                const ic0 = Number(latest.investedCapital || 0);
                const ic1 = Number(prior.investedCapital || 0);
                if (ic0 > 0 && ic1 > 0) {
                    rocDelta = Number(latest.EBIT || 0) / ic0 - Number(prior.EBIT || 0) / ic1;
                }
            }
        }

        // ── Reinvestment efficiency (real growth figures) ───────
        let assetGrowth = 0, ebitdaGrowth = 0;
        let hasGrowth = false;
        if (latest && prior) {
            const a0 = Number(latest.totalAssets || 0);
            const a1 = Number(prior.totalAssets || 0);
            const e0 = Number(latest.EBITDA ?? latest.operatingIncome ?? 0);
            const e1 = Number(prior.EBITDA ?? prior.operatingIncome ?? 0);
            if (a1 > 0 && Math.abs(e1) > 0) {
                assetGrowth = (a0 - a1) / Math.abs(a1);
                ebitdaGrowth = (e0 - e1) / Math.abs(e1);
                hasGrowth = true;
            }
        }

        // ── Solvency & balance quality ──────────────────────────
        // Net debt: prefer the audited annual figure (includes ST investments),
        // fall back to the cruder TTM totalDebt − totalCash.
        let netDebt: number | null = null;
        if (latest?.netDebt !== undefined) netDebt = Number(latest.netDebt);
        else if (latest?.totalDebt !== undefined) netDebt = Number(latest.totalDebt); // no cash info in row
        else if (financialData?.totalDebt !== undefined) {
            netDebt = Number(financialData.totalDebt) - Number(financialData.totalCash || 0);
        }
        const ebitdaTtm = financialData?.ebitda ? Number(financialData.ebitda)
            : latest?.EBITDA ? Number(latest.EBITDA) : 0;

        let netDebtToEbitda: number | undefined;
        let interestCoverage: number | undefined;
        let evFcfYield: number | undefined;
        let hasSolvency = false;
        if (!isFinancialSector) {
            if (netDebt !== null && ebitdaTtm > 0) {
                netDebtToEbitda = netDebt / ebitdaTtm;
                const ev = mcapRaw + Math.max(netDebt, 0); // net cash doesn't shrink EV below mcap for yield purposes
                evFcfYield = ev > 0 ? fcf / ev : 0;
                hasSolvency = true;
            }
            if (latest?.EBIT && latest?.interestExpense && Number(latest.interestExpense) > 0) {
                interestCoverage = Number(latest.EBIT) / Number(latest.interestExpense);
                hasSolvency = true;
            }
        }

        // Tangible book / market — strips goodwill & intangibles from B/M.
        const tangibleBookToMarket = latest?.tangibleBookValue !== undefined && mcapRaw > 0
            ? Number(latest.tangibleBookValue) / mcapRaw
            : undefined;

        // ── Dilution: annualized share-count growth ─────────────
        let sharesDilution: number | undefined;
        let hasDilution = false;
        const sharesOf = (r?: AnnualRow) => Number(r?.ordinarySharesNumber ?? r?.shareIssued ?? 0);
        if (annual.length >= 2) {
            const s0 = sharesOf(annual[0]);
            const sN = sharesOf(annual[annual.length - 1]);
            const yrs = annual.length - 1;
            if (s0 > 0 && sN > 0) {
                sharesDilution = Math.pow(sN / s0, 1 / yrs) - 1;
                hasDilution = true;
            }
        }

        // ── Accruals: earnings vs cash gap ──────────────────────
        let accrualRatio: number | undefined;
        let hasAccruals = false;
        if (latest?.netIncome !== undefined && latest?.operatingCashFlow !== undefined && Number(latest.totalAssets) > 0) {
            accrualRatio = (Number(latest.netIncome) - Number(latest.operatingCashFlow)) / Number(latest.totalAssets);
            hasAccruals = true;
        }

        // ── Informational extras ────────────────────────────────
        const insiderOwnership = keyStats?.heldPercentInsiders !== undefined ? Number(keyStats.heldPercentInsiders) : undefined;
        const shortPctFloat = keyStats?.shortPercentOfFloat !== undefined ? Number(keyStats.shortPercentOfFloat) : undefined;

        // ── Trend position vs moving averages ──────────────────
        // (Proxies: distance from 50DMA / 200DMA — trend structure, not literal returns)
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
                netDebtToEbitda,
                interestCoverage,
                evFcfYield,
                tangibleBookToMarket,
                sharesDilution,
                accrualRatio,
                insiderOwnership,
                shortPctFloat,
                nextEarningsDate,
                exDividendDate,
                insiderBuyCount6m,
                insiderSellCount6m,
                insiderNetPct6m,
                epsRevisionsUp30d,
                epsRevisionsDown30d,
                epsTrend30d,
                dataQuality: {
                    deltas: hasDeltas, roc: hasRoc, growth: hasGrowth,
                    solvency: hasSolvency, dilution: hasDilution, accruals: hasAccruals,
                    insiders: hasInsiders, revisions: hasRevisions,
                },
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

        const result = await yf.chart(ticker, {
            period1: fromDate,
            interval: "1wk",
        }) as { quotes?: Array<{ date: Date | string; close: number | null }> };

        if (!result?.quotes) return [];

        return result.quotes
            .filter((q) => q.close != null)
            .map((q) => ({
                date: new Date(q.date).toISOString().split("T")[0],
                price: Number(q.close),
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
