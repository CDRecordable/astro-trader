// ============================================================
// API Route — /api/portfolio  (simulated paper-trading portfolio)
// ============================================================
// State persisted to user-data/portfolio.json. Orders are placed BY AMOUNT
// ($) at the current price provided by the client; fractional units allowed.
//   GET    → portfolio state
//   POST   → place an order { ticker, symbol, name, assetType, type, amount, price }
//   DELETE → reset the portfolio to its starting cash

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STARTING_CASH = 10_000;
const EPS = 1e-6;

export interface Holding {
    ticker: string;      // lookup key (symbol for stocks, CoinGecko id for crypto)
    symbol: string;
    name: string;
    assetType: "s" | "c";
    qty: number;
    avgCost: number;     // average cost per unit
}
export interface Transaction {
    ticker: string;
    symbol: string;
    name: string;
    assetType: "s" | "c";
    type: "buy" | "sell";
    qty: number;
    price: number;
    amount: number;
    realizedPnl?: number; // for sells
    date: string;
}
export interface Portfolio {
    startingCash: number;
    cash: number;
    holdings: Record<string, Holding>;
    transactions: Transaction[];
}

const DATA_PATH = path.join(process.cwd(), "user-data", "portfolio.json");

function read(): Portfolio {
    try {
        const p = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as Portfolio;
        return {
            startingCash: p.startingCash ?? STARTING_CASH,
            cash: p.cash ?? STARTING_CASH,
            holdings: p.holdings ?? {},
            transactions: p.transactions ?? [],
        };
    } catch {
        return { startingCash: STARTING_CASH, cash: STARTING_CASH, holdings: {}, transactions: [] };
    }
}
function write(p: Portfolio): void {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(p, null, 2), "utf-8");
}

export async function GET() {
    return NextResponse.json(read());
}

export async function DELETE() {
    const fresh: Portfolio = { startingCash: STARTING_CASH, cash: STARTING_CASH, holdings: {}, transactions: [] };
    write(fresh);
    return NextResponse.json(fresh);
}

export async function POST(req: NextRequest) {
    const b = await req.json() as {
        ticker?: string; symbol?: string; name?: string; assetType?: "s" | "c";
        type?: "buy" | "sell"; amount?: number; price?: number;
    };
    if (!b.ticker || !b.type || !b.price || b.price <= 0 || !b.amount || b.amount <= 0) {
        return NextResponse.json({ error: "ticker, type, positive amount and price are required" }, { status: 400 });
    }

    const p = read();
    const key = b.ticker.toLowerCase();
    const price = b.price;

    if (b.type === "buy") {
        const amount = Math.min(b.amount, p.cash);
        if (amount < 0.01) return NextResponse.json({ error: "insufficient_cash" }, { status: 400 });
        const qty = amount / price;
        const h = p.holdings[key];
        if (h) {
            const newQty = h.qty + qty;
            h.avgCost = (h.qty * h.avgCost + qty * price) / newQty;
            h.qty = newQty;
        } else {
            p.holdings[key] = {
                ticker: b.ticker, symbol: b.symbol ?? b.ticker, name: b.name ?? b.ticker,
                assetType: b.assetType ?? "s", qty, avgCost: price,
            };
        }
        p.cash -= amount;
        p.transactions.unshift({
            ticker: b.ticker, symbol: b.symbol ?? b.ticker, name: b.name ?? b.ticker,
            assetType: b.assetType ?? "s", type: "buy", qty, price, amount, date: new Date().toISOString(),
        });
    } else {
        const h = p.holdings[key];
        if (!h || h.qty <= 0) return NextResponse.json({ error: "no_position" }, { status: 400 });
        let sellQty = b.amount / price;
        if (sellQty >= h.qty - EPS) sellQty = h.qty; // sell-all tolerance
        const amount = sellQty * price;
        const realizedPnl = (price - h.avgCost) * sellQty;
        h.qty -= sellQty;
        p.cash += amount;
        if (h.qty <= EPS) delete p.holdings[key];
        p.transactions.unshift({
            ticker: b.ticker, symbol: b.symbol ?? b.ticker, name: b.name ?? b.ticker,
            assetType: b.assetType ?? "s", type: "sell", qty: sellQty, price, amount, realizedPnl, date: new Date().toISOString(),
        });
    }

    write(p);
    return NextResponse.json(p);
}
