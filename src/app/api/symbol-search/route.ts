// ============================================================
// API Route — /api/symbol-search?q=...
// ============================================================
// Live equity/ETF search against Yahoo Finance, so the explorer can find
// ANY listed stock (incl. every small-cap), not just the curated registry.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface YahooQuote {
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchDisp?: string;
}

interface ResultEntry { t: string; n: string; m: string; y: "s" }

// US primary exchanges first — Víctor wants the real listing, not a foreign dup.
const EXCHANGE_RANK: Record<string, number> = {
    "NASDAQ": 0, "NYSE": 0, "NYSEArca": 1, "NYSE American": 1, "NYSEAmerican": 1, "BATS": 1,
};

export async function GET(req: NextRequest) {
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q || q.length < 1) return NextResponse.json({ results: [] });

    try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true`;
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 3_600 },
        });
        if (!res.ok) return NextResponse.json({ results: [] });

        const data = await res.json() as { quotes?: YahooQuote[] };
        const mapped: ResultEntry[] = (data.quotes ?? [])
            .filter((qt) => (qt.quoteType === "EQUITY" || qt.quoteType === "ETF") && qt.symbol)
            .map((qt) => ({
                t: qt.symbol!,
                n: (qt.shortname || qt.longname || qt.symbol!).replace(/\s+/g, " ").trim(),
                m: qt.exchDisp || "Stock",
                y: "s" as const,
            }))
            .sort((a, b) => (EXCHANGE_RANK[a.m] ?? 5) - (EXCHANGE_RANK[b.m] ?? 5));

        // Collapse foreign duplicate listings of the same company (Frankfurt,
        // CEDEAR…) — keep the best-ranked exchange per company name.
        const seen = new Set<string>();
        const results: ResultEntry[] = [];
        for (const e of mapped) {
            const key = e.n.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
            if (seen.has(key)) continue;
            seen.add(key);
            results.push(e);
            if (results.length >= 8) break;
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("[API /symbol-search]", error);
        return NextResponse.json({ results: [] });
    }
}
