import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

type ChartQuote = { date: Date | string; close: number | null };
type ChartResult = { quotes: ChartQuote[] };
type YF = { chart: (symbol: string, opts: { period1: Date; interval: string }) => Promise<ChartResult> };

const yf = new (YahooFinance as unknown as new () => YF)();

/**
 * /api/macro-daily — Daily price data for rigorous analysis.
 * Returns daily S&P 500 (from 2000), BTC-USD (from 2014), GLD (from 2004), QQQ (from 2000).
 * Cached for 24 hours via Next.js headers.
 */
export async function GET() {
    try {
        const sp500From = new Date("2000-01-01");
        const btcFrom = new Date("2014-09-01");
        const gldFrom = new Date("2004-11-01"); // GLD launched Nov 2004
        const qqqFrom = new Date("2000-01-01");

        const [sp500Res, btcRes, gldRes, qqqRes] = await Promise.allSettled([
            yf.chart("^GSPC", { period1: sp500From, interval: "1d" }),
            yf.chart("BTC-USD", { period1: btcFrom, interval: "1d" }),
            yf.chart("GLD", { period1: gldFrom, interval: "1d" }),
            yf.chart("QQQ", { period1: qqqFrom, interval: "1d" }),
        ]);

        const parse = (res: PromiseSettledResult<ChartResult>) => {
            if (res.status !== "fulfilled") return [];
            const quotes = res.value?.quotes;
            if (!Array.isArray(quotes)) return [];
            return quotes
                .filter((q: ChartQuote) => q.close != null)
                .map((q: ChartQuote) => ({
                    date: new Date(q.date).toISOString().split("T")[0],
                    price: Number(Number(q.close).toFixed(2)),
                }));
        };

        const sp500 = parse(sp500Res);
        const btc = parse(btcRes);
        const gold = parse(gldRes);
        const nasdaq = parse(qqqRes);

        console.log(`[API /macro-daily] S&P500: ${sp500.length}, BTC: ${btc.length}, GLD: ${gold.length}, QQQ: ${nasdaq.length} daily points`);

        return NextResponse.json(
            { sp500, btc, gold, nasdaq },
            { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } }
        );
    } catch (error) {
        console.error("[API /macro-daily] Exception:", error);
        return NextResponse.json({ sp500: [], btc: [], gold: [], nasdaq: [] }, { status: 500 });
    }
}
