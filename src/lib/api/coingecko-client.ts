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

// ── Rich single-coin detail (/coins/{id}) ────────────────────
// Free, no key. Gives the data /coins/markets omits: developer activity,
// community size, on-chain contract addresses, TVL, multi-timeframe price
// changes and the project's own technology description.

export interface CoinGeckoDetail {
    id: string;
    symbol: string;
    name: string;
    /** Project's own description (tech explanation) — used to ground the AI layer */
    description: string;
    categories: string[];
    genesisDate: string | null;
    hashingAlgorithm: string | null;
    homepage: string | null;
    whitepaper: string | null;
    githubRepos: string[];
    /** chain → contract address (e.g. { ethereum: "0x…" }) for on-chain lookups */
    platforms: Record<string, string>;

    // Developer activity (the "number of devs" signal)
    devCommits4w: number | null;
    devContributors: number | null;
    devStars: number | null;
    devForks: number | null;
    devPullsMerged: number | null;

    // Community
    twitterFollowers: number | null;
    redditSubscribers: number | null;
    telegramUsers: number | null;

    // Tokenomics / value
    fdv: number | null;
    marketCap: number | null;
    totalValueLocked: number | null;
    mcapToTvl: number | null;
    circulatingSupply: number | null;
    totalSupply: number | null;
    maxSupply: number | null;

    // Multi-timeframe momentum (%)
    change30d: number | null;
    change1y: number | null;
}

function num(v: unknown): number | null {
    return typeof v === "number" && isFinite(v) ? v : null;
}

/** Fetch the rich detail document for a single coin. Null on error. */
export async function fetchCoinDetail(coingeckoId: string): Promise<CoinGeckoDetail | null> {
    try {
        const url = new URL(`${COINGECKO_BASE_URL}/coins/${encodeURIComponent(coingeckoId.toLowerCase())}`);
        url.searchParams.append("localization", "false");
        url.searchParams.append("tickers", "false");
        url.searchParams.append("market_data", "true");
        url.searchParams.append("community_data", "true");
        url.searchParams.append("developer_data", "true");
        url.searchParams.append("sparkline", "false");

        const res = await fetch(url.toString(), { next: { revalidate: 600 } });
        if (!res.ok) throw new Error(`CoinGecko detail ${res.status}`);

        // CoinGecko's detail document is deeply nested and loosely typed.
        const d = await res.json() as Record<string, unknown>;
        const dev = (d.developer_data ?? {}) as Record<string, unknown>;
        const com = (d.community_data ?? {}) as Record<string, unknown>;
        const md = (d.market_data ?? {}) as Record<string, unknown>;
        const links = (d.links ?? {}) as Record<string, unknown>;
        const desc = (d.description ?? {}) as Record<string, unknown>;

        const pickUsd = (key: string): number | null => {
            const obj = md[key] as Record<string, unknown> | undefined;
            return obj ? num(obj.usd) : null;
        };

        const homepageArr = (links.homepage as string[] | undefined) ?? [];
        const whitepaper = (links.whitepaper as string | undefined) || null;
        const reposObj = (links.repos_url as Record<string, unknown> | undefined) ?? {};
        const githubRepos = ((reposObj.github as string[] | undefined) ?? []).filter(Boolean);

        return {
            id: String(d.id ?? coingeckoId),
            symbol: String(d.symbol ?? "").toUpperCase(),
            name: String(d.name ?? ""),
            description: String((desc.en as string | undefined) ?? "").replace(/<[^>]+>/g, "").trim(),
            categories: ((d.categories as (string | null)[] | undefined) ?? []).filter((c): c is string => !!c),
            genesisDate: (d.genesis_date as string | undefined) ?? null,
            hashingAlgorithm: (d.hashing_algorithm as string | undefined) ?? null,
            homepage: homepageArr.find((h) => !!h) ?? null,
            whitepaper,
            githubRepos,
            platforms: Object.fromEntries(
                Object.entries((d.platforms as Record<string, string> | undefined) ?? {})
                    .filter(([chain, addr]) => chain && addr)
            ),

            devCommits4w: num(dev.commit_count_4_weeks),
            devContributors: num(dev.pull_request_contributors),
            devStars: num(dev.stars),
            devForks: num(dev.forks),
            devPullsMerged: num(dev.pull_requests_merged),

            twitterFollowers: num(com.twitter_followers),
            redditSubscribers: num(com.reddit_subscribers),
            telegramUsers: num(com.telegram_channel_user_count),

            fdv: pickUsd("fully_diluted_valuation"),
            marketCap: pickUsd("market_cap"),
            totalValueLocked: pickUsd("total_value_locked"),
            mcapToTvl: num(md.mcap_to_tvl_ratio),
            circulatingSupply: num(md.circulating_supply),
            totalSupply: num(md.total_supply),
            maxSupply: num(md.max_supply),

            change30d: num(md.price_change_percentage_30d),
            change1y: num(md.price_change_percentage_1y),
        };
    } catch (error) {
        console.error(`[CoinGecko] detail error for ${coingeckoId}:`, error);
        return null;
    }
}

/**
 * Fetches detail for a single coin by CoinGecko ID (e.g. "hedera-hashgraph").
 * Returns the same shape as fetchCryptoMarkets entries, or null if not found.
 */
export async function fetchCryptoDetail(coingeckoId: string): Promise<CoinGeckoMarketData | null> {
    try {
        const url = new URL(`${COINGECKO_BASE_URL}/coins/markets`);
        url.searchParams.append("vs_currency", "usd");
        url.searchParams.append("ids", coingeckoId);
        url.searchParams.append("sparkline", "false");
        url.searchParams.append("price_change_percentage", "24h,7d");

        const res = await fetch(url.toString(), {
            next: { revalidate: 300 }
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`CoinGecko API Error ${res.status}: ${err}`);
        }

        const data: CoinGeckoMarketData[] = await res.json();
        return data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error(`[CoinGecko] Error fetching detail for ${coingeckoId}:`, error);
        return null;
    }
}

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
