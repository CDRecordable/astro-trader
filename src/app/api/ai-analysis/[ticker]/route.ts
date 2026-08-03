// ============================================================
// API Route — /api/ai-analysis/[ticker]
// Qualitative analysis layer powered by the USER'S own LLM key
// (configured in Settings → user-data/settings.json).
// GET  → returns the cached analysis for the ticker (404 if none)
// POST → generates a fresh analysis (grounded on our quantitative
//        metrics), caches it on disk, and returns it.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCompanyDetail } from "@/lib/api/provider";
import { evaluateCompany } from "@/lib/algorithm";
import { getDefaultMacroContext } from "@/lib/mock-data";
import {
    buildAnalysisPrompt, parseAnalysisJson, type QualitativeAnalysis,
} from "@/lib/api/llm-client";
import { runAi } from "@/lib/ai-access";
import { fetchTickerNews, type NewsItem } from "@/lib/api/news-client";
import { userDataPath } from "@/lib/paths";

const CACHE_DIR = userDataPath("ai-analysis");

interface CachedAnalysis {
    ticker: string;
    name?: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: QualitativeAnalysis;
    news: NewsItem[];
}

function cachePath(ticker: string): string {
    return path.join(CACHE_DIR, `${ticker.replace(/[^A-Za-z0-9.\-]/g, "_")}.json`);
}

// ── GET: cached analysis ─────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;
    try {
        const raw = fs.readFileSync(cachePath(ticker.toUpperCase()), "utf-8");
        return NextResponse.json(JSON.parse(raw) as CachedAnalysis);
    } catch {
        return NextResponse.json({ error: "No cached analysis" }, { status: 404 });
    }
}

// ── POST: generate fresh analysis ────────────────────────────
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();

    // Access is resolved in one place: a lifetime licence uses the user's own
    // key, an active Patreon membership goes through our proxy. See ai-access.ts.

    try {
        // Ground the model with our real quantitative picture + recent news
        const [{ company }, news] = await Promise.all([
            getCompanyDetail(ticker),
            fetchTickerNews(ticker, 8),
        ]);
        const m = company.metrics;
        const score = evaluateCompany(company, getDefaultMacroContext());

        const fmt = (v: number | undefined, pct = false, suffix = "") =>
            v === undefined ? "N/D" : pct ? `${(v * 100).toFixed(1)}%${suffix}` : `${v.toFixed(1)}${suffix}`;

        const quantSummary = [
            `Market cap: $${(m.marketCap / 1000).toFixed(1)}B · Score total ${score.totalScore}/100 (${score.recommendation})`,
            `Valoración ${score.valuationScore}/100 · Calidad/Tendencia ${score.trendScore}/100 · Timing ${score.timingScore}/100`,
            `FCF/EV: ${fmt(m.evFcfYield, true)} · Deuda neta/EBITDA: ${fmt(m.netDebtToEbitda, false, "×")} · Cobertura intereses: ${fmt(m.interestCoverage, false, "×")}`,
            `Libro tangible/mercado: ${m.tangibleBookToMarket?.toFixed(2) ?? "N/D"} · Margen EBIT: ${fmt(m.ebitMargin, true)} · ROE: ${fmt(m.roe, true)} · ROC: ${fmt(m.roc, true)}`,
            `Dilución: ${fmt(m.sharesDilution, true, "/año")} · Accruals: ${fmt(m.accrualRatio, true)} · Revisiones EPS 30d: ↑${m.epsRevisionsUp30d ?? "?"} ↓${m.epsRevisionsDown30d ?? "?"} (deriva ${fmt(m.epsTrend30d, true)})`,
            `Insiders 6m: ${m.insiderBuyCount6m ?? "N/D"} compras / ${m.insiderSellCount6m ?? "N/D"} ventas · Propiedad insider: ${fmt(m.insiderOwnership, true)}`,
            score.hardFilterReasons.length ? `FILTROS DUROS FALLIDOS: ${score.hardFilterReasons.join("; ")}` : "Pasa los filtros duros.",
        ].join("\n");

        const newsBlock = news.map((n) => `- ${n.date} · ${n.publisher}: ${n.title}`).join("\n");

        const prompt = buildAnalysisPrompt({
            ticker,
            name: company.name,
            sector: company.sector,
            description: company.description,
            quantSummary,
            news: newsBlock,
        });

        const ai = await runAi(prompt);
        if (!ai.ok) {
            return NextResponse.json({ error: ai.failure, message: ai.message }, { status: ai.status });
        }
        const { text, model, provider } = ai;
        const analysis = parseAnalysisJson(text);

        const cached: CachedAnalysis = {
            ticker,
            name: company.name,
            generatedAt: new Date().toISOString(),

            provider,

            model,
            analysis,
            news,
        };
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cachePath(ticker), JSON.stringify(cached, null, 2), "utf-8");

        return NextResponse.json(cached);
    } catch (error) {
        console.error("[API /ai-analysis]", error);
        return NextResponse.json(
            { error: "generation_failed", message: error instanceof Error ? error.message : "Error desconocido" },
            { status: 500 }
        );
    }
}
