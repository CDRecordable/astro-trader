// ============================================================
// API Route — /api/etf-analysis/[symbol]
// Qualitative ETF analysis (exposure thesis, risks, alternatives) via the
// user's LLM. Mirrors /api/crypto-analysis/[id].
// GET  → cached analysis (404 if none)
// POST → generate fresh (grounded on the quant pillars sent by the client)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
    callLLM, buildEtfAnalysisPrompt, parseEtfAnalysisJson,
    type LLMProvider, type EtfQualitative,
} from "@/lib/api/llm-client";
import { isLicensed } from "@/lib/license";
import { fetchTickerNews, type NewsItem } from "@/lib/api/news-client";
import { userDataPath } from "@/lib/paths";

const CACHE_DIR = userDataPath("etf-analysis");
const SETTINGS_PATH = userDataPath("settings.json");

interface CachedEtfAnalysis {
    id: string;               // yahoo symbol, lowercased
    name?: string;
    symbol?: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: EtfQualitative;
    news: NewsItem[];
}

function cachePath(id: string): string {
    return path.join(CACHE_DIR, `${id.replace(/[^A-Za-z0-9.\-]/g, "_")}.json`);
}

// Same smart provider selection as the other analysis routes.
function readLLM(): { provider: LLMProvider | "none"; apiKey: string } {
    try {
        const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as {
            llm?: { defaultProvider?: string; apiKeys?: Record<string, string> };
        };
        const keys = s.llm?.apiKeys ?? {};
        const chosen = (s.llm?.defaultProvider ?? "none") as LLMProvider | "none";
        if (chosen !== "none" && (keys[chosen] ?? "").trim()) {
            return { provider: chosen, apiKey: keys[chosen].trim() };
        }
        for (const p of ["claude", "gemini", "deepseek"] as LLMProvider[]) {
            if ((keys[p] ?? "").trim()) return { provider: p, apiKey: keys[p].trim() };
        }
        return { provider: "none", apiKey: "" };
    } catch {
        return { provider: "none", apiKey: "" };
    }
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    try {
        const raw = fs.readFileSync(cachePath(symbol.toLowerCase()), "utf-8");
        return NextResponse.json(JSON.parse(raw) as CachedEtfAnalysis);
    } catch {
        return NextResponse.json({ error: "No cached analysis" }, { status: 404 });
    }
}

// ── POST ─────────────────────────────────────────────────────
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol: rawSymbol } = await params;
    const id = decodeURIComponent(rawSymbol).toLowerCase();

    // The AI layer is the paid feature: verify the licence (offline, against the
    // embedded public key) before spending the user's tokens.
    if (!isLicensed()) {
        return NextResponse.json(
            { error: "no_license", message: "Desbloquea la capa de IA con tu licencia en Ajustes." },
            { status: 402 }
        );
    }

    const { provider, apiKey } = readLLM();
    if (provider === "none" || !apiKey) {
        return NextResponse.json(
            { error: "no_api_key", message: "Configura un proveedor LLM y su API key en Ajustes." },
            { status: 400 }
        );
    }

    try {
        const body = await req.json() as {
            name?: string; index?: string; category?: string;
            newsQuery?: string; quantSummary?: string;
        };

        // News about the THEME/REGION (e.g. "India economy", "semiconductors"),
        // not the fund itself — that's what moves the narrative.
        const news = await fetchTickerNews(body.newsQuery || body.name || id, 8);
        const newsBlock = news.map((n) => `- ${n.date} · ${n.publisher}: ${n.title}`).join("\n");

        const prompt = buildEtfAnalysisPrompt({
            symbol: id.toUpperCase(),
            name: body.name ?? id,
            index: body.index ?? "",
            category: body.category ?? "",
            quantSummary: body.quantSummary ?? "",
            news: newsBlock,
        });

        const { text, model } = await callLLM(provider, apiKey, prompt);
        const analysis = parseEtfAnalysisJson(text);

        const cached: CachedEtfAnalysis = {
            id, name: body.name, symbol: id.toUpperCase(),
            generatedAt: new Date().toISOString(), provider, model, analysis, news,
        };
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cachePath(id), JSON.stringify(cached, null, 2), "utf-8");

        return NextResponse.json(cached);
    } catch (error) {
        console.error("[API /etf-analysis]", error);
        return NextResponse.json(
            { error: "generation_failed", message: error instanceof Error ? error.message : "Error desconocido" },
            { status: 500 }
        );
    }
}
