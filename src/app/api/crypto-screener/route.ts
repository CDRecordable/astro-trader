// ============================================================
// Crypto Screener API Route
// ============================================================

import { NextResponse } from "next/server";
import { getCryptoScreenerData } from "@/lib/api/crypto-provider";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const source = searchParams.get("source") || "live";
        const category = searchParams.get("category") || undefined;

        if (source === "mock") {
            const mockCrypto = [
                {
                    id: "cg_bitcoin",
                    ticker: "BTC",
                    name: "Bitcoin",
                    exchange: "Crypto",
                    sector: "Layer 1",
                    description: "",
                    metrics: {
                        marketCap: 1200000,
                        totalEquity: 0, operatingProfit: 0,
                        fcfYield: 0.12, bookToMarket: 1.0, ebitMargin: 0.05, grossMargin: 0.08,
                        ebitMarginDelta: 0, grossMarginDelta: 0, roe: 0, roc: 0, roeDelta: 0, rocDelta: 0, assetGrowth: 0, ebitdaGrowth: 0,
                        currentPrice: 64000, fiftyTwoWeekLow: 25000, fiftyTwoWeekHigh: 73000, oneMonthReturn: 0.05, sixMonthReturn: 0, threeMonthReturn: 0,
                    },
                    historicalData: []
                },
                {
                    id: "cg_ethereum",
                    ticker: "ETH",
                    name: "Ethereum",
                    exchange: "Crypto",
                    sector: "Smart Contracts",
                    description: "",
                    metrics: {
                        marketCap: 400000,
                        totalEquity: 0, operatingProfit: 0,
                        fcfYield: 0.15, bookToMarket: 0.85, ebitMargin: 0.02, grossMargin: 0.04,
                        ebitMarginDelta: 0, grossMarginDelta: 0, roe: 0, roc: 0, roeDelta: 0, rocDelta: 0, assetGrowth: 0, ebitdaGrowth: 0,
                        currentPrice: 3500, fiftyTwoWeekLow: 1500, fiftyTwoWeekHigh: 4800, oneMonthReturn: 0.02, sixMonthReturn: 0, threeMonthReturn: 0,
                    },
                    historicalData: []
                }
            ];
            return NextResponse.json({ companies: mockCrypto });
        }

        // Live Mode (CoinGecko)
        const companies = await getCryptoScreenerData(category);

        return NextResponse.json({ companies });
    } catch (error) {
        console.error("[API] Crypto Screener Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch crypto data" },
            { status: 500 }
        );
    }
}
