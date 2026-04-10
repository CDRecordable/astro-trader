// ============================================================
// API Route: /api/company/[ticker]
// ============================================================
// Uses 3-layer provider: Neon cache → Yahoo detail → FMP refinement

import { NextRequest, NextResponse } from "next/server";
import { getCompanyDetail } from "@/lib/api/provider";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;
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
