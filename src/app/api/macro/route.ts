import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

// yahoo-finance2 v3 requires explicit instantiation
type ChartQuote = { date: Date | string; close: number | null };
type ChartResult = { quotes: ChartQuote[] };
type YF = { chart: (symbol: string, opts: { period1: Date; interval: string }) => Promise<ChartResult> };

const yf = new (YahooFinance as unknown as new () => YF)();

export async function GET() {
    try {
        const fromDate = new Date("2000-01-01");
        const btcFromDate = new Date("2014-01-01");
        const gldFromDate = new Date("2004-11-01");
        const qqqFromDate = new Date("2000-01-01");

        // Fetch all indices monthly historical data in parallel
        const [sp500Res, btcRes, gldRes, qqqRes] = await Promise.allSettled([
            yf.chart("^GSPC", { period1: fromDate, interval: "1mo" }),
            yf.chart("BTC-USD", { period1: btcFromDate, interval: "1mo" }),
            yf.chart("GLD", { period1: gldFromDate, interval: "1mo" }),
            yf.chart("QQQ", { period1: qqqFromDate, interval: "1mo" }),
        ]);

        const parse = (res: PromiseSettledResult<ChartResult>) => {
            if (res.status !== "fulfilled") return [];
            const quotes = res.value?.quotes;
            if (!Array.isArray(quotes)) return [];
            return quotes
                .filter((q: ChartQuote) => q.close != null)
                .map((q: ChartQuote) => ({
                    date: new Date(q.date).toISOString().split("T")[0],
                    price: Math.round(Number(q.close)),
                }));
        };

        const sp500 = parse(sp500Res);
        const btc = parse(btcRes);
        const gold = parse(gldRes);
        const nasdaq = parse(qqqRes);

        console.log(`[API /macro] S&P500: ${sp500.length}, BTC: ${btc.length}, GLD: ${gold.length}, QQQ: ${nasdaq.length} points`);
        return NextResponse.json({ sp500, btc, gold, nasdaq });
    } catch (error) {
        console.error("[API /macro] Exception:", error);
        return NextResponse.json({ sp500: [], btc: [], gold: [], nasdaq: [] }, { status: 500 });
    }
}

