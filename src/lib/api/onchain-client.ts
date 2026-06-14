// ============================================================
// On-chain client — Blockscout public APIs (FREE, no key)
// ============================================================
// Holder & whale signals for EVM tokens, from the open-source Blockscout
// explorers' public instances:
//   • holder count
//   • top-10 concentration (% of supply) — high = centralization risk
//
// Whale ACCUMULATION over time needs historical holder snapshots, which no
// free source offers — that field stays null (NEUTRAL / N/D).
//
// Only works for tokens with a contract on a supported EVM chain. Native L1
// coins (BTC, SOL, HBAR…) and unsupported chains return null → scored NEUTRAL.

// CoinGecko platform id → Blockscout instance base URL
const CHAIN_MAP: Record<string, { base: string; label: string }> = {
    "ethereum": { base: "https://eth.blockscout.com", label: "Ethereum" },
    "base": { base: "https://base.blockscout.com", label: "Base" },
    "optimistic-ethereum": { base: "https://optimism.blockscout.com", label: "Optimism" },
    "arbitrum-one": { base: "https://arbitrum.blockscout.com", label: "Arbitrum" },
    "polygon-pos": { base: "https://polygon.blockscout.com", label: "Polygon" },
    "gnosis": { base: "https://gnosis.blockscout.com", label: "Gnosis" },
};

export interface OnChainStats {
    chain: string;
    holderCount: number | null;
    top10ConcentrationPct: number | null;     // 0-100
    whaleAccumulationPct: number | null;       // filled in later from local history
    whaleWindowDays: number | null;
    /** Aggregate balance of the top holders (raw units). Tracked over time
     *  locally to derive whale accumulation — see onchain-history. */
    whaleAggregateRaw: number | null;
}

// Blockscout names this `holders_count` in newer instances, `holders` in older.
interface TokenInfo { holders?: string; holders_count?: string; total_supply?: string }
interface HolderItem { value?: string }
interface HoldersResponse { items?: HolderItem[] }

function resolveChain(platforms: Record<string, string>): { base: string; label: string; address: string } | null {
    for (const [platform, address] of Object.entries(platforms)) {
        const chain = CHAIN_MAP[platform];
        if (chain && address && address.startsWith("0x")) return { ...chain, address };
    }
    return null;
}

async function bsGet<T>(url: string): Promise<T | null> {
    try {
        const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 3_600 } });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

/** Fetch on-chain holder/concentration stats. No key required. */
export async function fetchOnChainStats(platforms: Record<string, string>): Promise<OnChainStats | null> {
    const resolved = resolveChain(platforms);
    if (!resolved) return null;
    const { base, label, address } = resolved;

    const [info, holders] = await Promise.all([
        bsGet<TokenInfo>(`${base}/api/v2/tokens/${address}`),
        bsGet<HoldersResponse>(`${base}/api/v2/tokens/${address}/holders`),
    ]);

    if (!info && !holders) return null;

    const rawHolders = info?.holders ?? info?.holders_count;
    const holderCount = rawHolders && isFinite(Number(rawHolders)) ? Number(rawHolders) : null;

    // Top-10 concentration: sum of the 10 largest balances / total supply.
    // Whale aggregate: sum of the whole top-holders page (~50), tracked over time.
    let top10ConcentrationPct: number | null = null;
    let whaleAggregateRaw: number | null = null;
    const items = holders?.items ?? [];
    const supply = Number(info?.total_supply ?? 0);
    if (items.length > 0) {
        const aggregate = items.reduce((acc, it) => acc + Number(it.value || 0), 0);
        if (isFinite(aggregate) && aggregate > 0) whaleAggregateRaw = aggregate;
        if (supply > 0 && isFinite(supply)) {
            const top = items.slice(0, 10).reduce((acc, it) => acc + Number(it.value || 0), 0);
            const pct = (top / supply) * 100;
            if (isFinite(pct)) top10ConcentrationPct = Math.min(100, pct);
        }
    }

    return {
        chain: label,
        holderCount,
        top10ConcentrationPct,
        whaleAccumulationPct: null,
        whaleWindowDays: null,
        whaleAggregateRaw,
    };
}
