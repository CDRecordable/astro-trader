// ============================================================
// API Route — /api/crypto-analysis/[id]
// Qualitative crypto analysis (tech, roadmap, risks) via the user's LLM.
// GET  → cached analysis (404 if none)
// POST → generate fresh (grounded on the quant pillars sent by the client)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
    buildCryptoAnalysisPrompt, parseCryptoAnalysisJson, type CryptoQualitative,
} from "@/lib/api/llm-client";
import { runAi } from "@/lib/ai-access";
import { fetchTickerNews, type NewsItem } from "@/lib/api/news-client";
import { userDataPath } from "@/lib/paths";

const CACHE_DIR = userDataPath("crypto-analysis");

interface CachedCryptoAnalysis {
    id: string;
    name?: string;
    symbol?: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: CryptoQualitative;
    news: NewsItem[];
}

function cachePath(id: string): string {
    return path.join(CACHE_DIR, `${id.replace(/[^A-Za-z0-9.\-]/g, "_")}.json`);
}

// Same smart provider selection as /api/ai-analysis: chosen-if-keyed, else
// first provider with a non-empty key.
// ── GET ──────────────────────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const raw = fs.readFileSync(cachePath(id.toLowerCase()), "utf-8");
        return NextResponse.json(JSON.parse(raw) as CachedCryptoAnalysis);
    } catch {
        return NextResponse.json({ error: "No cached analysis" }, { status: 404 });
    }
}

// ── POST ─────────────────────────────────────────────────────
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: rawId } = await params;
    const id = rawId.toLowerCase();

    // Access is resolved in one place: a lifetime licence uses the user's own
    // key, an active Patreon membership goes through our proxy. See ai-access.ts.

    try {
        const body = await req.json() as {
            name?: string; symbol?: string; categories?: string;
            description?: string; quantSummary?: string;
        };

        // Recent news to ground the narrative — query by project name (cleaner
        // than the ticker symbol for crypto), e.g. "Hedera" rather than "HBAR".
        const news = await fetchTickerNews(body.name || body.symbol || id, 8);
        const newsBlock = news.map((n) => `- ${n.date} · ${n.publisher}: ${n.title}`).join("\n");

        const prompt = buildCryptoAnalysisPrompt({
            name: body.name ?? id,
            symbol: body.symbol ?? "",
            categories: body.categories ?? "",
            description: body.description ?? "",
            quantSummary: body.quantSummary ?? "",
            news: newsBlock,
        });

        const ai = await runAi(prompt);
        if (!ai.ok) {
            return NextResponse.json({ error: ai.failure, message: ai.message }, { status: ai.status });
        }
        const { text, model, provider } = ai;
        const analysis = parseCryptoAnalysisJson(text);

        const cached: CachedCryptoAnalysis = {
            id, name: body.name, symbol: body.symbol,
            generatedAt: new Date().toISOString(), provider, model, analysis, news,
        };
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cachePath(id), JSON.stringify(cached, null, 2), "utf-8");

        return NextResponse.json(cached);
    } catch (error) {
        console.error("[API /crypto-analysis]", error);
        return NextResponse.json(
            { error: "generation_failed", message: error instanceof Error ? error.message : "Error desconocido" },
            { status: 500 }
        );
    }
}
