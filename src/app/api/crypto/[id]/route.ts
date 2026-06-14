// ============================================================
// API Route — /api/crypto/[id]
// ============================================================
// Aggregates every crypto data source server-side (so the user's data
// keys never reach the browser), assembles CryptoFundamentals, scores it
// with the renormalized engine, and returns company + fundamentals + score.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { fetchCryptoDetail, fetchCoinDetail } from "@/lib/api/coingecko-client";
import { fetchLlamaProtocol, fetchLlamaFees } from "@/lib/api/defillama-client";
import { fetchOnChainStats } from "@/lib/api/onchain-client";
import { fetchCatalysts } from "@/lib/api/coinmarketcal-client";
import { fetchFearGreed } from "@/lib/api/feargreed-client";
import { fetchHederaStats } from "@/lib/api/hedera-client";
import { recordAndCompare } from "@/lib/onchain-history";
import { mapCryptoToCompany } from "@/lib/api/crypto-provider";
import {
    calculateCryptoScoreV2, deriveNextUnlockDays, type CryptoFundamentals,
} from "@/lib/crypto-fundamentals";

const SETTINGS_PATH = path.join(process.cwd(), "user-data", "settings.json");

function readDataKeys(): { coinmarketcal: string } {
    try {
        const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as {
            dataKeys?: { coinmarketcal?: string };
        };
        return { coinmarketcal: (s.dataKeys?.coinmarketcal ?? "").trim() };
    } catch {
        return { coinmarketcal: "" };
    }
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const coingeckoId = id.toLowerCase();
    const now = Date.now();

    try {
        // Market basics first — we need the symbol + platforms before the rest.
        const [market, detail] = await Promise.all([
            fetchCryptoDetail(coingeckoId),
            fetchCoinDetail(coingeckoId),
        ]);

        if (!market) {
            return NextResponse.json(
                { error: `Crypto asset "${id}" not found on CoinGecko` },
                { status: 404 }
            );
        }

        const keys = readDataKeys();
        const symbol = market.symbol.toUpperCase();
        const platforms = detail?.platforms ?? {};

        // Fan out to the enrichment sources in parallel.
        const llamaProtocol = await fetchLlamaProtocol(coingeckoId);
        const [llamaFees, onchain, catalysts, fearGreed, networkStats] = await Promise.all([
            llamaProtocol ? fetchLlamaFees(llamaProtocol.slug) : Promise.resolve(null),
            fetchOnChainStats(platforms),
            keys.coinmarketcal ? fetchCatalysts(keys.coinmarketcal, symbol, now) : Promise.resolve([]),
            fetchFearGreed(),
            // Chain-specific enrichment (Hedera has its own free Mirror Node).
            coingeckoId === "hedera-hashgraph" ? fetchHederaStats() : Promise.resolve(null),
        ]);

        // ── Whale accumulation from our locally-built snapshot history ──
        // Each visit records a snapshot; accumulation is the Δ vs a past one.
        let whaleAccumulationPct: number | null = null;
        let whaleWindowDays: number | null = null;
        let whaleHistoryPoints = 0;
        if (onchain && onchain.whaleAggregateRaw !== null) {
            const hist = recordAndCompare(
                coingeckoId,
                {
                    holderCount: onchain.holderCount,
                    top10Pct: onchain.top10ConcentrationPct,
                    whaleAggregate: onchain.whaleAggregateRaw,
                },
                now,
            );
            whaleAccumulationPct = hist.whaleAccumulationPct;
            whaleWindowDays = hist.whaleWindowDays;
            whaleHistoryPoints = hist.snapshotCount;
        }

        // ── Derived value metrics ──
        const tvl = llamaProtocol?.tvl ?? detail?.totalValueLocked ?? null;
        const annualizedFees = llamaFees?.annualizedFees ?? null;
        const annualizedRevenue = llamaFees?.revenue30d !== null && llamaFees?.revenue30d !== undefined
            ? llamaFees.revenue30d * (365 / 30) : null;
        const psRatio = annualizedFees && annualizedFees > 0
            ? market.market_cap / annualizedFees : null;
        const mcapToTvl = detail?.mcapToTvl ?? (tvl && tvl > 0 ? market.market_cap / tvl : null);

        const fundamentals: CryptoFundamentals = {
            id: coingeckoId,
            symbol,
            name: market.name,

            price: market.current_price,
            marketCap: market.market_cap,
            volume24h: market.total_volume,
            circulatingSupply: market.circulating_supply ?? detail?.circulatingSupply ?? null,
            maxSupply: market.max_supply ?? detail?.maxSupply ?? null,
            fdv: market.fully_diluted_valuation ?? detail?.fdv ?? null,
            athChangePct: market.ath_change_percentage ?? 0,
            atlChangePct: market.atl_change_percentage ?? 0,
            change7d: market.price_change_percentage_7d_in_currency ?? null,
            change30d: detail?.change30d ?? null,
            change1y: detail?.change1y ?? null,

            tvl,
            tvlChange7d: llamaProtocol?.tvlChange7d ?? null,
            annualizedFees,
            annualizedRevenue,
            psRatio,
            mcapToTvl,

            devCommits4w: detail?.devCommits4w ?? null,
            devContributors: detail?.devContributors ?? null,

            holderCount: onchain?.holderCount ?? null,
            top10ConcentrationPct: onchain?.top10ConcentrationPct ?? null,
            whaleAccumulationPct,
            whaleWindowDays,
            whaleHistoryPoints,

            catalysts,
            nextUnlockDays: deriveNextUnlockDays(catalysts),
            fearGreed: fearGreed?.value ?? null,
            fearGreedLabel: fearGreed?.classification ?? null,

            networkStats,

            dataQuality: {
                tokenomics: market.circulating_supply != null,
                value: psRatio !== null || mcapToTvl !== null || tvl !== null,
                dev: (detail?.devCommits4w ?? null) !== null,
                onchain: (onchain?.holderCount ?? onchain?.top10ConcentrationPct ?? null) !== null,
                catalysts: catalysts.length > 0,
            },
        };

        const score = calculateCryptoScoreV2(fundamentals);

        // Reuse the Company shape for the existing UI plumbing; attach the
        // project description so the AI layer can ground its tech explanation.
        const company = mapCryptoToCompany(market);
        company.description = detail?.description?.slice(0, 1500) ?? "";
        if (detail?.categories?.length) company.sector = detail.categories[0];

        return NextResponse.json({ company, fundamentals, score });
    } catch (error) {
        console.error("[API /crypto]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
