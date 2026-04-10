// ============================================================
// API Route: /api/screener
// ============================================================
// Uses 3-layer provider: Neon cache → Yahoo Finance → FMP
// Accepts ?market= query parameter to select a market group.

import { NextRequest, NextResponse } from "next/server";
import { getScreenerCompanies } from "@/lib/api/provider";
import { MARKET_GROUPS, type MarketGroupId } from "@/lib/market-groups";

export async function GET(request: NextRequest) {
    try {
        const marketId = request.nextUrl.searchParams.get("market") as MarketGroupId | null;

        let tickers: string[] | undefined;
        if (marketId && MARKET_GROUPS[marketId]) {
            tickers = MARKET_GROUPS[marketId].tickers;
        }

        const { companies, fromCache } = await getScreenerCompanies(tickers);

        return NextResponse.json({
            companies,
            total: companies.length,
            fromCache,
            market: marketId || "all",
            source: fromCache ? "neon_cache" : "yahoo_finance",
        });
    } catch (error) {
        console.error("[API /screener]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
