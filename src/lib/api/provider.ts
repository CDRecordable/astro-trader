// ============================================================
// Provider Orchestrator - 2-Layer Data Strategy
// ============================================================
// Layer 1: yahoo-finance2 (bulk scan + detail, free, no limits)
// Layer 2: Neon PostgreSQL (daily cache via Drizzle)

import { db, withDbRetry } from "@/db";
import { companies, scanLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { scanTickers, fetchCompanyFromYahoo, fetchYahooHistoricalPrices } from "./yahoo-client";
import type { Company, HistoricalDataPoint } from "../types";

const CACHE_TTL_HOURS = 24;

// ── Helpers ─────────────────────────────────────────────────

function isCacheFresh(lastScanned: Date | null): boolean {
    if (!lastScanned) return false;
    const age = Date.now() - lastScanned.getTime();
    return age < CACHE_TTL_HOURS * 60 * 60 * 1000;
}

function dbRowToCompany(row: typeof companies.$inferSelect): Company {
    return {
        // Same prefix as a freshly-fetched company so id-derived lookup keys
        // (watchlist/discards) are consistent whether the data is cached or live.
        id: `yf_${row.ticker}`,
        ticker: row.ticker,
        name: row.name,
        sector: row.sector || "",
        exchange: row.exchange || "",
        description: row.description || "",
        historicalData: (row.historicalData as HistoricalDataPoint[]) || [],
        metrics: {
            marketCap: row.marketCap || 0,
            totalEquity: row.totalEquity || 0,
            operatingProfit: row.operatingProfit || 0,
            fcfYield: row.fcfYield || 0,
            bookToMarket: row.bookToMarket || 0,
            ebitMargin: row.ebitMargin || 0,
            grossMargin: row.grossMargin || 0,
            roe: row.roe || 0,
            roc: row.roc || 0,
            ebitMarginDelta: row.ebitMarginDelta || 0,
            grossMarginDelta: row.grossMarginDelta || 0,
            roeDelta: row.roeDelta || 0,
            rocDelta: row.rocDelta || 0,
            assetGrowth: row.assetGrowth || 0,
            ebitdaGrowth: row.ebitdaGrowth || 0,
            currentPrice: row.currentPrice || 0,
            fiftyTwoWeekLow: row.fiftyTwoWeekLow || 0,
            fiftyTwoWeekHigh: row.fiftyTwoWeekHigh || 0,
            oneMonthReturn: row.oneMonthReturn || 0,
            threeMonthReturn: row.threeMonthReturn || 0,
            sixMonthReturn: row.sixMonthReturn || 0,
            dataQuality: (row.dataQuality as Company["metrics"]["dataQuality"]) ?? undefined,
            ...((row.extendedMetrics as Partial<Company["metrics"]>) ?? {}),
        },
    };
}

function companyToDbValues(c: Company) {
    return {
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        exchange: c.exchange,
        description: c.description,
        marketCap: c.metrics.marketCap,
        totalEquity: c.metrics.totalEquity,
        operatingProfit: c.metrics.operatingProfit,
        fcfYield: c.metrics.fcfYield,
        bookToMarket: c.metrics.bookToMarket,
        ebitMargin: c.metrics.ebitMargin,
        grossMargin: c.metrics.grossMargin,
        roe: c.metrics.roe,
        roc: c.metrics.roc,
        ebitMarginDelta: c.metrics.ebitMarginDelta,
        grossMarginDelta: c.metrics.grossMarginDelta,
        roeDelta: c.metrics.roeDelta,
        rocDelta: c.metrics.rocDelta,
        assetGrowth: c.metrics.assetGrowth,
        ebitdaGrowth: c.metrics.ebitdaGrowth,
        currentPrice: c.metrics.currentPrice,
        fiftyTwoWeekLow: c.metrics.fiftyTwoWeekLow,
        fiftyTwoWeekHigh: c.metrics.fiftyTwoWeekHigh,
        oneMonthReturn: c.metrics.oneMonthReturn,
        threeMonthReturn: c.metrics.threeMonthReturn,
        sixMonthReturn: c.metrics.sixMonthReturn,
        dataQuality: c.metrics.dataQuality ?? null,
        extendedMetrics: {
            netDebtToEbitda: c.metrics.netDebtToEbitda,
            interestCoverage: c.metrics.interestCoverage,
            evFcfYield: c.metrics.evFcfYield,
            tangibleBookToMarket: c.metrics.tangibleBookToMarket,
            sharesDilution: c.metrics.sharesDilution,
            accrualRatio: c.metrics.accrualRatio,
            insiderOwnership: c.metrics.insiderOwnership,
            shortPctFloat: c.metrics.shortPctFloat,
            nextEarningsDate: c.metrics.nextEarningsDate,
            exDividendDate: c.metrics.exDividendDate,
            insiderBuyCount6m: c.metrics.insiderBuyCount6m,
            insiderSellCount6m: c.metrics.insiderSellCount6m,
            insiderNetPct6m: c.metrics.insiderNetPct6m,
            epsRevisionsUp30d: c.metrics.epsRevisionsUp30d,
            epsRevisionsDown30d: c.metrics.epsRevisionsDown30d,
            epsTrend30d: c.metrics.epsTrend30d,
            peRatio: c.metrics.peRatio,
            annualFinancials: c.metrics.annualFinancials,
        },
        historicalData: c.historicalData,
        lastScannedAt: new Date(),
    };
}

// ── Layer 1 + 2: Screener (Yahoo → Neon cache) ─────────────

export async function getScreenerCompanies(tickers?: string[]): Promise<{
    companies: Company[];
    fromCache: boolean;
}> {
    // Check when last scan happened
    const lastScan = await withDbRetry(() => db
        .select()
        .from(scanLog)
        .where(eq(scanLog.scanType, "yahoo_bulk"))
        .orderBy(desc(scanLog.createdAt))
        .limit(1));

    // Only use cache if no specific tickers were requested
    if (!tickers && lastScan.length > 0 && isCacheFresh(lastScan[0].createdAt)) {
        // Return from Neon cache
        const cachedRows = await withDbRetry(() => db.select().from(companies));
        if (cachedRows.length > 0) {
            return {
                companies: cachedRows.map(dbRowToCompany),
                fromCache: true,
            };
        }
    }

    // Cache is stale or specific market requested — scan with Yahoo Finance
    console.log(`[Provider] Scanning ${tickers ? tickers.length + " tickers" : "all tickers"} with Yahoo Finance...`);
    const scanned = await scanTickers(tickers);

    // Only cache and log if we actually got results
    if (scanned.length > 0) {
        // Upsert into Neon
        for (const c of scanned) {
            const values = companyToDbValues(c);
            await db
                .insert(companies)
                .values(values)
                .onConflictDoUpdate({
                    target: companies.ticker,
                    set: { ...values, lastScannedAt: new Date() },
                });
        }

        // Log the scan
        await db.insert(scanLog).values({
            scanType: "yahoo_bulk",
            companiesCount: scanned.length,
            status: "completed",
        });
    } else {
        console.warn("[Provider] Yahoo scan returned 0 companies — not caching");
    }

    return { companies: scanned, fromCache: false };
}

// ── Layer 2: Detail enrichment (Yahoo only) ─────────────────

export async function getCompanyDetail(ticker: string, force = false): Promise<{
    company: Company;
    enriched: boolean;
    apiCalls: number;
}> {
    let apiCalls = 0;

    // Check Neon cache first (retry transient serverless-HTTP hiccups)
    const cachedRows = await withDbRetry(() => db
        .select()
        .from(companies)
        .where(eq(companies.ticker, ticker))
        .limit(1));

    const cached = cachedRows[0];
    if (!force && cached?.lastScannedAt && isCacheFresh(cached.lastScannedAt)) {
        const company = dbRowToCompany(cached);
        // Backfill historicalData with metric interpolation if needed
        backfillHistoricalMetrics(company);
        return {
            company,
            enriched: true,
            apiCalls: 0,
        };
    }

    // Fetch fresh detail from Yahoo
    let company = await fetchCompanyFromYahoo(ticker);
    apiCalls += 1;

    if (!company && cached) {
        company = dbRowToCompany(cached);
    } else if (!company) {
        throw new Error(`Company ${ticker} not found`);
    }

    // Fetch historical prices from Yahoo
    const historicalPrices = await fetchYahooHistoricalPrices(ticker, 12);
    apiCalls += 1;
    company.historicalData = historicalPrices;

    // --- Backfill Historical Data for Charts ---
    backfillHistoricalMetrics(company);

    // Save data to Neon
    const values = companyToDbValues(company);
    await db
        .insert(companies)
        .values(values)
        .onConflictDoUpdate({
            target: companies.ticker,
            set: values,
        });

    // Log enrichment
    await db.insert(scanLog).values({
        scanType: "yahoo_detail",
        companiesCount: 1,
        status: "completed",
    });

    return { company, enriched: true, apiCalls };
}

// ── Helpers: Backfill metrics into historical data ───────────

function backfillHistoricalMetrics(company: Company): void {
    const weeks = company.historicalData.length;
    if (weeks === 0) return;

    // Since we only fetch weekly prices historically, we interpolate
    // the financial metrics linearly over the 52 weeks using the current value and the YoY delta.
    company.historicalData.forEach((point, i) => {
        // Trend goes from 0 (oldest) to 1 (most recent)
        const trend = weeks > 1 ? i / (weeks - 1) : 1;

        // valueAtStart = currentValue - changeOverYear
        // currentPoint = valueAtStart + (changeOverYear * trend)
        point.ebitMargin = (company.metrics.ebitMargin - company.metrics.ebitMarginDelta) + (company.metrics.ebitMarginDelta * trend);
        point.grossMargin = (company.metrics.grossMargin - company.metrics.grossMarginDelta) + (company.metrics.grossMarginDelta * trend);
        point.roe = (company.metrics.roe - company.metrics.roeDelta) + (company.metrics.roeDelta * trend);
        point.roc = (company.metrics.roc - company.metrics.rocDelta) + (company.metrics.rocDelta * trend);

        // Clean up missing/NaNs
        point.ebitMargin = isNaN(point.ebitMargin) ? 0 : point.ebitMargin;
        point.grossMargin = isNaN(point.grossMargin) ? 0 : point.grossMargin;
        point.roe = isNaN(point.roe) ? 0 : point.roe;
        point.roc = isNaN(point.roc) ? 0 : point.roc;
    });
}
