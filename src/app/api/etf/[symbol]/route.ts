// ============================================================
// API Route — /api/etf/[symbol]
// ============================================================
// Aggregates the ETF pipeline: Yahoo (hybrid UCITS + US-proxy enrichment)
// → EtfFundamentals → renormalized score. Returns { company, fundamentals,
// score } mirroring /api/crypto/[id] so the UI plumbing is identical.

import { NextRequest, NextResponse } from "next/server";
import { fetchEtfDetail } from "@/lib/api/etf-client";
import { findEtfEntry } from "@/lib/etf-registry";
import { buildEtfFundamentals, calculateEtfScore, mapEtfToCompany } from "@/lib/etf-fundamentals";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const yahooSymbol = decodeURIComponent(symbol).toUpperCase();

    try {
        const entry = findEtfEntry(yahooSymbol);
        const raw = await fetchEtfDetail(yahooSymbol, entry);

        if (!raw) {
            return NextResponse.json(
                { error: `ETF "${yahooSymbol}" not found on Yahoo Finance` },
                { status: 404 }
            );
        }

        const fundamentals = buildEtfFundamentals(raw, entry);
        const score = calculateEtfScore(fundamentals);
        const company = mapEtfToCompany(fundamentals);

        return NextResponse.json({ company, fundamentals, score });
    } catch (error) {
        console.error("[API /etf]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
