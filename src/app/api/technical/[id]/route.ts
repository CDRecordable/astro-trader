// ============================================================
// API Route — /api/technical/[id]?type=s|c|e[&light=1]
// ============================================================
// One endpoint for the whole technical layer: fetches daily candles for the
// asset, computes indicators + the technical score SERVER-SIDE, and returns
// both. `light=1` drops the candle array (the ficha block only needs the
// score — ~3KB instead of ~500KB).
//
// This is the route that multiplies upstream calls (Yahoo per stock/ETF,
// CoinGecko per coin), so it carries its own in-memory cache: the app runs
// locally with no CDN in front, meaning the Cache-Control header alone
// protects nobody. 6h TTL matches how often daily candles meaningfully change.

import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { fetchCoinMarketChartFull, isTransientCoinGeckoError } from "@/lib/api/coingecko-client";
import { syntheticCandles, type Candle } from "@/lib/technical";
import { computeTechnicalScore, hasEnoughHistory, type TechnicalScore } from "@/lib/technical-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssetType = "s" | "c" | "e";

interface TechnicalPayload {
    id: string;
    type: AssetType;
    candles: Candle[];
    score: TechnicalScore;
}

// ── In-memory cache (per server process) ─────────────────────
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { ts: number; payload: TechnicalPayload }>();

// ── Yahoo (stocks and ETFs are the same symbol space) ────────
type ChartQuote = {
    date: Date | string;
    open: number | null; high: number | null; low: number | null;
    close: number | null; volume: number | null;
};
type YF = { chart: (symbol: string, opts: { period1: Date; interval: string }) => Promise<{ quotes: ChartQuote[] }> };
const yf = new (YahooFinance as unknown as new () => YF)();

async function yahooCandles(symbol: string): Promise<Candle[]> {
    // 4y of daily bars: warm-up for SMA200 with room to spare, and enough
    // history for the workbench's longer timeframes without re-fetching.
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 4);
    const res = await yf.chart(symbol, { period1, interval: "1d" });
    return (res?.quotes ?? [])
        .filter((q) => q.close != null)
        .map((q) => ({
            date: new Date(q.date).toISOString().slice(0, 10),
            open: q.open ?? undefined,
            high: q.high ?? undefined,
            low: q.low ?? undefined,
            close: Number(q.close),
            volume: q.volume ?? undefined,
        }));
}

async function cryptoCandles(id: string): Promise<Candle[]> {
    const { prices, volumes } = await fetchCoinMarketChartFull(id, 365);
    return syntheticCandles(prices, volumes);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: rawId } = await params;
    const id = rawId.toLowerCase();
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "s") as AssetType;
    const light = url.searchParams.get("light") === "1";

    if (!["s", "c", "e"].includes(type)) {
        return NextResponse.json({ error: "type must be s, c or e" }, { status: 400 });
    }

    const key = `${type}:${id}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
        const { payload } = hit;
        return NextResponse.json(light ? { ...payload, candles: [] } : payload, {
            headers: { "x-cache": "hit" },
        });
    }

    try {
        const candles = type === "c"
            ? await cryptoCandles(id)
            : await yahooCandles(rawId.toUpperCase());

        if (!hasEnoughHistory(candles)) {
            return NextResponse.json(
                { error: "not_enough_history", candles: candles.length },
                { status: 422 },
            );
        }

        const payload: TechnicalPayload = {
            id,
            type,
            candles,
            score: computeTechnicalScore(candles),
        };
        cache.set(key, { ts: Date.now(), payload });

        return NextResponse.json(light ? { ...payload, candles: [] } : payload, {
            headers: {
                "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
                "x-cache": "miss",
            },
        });
    } catch (error) {
        console.error(`[API /technical] ${key}:`, error);
        // Same honesty rule as /api/crypto: throttling is OUR problem, not
        // "this asset doesn't exist".
        if (isTransientCoinGeckoError(error)) {
            return NextResponse.json({ error: "provider_throttled", transient: true }, { status: 503 });
        }
        return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    }
}
