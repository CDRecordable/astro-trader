import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { Candle } from "@/lib/technical";

export const dynamic = "force-dynamic";

// Yahoo's chart() returns full OHLCV per bar; the legacy shape of this route
// only ever surfaced the close. The `ohlc=1` flag exposes the rest for the
// technical analysis section without touching existing consumers.
type ChartQuote = {
    date: Date | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
};
type ChartResult = { quotes: ChartQuote[] };
type YF = { chart: (symbol: string, opts: { period1: Date; interval: string }) => Promise<ChartResult> };

const yf = new (YahooFinance as unknown as new () => YF)();

/**
 * /api/ticker?symbol=XLK[&ohlc=1]
 * Daily price data for an arbitrary ticker from 2000-01-01 to present.
 *  · default        → { data: {date, price}[] }         (unchanged)
 *  · with ohlc=1    → { data, candles: Candle[] }       (full OHLCV)
 * Cached for 24 hours.
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const symbol = url.searchParams.get("symbol");
        const wantOhlc = url.searchParams.get("ohlc") === "1";

        if (!symbol) {
            return NextResponse.json({ error: "No symbol provided" }, { status: 400 });
        }

        const dateFrom = new Date("2000-01-01");

        const res = await yf.chart(symbol, { period1: dateFrom, interval: "1d" });
        const quotes = res?.quotes;

        if (!Array.isArray(quotes)) {
            return NextResponse.json(wantOhlc ? { data: [], candles: [] } : { data: [] });
        }

        // Yahoo emits bars with null closes on holidays — drop them.
        const valid = quotes.filter((q) => q.close != null);

        const data = valid.map((q) => ({
            date: new Date(q.date).toISOString().split("T")[0],
            price: Number(Number(q.close).toFixed(2)),
        }));

        const headers = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" };

        if (!wantOhlc) {
            console.log(`[API /ticker] ${symbol}: ${data.length} daily points`);
            return NextResponse.json({ data }, { headers });
        }

        const candles: Candle[] = valid.map((q) => ({
            date: new Date(q.date).toISOString().split("T")[0],
            // A bar can have a close but a null open/high/low/volume; keep the
            // field absent rather than 0 so indicators treat it honestly.
            open: q.open ?? undefined,
            high: q.high ?? undefined,
            low: q.low ?? undefined,
            close: Number(q.close),
            volume: q.volume ?? undefined,
        }));

        console.log(`[API /ticker] ${symbol}: ${data.length} daily points (+OHLCV)`);
        return NextResponse.json({ data, candles }, { headers });
    } catch (error) {
        console.error("[API /ticker] Exception:", error);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
