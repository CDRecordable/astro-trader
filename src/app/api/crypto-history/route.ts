// ============================================================
// API Route — /api/crypto-history?id=<coingeckoId>&days=365
// ============================================================
// Daily price history for a coin, used by the crypto beta chart (asset vs
// Bitcoin). Proxies CoinGecko's market_chart so the browser avoids CORS and
// the response is cached server-side. Returns { data: [{ date, price }] }.

import { NextRequest, NextResponse } from "next/server";
import { fetchCoinMarketChart } from "@/lib/api/coingecko-client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
        return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }
    const days = Math.min(365, Math.max(30, Number(searchParams.get("days")) || 365));
    const data = await fetchCoinMarketChart(id, days);
    return NextResponse.json({ data });
}
