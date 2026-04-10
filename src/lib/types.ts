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
    oneMonthReturn: number;     // decimal
    threeMonthReturn: number;   // decimal
    sixMonthReturn: number;     // decimal
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
    macroAdjustment: number;     // multiplier (0.8 - 1.0)

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
