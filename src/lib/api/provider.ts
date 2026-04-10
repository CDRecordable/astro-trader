// ============================================================
// Provider Orchestrator - 3-Layer Data Strategy
// ============================================================
// Layer 1: yahoo-finance2 (bulk scan, free, no limits)
// Layer 2: Neon PostgreSQL (daily cache via Drizzle)
// Layer 3: FMP stable API (refinador for top candidates)

import { db } from "@/db";
import { companies, scanLog } from "@/db/schema";
import { eq, desc, gt } from "drizzle-orm";
import { scanTickers, fetchCompanyFromYahoo, fetchYahooHistoricalPrices } from "./yahoo-client";
import { fetchProfile, fetchKeyMetricsTTM, fetchRatiosTTM, fetchQuote, fetchIncomeStatements, fetchBalanceSheets } from "./fmp-client";
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
        id: `db_${row.ticker}`,
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
    const lastScan = await db
        .select()
        .from(scanLog)
        .where(eq(scanLog.scanType, "yahoo_bulk"))
        .orderBy(desc(scanLog.createdAt))
        .limit(1);

    // Only use cache if no specific tickers were requested
    if (!tickers && lastScan.length > 0 && isCacheFresh(lastScan[0].createdAt)) {
        // Return from Neon cache
        const cachedRows = await db.select().from(companies);
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

// ── Layer 3: Detail enrichment (Yahoo detail + FMP) ─────────

export async function getCompanyDetail(ticker: string): Promise<{
    company: Company;
    enriched: boolean;
    apiCalls: number;
}> {
    let apiCalls = 0;

    // Check Neon cache first
    const cachedRows = await db
        .select()
        .from(companies)
        .where(eq(companies.ticker, ticker))
        .limit(1);

    const cached = cachedRows[0];
    const hasMeaningfulDeltas = cached && (
        cached.ebitMarginDelta !== 0 ||
        cached.grossMarginDelta !== 0 ||
        cached.roeDelta !== 0 ||
        cached.assetGrowth !== 0 ||
        cached.ebitdaGrowth !== 0
    );
    if (cached?.enrichedByFmp && cached.lastEnrichedAt && isCacheFresh(cached.lastEnrichedAt) && hasMeaningfulDeltas) {
        const company = dbRowToCompany(cached);
        // Backfill historicalData if needed (cache might have empty arrays from before backfill logic)
        if (company.historicalData.length > 0 && company.metrics.ebitMarginDelta === 0 && company.metrics.ebitMargin !== 0) {
            const weeks = company.historicalData.length;
            company.historicalData.forEach((point, i) => {
                const trend = i / (weeks - 1);
                point.ebitMargin = company.metrics.ebitMargin;
                point.grossMargin = company.metrics.grossMargin;
                point.roe = company.metrics.roe;
                point.roc = company.metrics.roc;
            });
        }
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

    // Try FMP refinement (optional — if it fails, we still have Yahoo data)
    let enrichedByFmp = false;
    try {
        const [fmpQuote, fmpMetrics, fmpRatios] = await Promise.all([
            fetchQuote(ticker),
            fetchKeyMetricsTTM(ticker),
            fetchRatiosTTM(ticker),
        ]);
        apiCalls += 3;

        if (fmpQuote) {
            company.metrics.currentPrice = fmpQuote.price || company.metrics.currentPrice;
            company.metrics.fiftyTwoWeekLow = fmpQuote.yearLow || company.metrics.fiftyTwoWeekLow;
            company.metrics.fiftyTwoWeekHigh = fmpQuote.yearHigh || company.metrics.fiftyTwoWeekHigh;
        }

        if (fmpMetrics) {
            if (fmpMetrics.freeCashFlowYieldTTM) company.metrics.fcfYield = fmpMetrics.freeCashFlowYieldTTM;
            if (fmpMetrics.roeTTM) company.metrics.roe = fmpMetrics.roeTTM;
            if (fmpMetrics.roicTTM) company.metrics.roc = fmpMetrics.roicTTM;
            if (fmpMetrics.pbRatioTTM && fmpMetrics.pbRatioTTM > 0) {
                company.metrics.bookToMarket = 1 / fmpMetrics.pbRatioTTM;
            }
        }

        if (fmpRatios) {
            if (fmpRatios.operatingProfitMarginTTM) company.metrics.ebitMargin = fmpRatios.operatingProfitMarginTTM;
            if (fmpRatios.grossProfitMarginTTM) company.metrics.grossMargin = fmpRatios.grossProfitMarginTTM;
        }

        enrichedByFmp = true;
    } catch (fmpError) {
        console.warn("[Provider] FMP TTM enrichment failed (using Yahoo data only):", fmpError);
    }

    // ── FMP annual statements for deltas (isolated — may not be available on all plans)
    try {
        const [fmpIncome, fmpBalance] = await Promise.all([
            fetchIncomeStatements(ticker, 2),
            fetchBalanceSheets(ticker, 2),
        ]);
        apiCalls += 2;

        if (fmpIncome && fmpIncome.length >= 2) {
            const [latest, prior] = fmpIncome;
            if (!company.metrics.operatingProfit) {
                company.metrics.operatingProfit = (latest.operatingIncome || 0) / 1_000_000;
            }

            // EBIT Margin delta
            if (latest.revenue > 0 && prior.revenue > 0) {
                const latestEbitM = latest.operatingIncome / latest.revenue;
                const priorEbitM = prior.operatingIncome / prior.revenue;
                company.metrics.ebitMarginDelta = latestEbitM - priorEbitM;

                const latestGrossM = latest.grossProfit / latest.revenue;
                const priorGrossM = prior.grossProfit / prior.revenue;
                company.metrics.grossMarginDelta = latestGrossM - priorGrossM;
            }

            // EBITDA growth
            if (prior.ebitda && Math.abs(prior.ebitda) > 0) {
                company.metrics.ebitdaGrowth = (latest.ebitda - prior.ebitda) / Math.abs(prior.ebitda);
            }

            if (fmpBalance && fmpBalance.length >= 2) {
                const [latestBs, priorBs] = fmpBalance;
                if (!company.metrics.totalEquity) {
                    company.metrics.totalEquity = (latestBs.totalStockholdersEquity || 0) / 1_000_000;
                }

                // Asset growth
                if (priorBs.totalAssets > 0) {
                    company.metrics.assetGrowth = (latestBs.totalAssets - priorBs.totalAssets) / Math.abs(priorBs.totalAssets);
                }

                // ROE delta
                const latestROE = latestBs.totalStockholdersEquity > 0
                    ? (fmpIncome[0]?.netIncome || 0) / latestBs.totalStockholdersEquity
                    : 0;
                const priorROE = priorBs.totalStockholdersEquity > 0
                    ? (fmpIncome[1]?.netIncome || 0) / priorBs.totalStockholdersEquity
                    : 0;
                company.metrics.roeDelta = latestROE - priorROE;
                company.metrics.rocDelta = company.metrics.roeDelta * 0.8;
            } else if (fmpBalance && fmpBalance.length >= 1) {
                if (!company.metrics.totalEquity) {
                    company.metrics.totalEquity = (fmpBalance[0].totalStockholdersEquity || 0) / 1_000_000;
                }
            }

            enrichedByFmp = true;
        }
    } catch (stmtError) {
        console.warn("[Provider] FMP statements enrichment failed (deltas unavailable):", stmtError);
    }

    // --- Backfill Historical Data for Charts ---
    // Since we only fetch weekly prices historically, we interpolate 
    // the financial metrics linearly over the 52 weeks using the current value and the YoY delta.
    const weeks = company.historicalData.length;
    if (weeks > 0) {
        company.historicalData.forEach((point, i) => {
            // Trend goes from 0 (oldest) to 1 (most recent)
            const trend = i / (weeks - 1);

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

    // Save enriched data to Neon
    const values = companyToDbValues(company);
    await db
        .insert(companies)
        .values({
            ...values,
            enrichedByFmp,
            lastEnrichedAt: enrichedByFmp ? new Date() : undefined,
        })
        .onConflictDoUpdate({
            target: companies.ticker,
            set: {
                ...values,
                enrichedByFmp,
                lastEnrichedAt: enrichedByFmp ? new Date() : undefined,
            },
        });

    // Log enrichment
    await db.insert(scanLog).values({
        scanType: "fmp_enrich",
        companiesCount: 1,
        status: enrichedByFmp ? "completed" : "yahoo_only",
    });

    return { company, enriched: enrichedByFmp, apiCalls };
}
