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

// ── Transient failures vs "this coin doesn't exist" ──────────
// Every error used to collapse into `return null`, which the API route then
// reported as `Crypto asset "x" not found on CoinGecko`. Measured against the
// live free tier, 8 of 12 valid coins "did not exist" — they had simply been
// rate-limited after the first four requests. Telling a user a real asset
// doesn't exist because we were throttled is the worst kind of wrong answer,
// so the two cases are now distinguished and the transient one is retried.
// (Same fix already applied to the Yahoo client.)

/** CoinGecko was unreachable or throttled — NOT a statement about the asset. */
export class CoinGeckoUnavailableError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = "CoinGeckoUnavailableError";
    }
}

/** 429 is the free tier's rate limit; the 5xx family and timeouts are retryable. */
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_NETWORK_RE =
    /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|UND_ERR|network|aborted/i;

export function isTransientCoinGeckoError(e: unknown): boolean {
    if (e instanceof CoinGeckoUnavailableError) return true;
    if (e instanceof Error) return TRANSIENT_NETWORK_RE.test(`${e.message} ${e.cause ?? ""}`);
    return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with backoff on throttling and network blips. A non-transient HTTP
 * error (a real 404) is returned as-is for the caller to interpret.
 * Throws CoinGeckoUnavailableError once the retries are exhausted.
 */
async function cgFetch(url: string, init?: RequestInit, tries = 3): Promise<Response> {
    let last: unknown;
    for (let i = 0; i < tries; i++) {
        try {
            const res = await fetch(url, init);
            if (res.ok) return res;
            if (!TRANSIENT_STATUS.has(res.status)) return res; // genuine client error
            last = new CoinGeckoUnavailableError(`CoinGecko HTTP ${res.status}`, res.status);
            // The free tier throttles hard; give it real room before retrying.
            if (i < tries - 1) await sleep((res.status === 429 ? 1500 : 500) * (i + 1));
        } catch (e) {
            last = e;
            if (!isTransientCoinGeckoError(e)) throw e;
            if (i < tries - 1) await sleep(500 * (i + 1));
        }
    }
    throw last instanceof CoinGeckoUnavailableError
        ? last
        : new CoinGeckoUnavailableError(`CoinGecko unreachable: ${last instanceof Error ? last.message : String(last)}`);
}

/** Daily price history for a coin (for beta vs BTC). Free tier caps at ~365d.
 *  Returns oldest → newest {date (ISO), price}. Empty array on error. */
export async function fetchCoinMarketChart(
    coingeckoId: string,
    days: number = 365,
): Promise<Array<{ date: string; price: number }>> {
    try {
        const url = new URL(`${COINGECKO_BASE_URL}/coins/${encodeURIComponent(coingeckoId.toLowerCase())}/market_chart`);
        url.searchParams.append("vs_currency", "usd");
        url.searchParams.append("days", String(days));
        url.searchParams.append("interval", "daily");
        const res = await fetch(url.toString(), { next: { revalidate: 21_600 } }); // 6h
        if (!res.ok) throw new Error(`CoinGecko market_chart ${res.status}`);
        const d = await res.json() as { prices?: Array<[number, number]> };
        return (d.prices ?? [])
            .filter(([ts, price]) => isFinite(ts) && isFinite(price))
            .map(([ts, price]) => ({ date: new Date(ts).toISOString().slice(0, 10), price }));
    } catch (error) {
        console.error(`[CoinGecko market_chart] ${coingeckoId}:`, error);
        return [];
    }
}

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

        const res = await cgFetch(url.toString(), { next: { revalidate: 600 } });
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

        const res = await cgFetch(url.toString(), { next: { revalidate: 300 } });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`CoinGecko API Error ${res.status}: ${err}`);
        }

        // An empty array here is the ONLY honest "this coin doesn't exist".
        const data: CoinGeckoMarketData[] = await res.json();
        return data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error(`[CoinGecko] Error fetching detail for ${coingeckoId}:`, error);
        // Throttling and network failures must not masquerade as "not found".
        if (isTransientCoinGeckoError(error)) throw error;
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
