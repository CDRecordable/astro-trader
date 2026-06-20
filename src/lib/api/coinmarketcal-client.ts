// ============================================================
// CoinMarketCal client — crypto catalyst calendar (API key)
// ============================================================
// Upcoming events the market reacts to: mainnet launches, exchange
// listings, network upgrades, token unlocks, partnerships. The crypto
// analog of an earnings calendar.
//
// CoinMarketCal uses its own coin ids, so we map symbol → coin id via
// the cached /coins document, then query /events for that coin.

const CMC_BASE = "https://developers.coinmarketcal.com/v1";

export interface CryptoCatalyst {
    title: string;
    date: string;          // ISO date of the event
    daysUntil: number | null;
    confidence: number | null; // community vote % (0-100)
    category: string | null;
}

interface CmcCoin { id: string; symbol: string; name: string }
interface CmcEvent {
    title?: string | { en?: string };
    date_event?: string;
    percentage?: number;
    categories?: Array<{ name?: string }>;
}

function headers(apiKey: string): HeadersInit {
    return {
        "x-api-key": apiKey,
        "Accept": "application/json",
        "Accept-Encoding": "deflate, gzip",
    };
}

async function resolveCoinId(apiKey: string, symbol: string): Promise<string | null> {
    try {
        const res = await fetch(`${CMC_BASE}/coins`, { headers: headers(apiKey), next: { revalidate: 86_400 } });
        if (!res.ok) return null;
        const body = await res.json() as { body?: CmcCoin[] } | CmcCoin[];
        const list = Array.isArray(body) ? body : (body.body ?? []);
        const wanted = symbol.toLowerCase();
        const match = list.find((c) => c.symbol?.toLowerCase() === wanted);
        return match?.id ?? null;
    } catch {
        return null;
    }
}

/**
 * Upcoming catalysts for a coin (by symbol). `nowMs` passed in for
 * deterministic day-countdown. Returns [] when no key / no events.
 */
export async function fetchCatalysts(
    apiKey: string,
    symbol: string,
    nowMs: number,
): Promise<CryptoCatalyst[]> {
    if (!apiKey || !symbol) return [];
    const coinId = await resolveCoinId(apiKey, symbol);
    if (!coinId) return [];

    try {
        const url = new URL(`${CMC_BASE}/events`);
        url.searchParams.append("coins", coinId);
        url.searchParams.append("max", "6");
        url.searchParams.append("showOnly", "hot_events");
        const res = await fetch(url.toString(), { headers: headers(apiKey), next: { revalidate: 7_200 } });
        if (!res.ok) return [];

        const body = await res.json() as { body?: CmcEvent[] } | CmcEvent[];
        const events = Array.isArray(body) ? body : (body.body ?? []);

        return events
            .map((e): CryptoCatalyst => {
                const title = typeof e.title === "string" ? e.title : (e.title?.en ?? "Evento");
                const date = e.date_event ?? "";
                const t = Date.parse(date);
                const daysUntil = isFinite(t) ? Math.round((t - nowMs) / 86_400_000) : null;
                return {
                    title,
                    date,
                    daysUntil,
                    confidence: typeof e.percentage === "number" ? e.percentage : null,
                    category: e.categories?.[0]?.name ?? null,
                };
            })
            .filter((c) => c.daysUntil === null || c.daysUntil >= -3) // keep upcoming / very recent
            .slice(0, 5);
    } catch {
        return [];
    }
}
