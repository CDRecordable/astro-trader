// ============================================================
// API Route — /api/watchlist
// Stores user watchlist in /user-data/watchlist.json (local disk)
// GET    → returns all items
// POST   → adds item { ticker, name, assetType }
// DELETE → removes item ?ticker=AAPL
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface WatchlistItem {
    /** Lookup key for /api/company — CoinGecko ID for crypto, symbol for stocks */
    ticker: string;
    /** Display symbol — e.g. "HBAR", "AAPL" */
    symbol: string;
    name: string;
    assetType: "s" | "c"; // s=stock, c=crypto
    addedAt: string;       // ISO string
    note: string;
}

interface WatchlistFile {
    items: WatchlistItem[];
}

const DATA_PATH = path.join(process.cwd(), "user-data", "watchlist.json");

function readWatchlist(): WatchlistFile {
    try {
        const raw = fs.readFileSync(DATA_PATH, "utf-8");
        return JSON.parse(raw) as WatchlistFile;
    } catch {
        return { items: [] };
    }
}

function writeWatchlist(data: WatchlistFile): void {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── GET ───────────────────────────────────────────────────────
export async function GET() {
    const data = readWatchlist();
    return NextResponse.json(data);
}

// ── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const body = await req.json() as Partial<WatchlistItem>;

    if (!body.ticker || !body.name) {
        return NextResponse.json({ error: "ticker and name are required" }, { status: 400 });
    }

    const data = readWatchlist();

    const alreadyExists = data.items.some(
        (i) => i.ticker.toLowerCase() === body.ticker!.toLowerCase()
    );
    if (alreadyExists) {
        return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
    }

    const newItem: WatchlistItem = {
        ticker: body.ticker.trim(),
        symbol: (body.symbol ?? body.ticker).trim(),
        name: body.name.trim(),
        assetType: body.assetType ?? "s",
        addedAt: new Date().toISOString(),
        note: body.note ?? "",
    };

    data.items.unshift(newItem); // newest first
    writeWatchlist(data);

    return NextResponse.json({ item: newItem }, { status: 201 });
}

// ── DELETE ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker");

    if (!ticker) {
        return NextResponse.json({ error: "ticker query param required" }, { status: 400 });
    }

    const data = readWatchlist();
    const before = data.items.length;
    data.items = data.items.filter(
        (i) => i.ticker.toLowerCase() !== ticker.toLowerCase()
    );

    if (data.items.length === before) {
        return NextResponse.json({ error: "Ticker not in watchlist" }, { status: 404 });
    }

    writeWatchlist(data);
    return NextResponse.json({ ok: true });
}
