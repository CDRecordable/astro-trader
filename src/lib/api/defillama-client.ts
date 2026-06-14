// ============================================================
// DeFiLlama client — protocol fundamentals (FREE, no API key)
// ============================================================
// The closest thing crypto has to fundamentals:
//  • TVL (total value locked) and its trend  → real usage
//  • Fees & revenue                          → "crypto P/S" valuation
//
// (Token unlock cliffs come from CoinMarketCal, which has a clean events
//  API; DeFiLlama's emission document is too loosely structured to trust.)
//
// Many coins are NOT DeFiLlama protocols (L1 coins, memecoins) — those
// simply return null and the scorer treats the metric as NEUTRAL (N/D).

const LLAMA_BASE = "https://api.llama.fi";

export interface DefiLlamaProtocol {
    slug: string;
    tvl: number | null;
    tvlChange1d: number | null;
    tvlChange7d: number | null;
    category: string | null;
    mcap: number | null;
}

export interface DefiLlamaFees {
    fees30d: number | null;
    fees7d: number | null;
    revenue30d: number | null;
    /** Annualized fees (30d × 12.17) — used for the crypto P/S ratio */
    annualizedFees: number | null;
}

// ── gecko_id → DeFiLlama slug ────────────────────────────────
// The /protocols document is large; cache it hard (12h).
interface RawProtocol {
    slug: string;
    gecko_id: string | null;
    tvl: number | null;
    change_1d: number | null;
    change_7d: number | null;
    category: string | null;
    mcap: number | null;
}

export async function fetchLlamaProtocol(geckoId: string): Promise<DefiLlamaProtocol | null> {
    try {
        const res = await fetch(`${LLAMA_BASE}/protocols`, { next: { revalidate: 43_200 } });
        if (!res.ok) throw new Error(`DeFiLlama protocols ${res.status}`);
        const list = await res.json() as RawProtocol[];
        // Primary: exact gecko_id match (works for ~2,270 protocols). Fallback:
        // slug equals the gecko id (catches coins whose slug == CoinGecko id).
        const match = list.find((p) => p.gecko_id === geckoId)
            ?? list.find((p) => p.slug === geckoId);
        if (!match) return null;
        return {
            slug: match.slug,
            tvl: typeof match.tvl === "number" ? match.tvl : null,
            tvlChange1d: typeof match.change_1d === "number" ? match.change_1d : null,
            tvlChange7d: typeof match.change_7d === "number" ? match.change_7d : null,
            category: match.category ?? null,
            mcap: typeof match.mcap === "number" ? match.mcap : null,
        };
    } catch (error) {
        console.error(`[DeFiLlama] protocol lookup error for ${geckoId}:`, error);
        return null;
    }
}

// ── Fees & revenue ───────────────────────────────────────────
async function fetchFeesSummary(slug: string, dataType: "dailyFees" | "dailyRevenue"): Promise<number | null> {
    try {
        const url = new URL(`${LLAMA_BASE}/summary/fees/${encodeURIComponent(slug)}`);
        url.searchParams.append("excludeTotalDataChart", "true");
        url.searchParams.append("excludeTotalDataChartBreakdown", "true");
        url.searchParams.append("dataType", dataType);
        const res = await fetch(url.toString(), { next: { revalidate: 3_600 } });
        if (!res.ok) return null;
        const d = await res.json() as { total30d?: number; total7d?: number };
        return typeof d.total30d === "number" ? d.total30d : null;
    } catch {
        return null;
    }
}

export async function fetchLlamaFees(slug: string): Promise<DefiLlamaFees> {
    const [fees30d, revenue30d] = await Promise.all([
        fetchFeesSummary(slug, "dailyFees"),
        fetchFeesSummary(slug, "dailyRevenue"),
    ]);
    return {
        fees30d,
        fees7d: null,
        revenue30d,
        annualizedFees: fees30d !== null ? fees30d * (365 / 30) : null,
    };
}
