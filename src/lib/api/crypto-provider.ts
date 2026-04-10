// ============================================================
// Crypto Provider - Orchestrator for API & Neon DB Caching
// ============================================================

import { db } from "@/db";
import { cryptoAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchCryptoMarkets, type CoinGeckoMarketData } from "./coingecko-client";
import { calculateCryptoScore } from "./crypto-algorithm";
import type { Company } from "../types";

const MAX_CACHE_AGE_MS = 1000 * 60 * 15; // 15 minutes cache for crypto (moves faster)

/**
 * Checks if a cached timestamp is fresh enough.
 */
function isCacheFresh(lastScannedAt: Date | null | undefined): boolean {
    if (!lastScannedAt) return false;
    const now = new Date();
    return now.getTime() - lastScannedAt.getTime() < MAX_CACHE_AGE_MS;
}

/**
 * Converts CoinGecko data into the common `Company` type we use in the UI to reuse Explorer components,
 * while mapping Tokenomics to the Valuation/Margins slots.
 */
export function mapCryptoToCompany(asset: CoinGeckoMarketData): Company {
    return {
        id: `cg_${asset.id}`,
        ticker: asset.symbol.toUpperCase(),
        name: asset.name,
        exchange: "Crypto", // Used to show asset class
        sector: "Digital Asset",
        description: "",
        metrics: {
            marketCap: asset.market_cap / 1_000_000, // Millions
            totalEquity: 0, // Unused
            operatingProfit: 0, // Unused
            fcfYield: asset.total_volume / asset.market_cap, // Mapped to Liquidity Ratio for display
            bookToMarket: asset.circulating_supply / (asset.max_supply || asset.circulating_supply), // Mapped to Dilution

            // Reusing margins for momentum stats so charts don't break
            ebitMargin: asset.price_change_percentage_24h / 100 || 0,
            grossMargin: asset.price_change_percentage_7d_in_currency ? asset.price_change_percentage_7d_in_currency / 100 : 0,
            ebitMarginDelta: 0,
            grossMarginDelta: 0,
            roe: 0,
            roc: 0,
            roeDelta: 0,
            rocDelta: 0,

            assetGrowth: 0,
            ebitdaGrowth: 0,

            currentPrice: asset.current_price,
            fiftyTwoWeekLow: asset.atl,
            fiftyTwoWeekHigh: asset.ath,
            oneMonthReturn: asset.price_change_percentage_24h / 100, // Using 24h as short proxy
            sixMonthReturn: 0,
            threeMonthReturn: 0,
        },
        historicalData: [], // Would need individual chart fetches or CoinGecko pro
    };
}

/**
 * Primary orchestrator: Fetches crypto limits, scores them, and caches them in DB.
 */
export async function getCryptoScreenerData(category?: string): Promise<Company[]> {
    // 1. Fetch fresh list from CoinGecko limit 250
    const rawData = await fetchCryptoMarkets(category);

    if (rawData.length === 0) {
        console.warn("[Crypto Provider] No data returned from CoinGecko.");
        return [];
    }

    // 2. Map and score
    const companies: Company[] = rawData.map(mapCryptoToCompany);

    // 3. Cache into DB asynchronously (fire-and-forget for performance)
    try {
        const values = rawData.map((asset) => ({
            symbol: asset.symbol.toUpperCase(),
            name: asset.name,
            coingeckoId: asset.id,
            marketCap: asset.market_cap,
            totalVolume24h: asset.total_volume,
            currentPrice: asset.current_price,
            circulatingSupply: asset.circulating_supply,
            maxSupply: asset.max_supply,
            totalSupply: asset.total_supply,
            priceChangePercentage24h: asset.price_change_percentage_24h,
            priceChangePercentage7d: asset.price_change_percentage_7d_in_currency || 0,
            ath: asset.ath,
            athChangePercentage: asset.ath_change_percentage,
            atl: asset.atl,
            atlChangePercentage: asset.atl_change_percentage,
            scoreData: calculateCryptoScore(asset),
            lastScannedAt: new Date()
        }));

        // Batch insert/upsert to Drizzle
        for (const data of values) {
            await db.insert(cryptoAssets).values(data).onConflictDoUpdate({
                target: cryptoAssets.symbol,
                set: data
            });
        }
        console.log(`[Crypto Provider] Cached ${values.length} assets to DB.`);
    } catch (e) {
        console.error("[Crypto Provider] DB Cache Error:", e);
    }

    return companies;
}
