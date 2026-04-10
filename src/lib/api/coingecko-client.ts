// ============================================================
// CoinGecko API Client - Bulk Data Fetcher
// ============================================================

export interface CoinGeckoMarketData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    fully_diluted_valuation: number | null;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    ath: number;
    ath_change_percentage: number;
    ath_date: string;
    atl: number;
    atl_change_percentage: number;
    atl_date: string;
    price_change_percentage_7d_in_currency?: number;
}

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

/**
 * Fetches the top 250 coins by market cap from CoinGecko.
 * This is the maximum allowed per page without an API key.
 * @param category Optional category ID (e.g. 'decentralized-finance-defi', 'layer-1')
 */
export async function fetchCryptoMarkets(category?: string): Promise<CoinGeckoMarketData[]> {
    try {
        const url = new URL(`${COINGECKO_BASE_URL}/coins/markets`);
        url.searchParams.append("vs_currency", "usd");
        url.searchParams.append("order", "market_cap_desc");
        url.searchParams.append("per_page", "250");
        url.searchParams.append("page", "1");
        url.searchParams.append("sparkline", "false");
        url.searchParams.append("price_change_percentage", "24h,7d");

        if (category) {
            url.searchParams.append("category", category);
        }

        const res = await fetch(url.toString(), {
            // CoinGecko caches data for 1-5 mins on free endpoints anyway,
            // but we use Next.js fetch cache to not abuse the limit.
            next: { revalidate: 300 } // 5 minutes cache
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`CoinGecko API Error ${res.status}: ${err}`);
        }

        const data: CoinGeckoMarketData[] = await res.json();
        return data;
    } catch (error) {
        console.error("[CoinGecko] Error fetching markets:", error);
        return [];
    }
}
