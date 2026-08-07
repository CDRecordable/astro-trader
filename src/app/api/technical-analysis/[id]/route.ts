// ============================================================
// API Route — /api/technical-analysis/[id]
// ============================================================
// AI layer over the PRE-COMPUTED technical indicators. Follows the same
// pattern as the other analysis routes (GET = disk cache, POST = generate),
// with two deliberate differences:
//   · no news fetch — headlines have nothing to do with a chart read;
//   · the cache is expected to go stale FAST (the UI warns at 3 days, not
//     14): a technical read is a photograph, not a thesis.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { userDataPath } from "@/lib/paths";
import { runAi } from "@/lib/ai-access";
import {
    buildTechnicalPrompt,
    parseTechnicalJson,
    type TechnicalQualitative,
} from "@/lib/api/llm-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DIR = userDataPath("technical-analysis");

interface CachedTechnicalAnalysis {
    id: string;
    name?: string;
    symbol?: string;
    type?: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: TechnicalQualitative;
}

function cachePath(id: string): string {
    return path.join(CACHE_DIR, `${id.replace(/[^A-Za-z0-9.\-]/g, "_")}.json`);
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    try {
        const raw = fs.readFileSync(cachePath(id.toLowerCase()), "utf-8");
        return NextResponse.json(JSON.parse(raw));
    } catch {
        return NextResponse.json({ error: "No cached analysis" }, { status: 404 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: rawId } = await params;
    const id = rawId.toLowerCase();

    try {
        const body = (await req.json()) as {
            name?: string;
            symbol?: string;
            type?: string;
            quantSummary?: string;
        };
        if (!body.quantSummary) {
            return NextResponse.json({ error: "missing_quant_summary" }, { status: 400 });
        }

        const prompt = buildTechnicalPrompt({
            name: body.name ?? rawId,
            symbol: body.symbol ?? rawId.toUpperCase(),
            quantSummary: body.quantSummary,
        });

        const ai = await runAi(prompt);
        if (!ai.ok) {
            return NextResponse.json({ error: ai.failure, message: ai.message }, { status: ai.status });
        }
        const analysis = parseTechnicalJson(ai.text);

        const cached: CachedTechnicalAnalysis = {
            id,
            name: body.name,
            symbol: body.symbol,
            type: body.type,
            generatedAt: new Date().toISOString(),
            provider: ai.provider,
            model: ai.model,
            analysis,
        };
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cachePath(id), JSON.stringify(cached, null, 2), "utf-8");

        return NextResponse.json(cached);
    } catch (error) {
        console.error(`[API /technical-analysis] ${id}:`, error);
        return NextResponse.json(
            { error: "generation_failed", message: error instanceof Error ? error.message : "Unknown" },
            { status: 500 },
        );
    }
}
