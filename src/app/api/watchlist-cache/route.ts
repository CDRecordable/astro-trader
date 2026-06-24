// ============================================================
// API Route — /api/watchlist-cache
// ============================================================
// Persists the last computed score + display snapshot for each watchlist
// asset to disk, so the watchlist loads INSTANTLY from disk instead of
// re-scoring every asset on every visit. Refresh only happens on demand.
//   GET  → { items: { [tickerLower]: Snapshot } }
//   POST → upsert one { ticker, company, score }

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Company, AlgorithmScore } from "@/lib/types";

interface Snapshot { company: Company; score: AlgorithmScore; scoredAt: string }
type CacheFile = Record<string, Snapshot>;

const DATA_PATH = path.join(process.cwd(), "user-data", "watchlist-cache.json");

function read(): CacheFile {
    try { return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as CacheFile; }
    catch { return {}; }
}
function write(data: CacheFile): void {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
    return NextResponse.json({ items: read() });
}

export async function POST(req: NextRequest) {
    const body = await req.json() as { ticker?: string; company?: Company; score?: AlgorithmScore };
    if (!body.ticker || !body.company || !body.score) {
        return NextResponse.json({ error: "ticker, company and score required" }, { status: 400 });
    }
    const data = read();
    // Drop the heavy price history — the watchlist rows don't need it.
    const company = { ...body.company, historicalData: [] };
    data[body.ticker.toLowerCase()] = { company, score: body.score, scoredAt: new Date().toISOString() };
    write(data);
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    const ticker = new URL(req.url).searchParams.get("ticker");
    if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
    const data = read();
    delete data[ticker.toLowerCase()];
    write(data);
    return NextResponse.json({ ok: true });
}
