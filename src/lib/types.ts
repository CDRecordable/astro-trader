// ============================================================
// Astro Trader Insights - Core Type Definitions
// ============================================================

/** Market cap tier for adaptive algorithm scoring */
export type MarketCapTier = "small" | "mid" | "large";

/** Raw financial metrics for a company snapshot */
export interface FinancialMetrics {
    // --- Identity ---
    marketCap: number;          // in millions USD
    totalEquity: number;        // in millions USD (must be > 0)
    operatingProfit: number;    // in millions USD (must be > 0)

    // --- Valuation ---
    fcfYield: number;           // FCF / Price, target >= 0.05
    bookToMarket: number;       // Book Value / Market Cap, target > 0.40

    // --- Margins & Quality ---
    ebitMargin: number;         // EBIT / Revenue (decimal, e.g. 0.039)
    grossMargin: number;        // Gross Profit / Revenue (decimal)
    roe: number;                // Return on Equity (decimal)
    roc: number;                // Return on Capital (decimal)

    // --- Margin Trends (year-over-year deltas) ---
    ebitMarginDelta: number;    // Change in EBIT margin vs prior year
    grossMarginDelta: number;   // Change in Gross margin vs prior year
    roeDelta: number;           // Change in ROE vs prior year
    rocDelta: number;           // Change in ROC vs prior year

    // --- Efficiency ---
    assetGrowth: number;        // YoY asset growth (decimal)
    ebitdaGrowth: number;       // YoY EBITDA growth (decimal)

    // --- Price / Timing ---
    currentPrice: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekHigh: number;
    oneMonthReturn: number;     // decimal — price vs 50-day moving average (trend position proxy)
    threeMonthReturn: number;   // decimal — midpoint of the two proxies
    sixMonthReturn: number;     // decimal — price vs 200-day moving average (trend position proxy)

    // --- Solvency & balance quality (optional: absent on legacy/mock data) ---
    /** Net debt / EBITDA. Negative = net cash. The anti-leverage-mirage metric. */
    netDebtToEbitda?: number;
    /** EBIT / interest expense. <2 is fragile, <1 means interest isn't covered. */
    interestCoverage?: number;
    /** FCF / enterprise value (mcap + net debt) — leverage-proof valuation yield. */
    evFcfYield?: number;
    /** Tangible book / market cap. Negative = equity is all goodwill/intangibles. */
    tangibleBookToMarket?: number;
    /** Annualized share-count growth over available years. Positive = dilution. */
    sharesDilution?: number;
    /** (Net income − operating cash flow) / total assets. High = aggressive accounting. */
    accrualRatio?: number;
    /** Insider ownership fraction (0-1), informational. */
    insiderOwnership?: number;
    /** Short interest as % of float (0-1), US tickers mostly. Informational. */
    shortPctFloat?: number;

    // --- Catalysts & sentiment (optional) ---
    /** Next earnings report date (ISO). The #1 automatable catalyst. */
    nextEarningsDate?: string;
    /** Ex-dividend date (ISO). */
    exDividendDate?: string;
    /** Insider open-market BUY transactions, last 6 months (US Form 4 data). */
    insiderBuyCount6m?: number;
    /** Insider SELL transactions, last 6 months. (Sells are noise; buys are signal.) */
    insiderSellCount6m?: number;
    /** Net insider share change as % of insider holdings, 6 months. */
    insiderNetPct6m?: number;
    /** Analyst EPS estimate revisions UP, last 30 days (current fiscal year). */
    epsRevisionsUp30d?: number;
    /** Analyst EPS estimate revisions DOWN, last 30 days. */
    epsRevisionsDown30d?: number;
    /** % change of consensus current-year EPS estimate vs 30 days ago. */
    epsTrend30d?: number;

    /**
     * Which metric groups were actually retrievable from the data source.
     * Missing groups must be treated as NEUTRAL by the scoring algorithm
     * (renormalized out), never as a failed check.
     */
    dataQuality?: {
        deltas: boolean;    // YoY margin/ROE/ROC deltas (needs 2 annual statements)
        roc: boolean;       // real return on capital (EBIT / invested capital)
        growth: boolean;    // asset growth + EBITDA growth (reinvestment efficiency)
        solvency?: boolean; // net debt / EBITDA + interest coverage + EV yield
        dilution?: boolean; // share count history
        accruals?: boolean; // net income vs operating cash flow
        insiders?: boolean; // insider transaction data (US Form 4; absent for most EU)
        revisions?: boolean; // analyst EPS estimate revisions
    };
}

/** Historical data point for charting */
export interface HistoricalDataPoint {
    date: string;               // ISO date string
    price: number;
    ebitMargin: number;
    grossMargin: number;
    roe: number;
    roc: number;
    fcfYield: number;
}

/** Company with all data needed for the algorithm */
export interface Company {
    id: string;
    ticker: string;
    name: string;
    sector: string;             // stored but NOT used in scoring
    exchange: string;
    description: string;
    metrics: FinancialMetrics;
    historicalData: HistoricalDataPoint[];
}

/** Result of the algorithm's evaluation */
export interface AlgorithmScore {
    companyId: string;
    ticker: string;
    name: string;
    tier: MarketCapTier;

    // --- Pass / Fail ---
    passesHardFilters: boolean;
    hardFilterReasons: string[];  // reasons for failure

    // --- Component Scores (0-100) ---
    valuationScore: number;
    trendScore: number;
    timingScore: number;
    cosmicFluidityScore: number; // cosmic weather (0-100)
    macroAdjustment: number;     // multiplier (0.9 - 1.0)

    // --- Final ---
    totalScore: number;          // weighted composite (0-100)
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID';
}

/** Macro context for algorithm adjustments */
export interface MacroContext {
    interestRateTrend: 'rising' | 'stable' | 'falling';
    currentRate: number;         // e.g. 5.25
}

/** Filter state for the Explorer Mode sliders */
export interface ExplorerFilters {
    maxMarketCap: number;        // slider value in millions
    minFcfYield: number;         // slider value (decimal)
    minBookToMarket: number;     // slider value (decimal)
    showOnlyPassing: boolean;    // hide companies that fail hard filters
}
