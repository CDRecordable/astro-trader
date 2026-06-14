// ============================================================
// API Route: /api/company/[ticker]
// ============================================================
// Stocks: 3-layer provider: Neon cache → Yahoo detail → FMP refinement
// Crypto: CoinGecko single-coin lookup via coingecko-client

import { NextRequest, NextResponse } from "next/server";
import { getCompanyDetail } from "@/lib/api/provider";
import { fetchCryptoDetail } from "@/lib/api/coingecko-client";
import { mapCryptoToCompany } from "@/lib/api/crypto-provider";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;
        const { searchParams } = new URL(request.url);
        const assetType = searchParams.get("type"); // "c" for crypto

        // ── Crypto path: use CoinGecko ──────────────────────────
        if (assetType === "c") {
            // Ticker is the CoinGecko ID (e.g. "hedera-hashgraph") — keep lowercase
            const coingeckoId = ticker.toLowerCase();
            const data = await fetchCryptoDetail(coingeckoId);

            if (!data) {
                return NextResponse.json(
                    { error: `Crypto asset "${ticker}" not found on CoinGecko` },
                    { status: 404 }
                );
            }

            const company = mapCryptoToCompany(data);
            return NextResponse.json({
                company,
                enriched: true,
                apiCalls: 1,
                source: "coingecko",
            });
        }

        // ── Stock path: use Yahoo + Neon ────────────────────────
        const upperTicker = ticker.toUpperCase();
        const { company, enriched, apiCalls } = await getCompanyDetail(upperTicker);

        return NextResponse.json({
            company,
            enriched,
            apiCalls,
            source: enriched ? "yahoo+fmp" : "yahoo",
        });
    } catch (error) {
        console.error("[API /company]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
