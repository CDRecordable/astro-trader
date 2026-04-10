import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yf = new (YahooFinance as any)();

/**
 * /api/ticker?symbol=XLK
 * Fetches daily price data for an arbitrary ticker from 2000-01-01 to present.
 * Cached for 24 hours.
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const symbol = url.searchParams.get("symbol");

        if (!symbol) {
            return NextResponse.json({ error: "No symbol provided" }, { status: 400 });
        }

        const dateFrom = new Date("2000-01-01");

        const res = await yf.chart(symbol, { period1: dateFrom, interval: "1d" });
        const quotes = res?.quotes;

        if (!Array.isArray(quotes)) {
            return NextResponse.json({ data: [] });
        }

        const data = quotes
            .filter((q: any) => q.close != null)
            .map((q: any) => ({
                date: new Date(q.date).toISOString().split("T")[0],
                price: Number(q.close.toFixed(2)),
            }));

        console.log(`[API /ticker] ${symbol}: ${data.length} daily points`);

        return NextResponse.json(
            { data },
            { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } }
        );
    } catch (error) {
        console.error("[API /ticker] Exception:", error);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
