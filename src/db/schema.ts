// ============================================================
// Database schema — Neon PostgreSQL via Drizzle ORM
// ============================================================

import {
    pgTable,
    text,
    real,
    timestamp,
    integer,
    jsonb,
    boolean,
} from "drizzle-orm/pg-core";

/** Cached company data (refreshed daily by Yahoo Finance scanner) */
export const companies = pgTable("companies", {
    // ── Identity ───────────────────────────────────────────────
    ticker: text("ticker").primaryKey(),
    name: text("name").notNull(),
    sector: text("sector").default(""),
    exchange: text("exchange").default(""),
    description: text("description").default(""),

    // ── Core Metrics ───────────────────────────────────────────
    marketCap: real("market_cap").default(0),           // in millions
    totalEquity: real("total_equity").default(0),       // in millions
    operatingProfit: real("operating_profit").default(0), // in millions
    fcfYield: real("fcf_yield").default(0),
    bookToMarket: real("book_to_market").default(0),

    // ── Margins ────────────────────────────────────────────────
    ebitMargin: real("ebit_margin").default(0),
    grossMargin: real("gross_margin").default(0),
    roe: real("roe").default(0),
    roc: real("roc").default(0),

    // ── Deltas (year-over-year) ────────────────────────────────
    ebitMarginDelta: real("ebit_margin_delta").default(0),
    grossMarginDelta: real("gross_margin_delta").default(0),
    roeDelta: real("roe_delta").default(0),
    rocDelta: real("roc_delta").default(0),

    // ── Efficiency ─────────────────────────────────────────────
    assetGrowth: real("asset_growth").default(0),
    ebitdaGrowth: real("ebitda_growth").default(0),

    // ── Price / Timing ─────────────────────────────────────────
    currentPrice: real("current_price").default(0),
    fiftyTwoWeekLow: real("fifty_two_week_low").default(0),
    fiftyTwoWeekHigh: real("fifty_two_week_high").default(0),
    oneMonthReturn: real("one_month_return").default(0),
    threeMonthReturn: real("three_month_return").default(0),
    sixMonthReturn: real("six_month_return").default(0),

    // ── Historical chart data (JSON array) ─────────────────────
    historicalData: jsonb("historical_data").default([]),

    // ── Data availability flags ({ deltas, roc, growth, … }) ───
    dataQuality: jsonb("data_quality"),

    // ── Solvency / dilution / accruals extras (jsonb bundle) ───
    extendedMetrics: jsonb("extended_metrics"),

    // ── Meta ───────────────────────────────────────────────────
    enrichedByFmp: boolean("enriched_by_fmp").default(false),
    lastScannedAt: timestamp("last_scanned_at").defaultNow(),
    lastEnrichedAt: timestamp("last_enriched_at"),
});

/** Tracks when the last bulk scan was performed */
export const scanLog = pgTable("scan_log", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    scanType: text("scan_type").notNull(),  // 'yahoo_bulk' | 'fmp_enrich'
    companiesCount: integer("companies_count").default(0),
    status: text("status").default("completed"),
    createdAt: timestamp("created_at").defaultNow(),
});

/** Cached crypto assets from CoinGecko */
export const cryptoAssets = pgTable("crypto_assets", {
    // ── Identity ───────────────────────────────────────────────
    symbol: text("symbol").primaryKey(), // e.g. "BTC"
    name: text("name").notNull(),        // e.g. "Bitcoin"
    coingeckoId: text("coingecko_id").notNull().unique(), // e.g. "bitcoin"

    // ── Core Metrics ───────────────────────────────────────────
    marketCap: real("market_cap").default(0),
    totalVolume24h: real("total_volume_24h").default(0),
    currentPrice: real("current_price").default(0),

    // ── Tokenomics ─────────────────────────────────────────────
    circulatingSupply: real("circulating_supply").default(0),
    maxSupply: real("max_supply"), // Can be null (e.g. ETH)
    totalSupply: real("total_supply"),

    // ── Momentum & Timing ──────────────────────────────────────
    priceChangePercentage24h: real("price_change_percentage_24h").default(0),
    priceChangePercentage7d: real("price_change_percentage_7d").default(0),
    ath: real("ath").default(0),
    athChangePercentage: real("ath_change_percentage").default(0),
    atl: real("atl").default(0),
    atlChangePercentage: real("atl_change_percentage").default(0),

    // ── Scores (JSON of the AlgorithmScore type for crypto) ────
    scoreData: jsonb("score_data"),

    // ── Meta ───────────────────────────────────────────────────
    lastScannedAt: timestamp("last_scanned_at").defaultNow(),
});
