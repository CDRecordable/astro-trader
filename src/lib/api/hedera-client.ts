// ============================================================
// Hedera Mirror Node client (FREE, no key)
// ============================================================
// Hedera isn't a standard EVM chain, so Blockscout can't read it. But its
// public Mirror Node exposes authoritative network data nobody else has:
//   • on-chain circulating / total supply (in tinybars, 8 decimals)
//   • live throughput (TPS), estimated from recent transactions
//   • transaction-type mix (transfers vs HCS messages vs contracts…)
//
// https://docs.hedera.com/hedera/sdks-and-apis/rest-api

const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const TINYBAR = 1e8; // 1 HBAR = 100,000,000 tinybars

export interface HederaNetworkStats {
    circulatingSupply: number | null;   // HBAR
    totalSupply: number | null;          // HBAR
    tpsEstimate: number | null;          // transactions per second (live estimate)
    tpsSampleSize: number | null;        // how many txns the estimate is based on
    newAccountsPerDay: number | null;    // adoption: account creations/day (estimate)
    txTypeBreakdown: Array<{ name: string; count: number }>;
}

interface SupplyResponse { released_supply?: string; total_supply?: string }
interface TxItem { consensus_timestamp?: string; name?: string }
interface TxResponse { transactions?: TxItem[]; links?: { next?: string | null } }

async function getJson<T>(url: string): Promise<T | null> {
    try {
        const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 300 } });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

/** Authoritative supply straight from the network. */
async function fetchSupply(): Promise<{ circulating: number | null; total: number | null }> {
    const s = await getJson<SupplyResponse>(`${MIRROR_BASE}/api/v1/network/supply`);
    const circ = s?.released_supply ? Number(s.released_supply) / TINYBAR : null;
    const total = s?.total_supply ? Number(s.total_supply) / TINYBAR : null;
    return {
        circulating: circ !== null && isFinite(circ) ? circ : null,
        total: total !== null && isFinite(total) ? total : null,
    };
}

/**
 * Estimate live throughput by sampling recent transactions across a few
 * pages and dividing the count by the time span they cover.
 */
async function fetchThroughput(): Promise<{ tps: number | null; sample: number; types: Array<{ name: string; count: number }> }> {
    const stamps: number[] = [];
    const typeCounts = new Map<string, number>();
    let url: string | null = `${MIRROR_BASE}/api/v1/transactions?limit=100&order=desc`;

    // Up to 3 pages (~300 txns) for a steadier estimate.
    for (let page = 0; page < 3 && url; page++) {
        const data: TxResponse | null = await getJson<TxResponse>(url);
        const txns = data?.transactions ?? [];
        if (txns.length === 0) break;
        for (const t of txns) {
            const ts = parseFloat(t.consensus_timestamp ?? "");
            if (isFinite(ts)) stamps.push(ts);
            if (t.name) typeCounts.set(t.name, (typeCounts.get(t.name) ?? 0) + 1);
        }
        url = data?.links?.next ? `${MIRROR_BASE}${data.links.next}` : null;
    }

    let tps: number | null = null;
    if (stamps.length > 1) {
        const span = Math.max(...stamps) - Math.min(...stamps); // seconds
        if (span > 0) tps = (stamps.length - 1) / span;
    }

    const types = [...typeCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return { tps, sample: stamps.length, types };
}

/**
 * Adoption signal: estimate account-creations per day by sampling recent
 * CRYPTOCREATEACCOUNT transactions and scaling their rate to 24h.
 */
async function fetchNewAccountsPerDay(): Promise<number | null> {
    const data = await getJson<TxResponse>(
        `${MIRROR_BASE}/api/v1/transactions?transactiontype=cryptocreateaccount&limit=100&order=desc`,
    );
    const txns = data?.transactions ?? [];
    const stamps = txns
        .map((t) => parseFloat(t.consensus_timestamp ?? ""))
        .filter((n) => isFinite(n));
    if (stamps.length < 2) return null;
    const span = Math.max(...stamps) - Math.min(...stamps); // seconds
    if (span <= 0) return null;
    const perSecond = (stamps.length - 1) / span;
    return perSecond * 86_400; // per day
}

export async function fetchHederaStats(): Promise<HederaNetworkStats | null> {
    const [supply, throughput, newAccountsPerDay] = await Promise.all([
        fetchSupply(),
        fetchThroughput(),
        fetchNewAccountsPerDay(),
    ]);
    if (supply.circulating === null && throughput.tps === null) return null;
    return {
        circulatingSupply: supply.circulating,
        totalSupply: supply.total,
        tpsEstimate: throughput.tps,
        tpsSampleSize: throughput.sample || null,
        newAccountsPerDay,
        txTypeBreakdown: throughput.types,
    };
}
