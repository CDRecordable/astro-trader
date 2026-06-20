// ============================================================
// API Route — /api/discards
// User's "discard pile" — companies deliberately set aside, stored in
// /user-data/discards.json (local disk). Remembers WHEN each was discarded,
// so on return you see the signal + how stale the decision is.
// GET    → all items
// POST   → add { ticker, symbol, name, assetType, reason? }
// DELETE → remove ?ticker=AAPL
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface DiscardItem {
    ticker: string;        // lookup key: CoinGecko id for crypto, symbol for stocks
    symbol: string;        // display symbol
    name: string;
    assetType: "s" | "c";
    discardedAt: string;   // ISO string
    reason: string;
}

interface DiscardFile { items: DiscardItem[] }

const DATA_PATH = path.join(process.cwd(), "user-data", "discards.json");

function readDiscards(): DiscardFile {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as DiscardFile;
    } catch {
        return { items: [] };
    }
}

function writeDiscards(data: DiscardFile): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
    return NextResponse.json(readDiscards());
}

export async function POST(req: NextRequest) {
    const body = await req.json() as Partial<DiscardItem>;
    if (!body.ticker || !body.name) {
        return NextResponse.json({ error: "ticker and name are required" }, { status: 400 });
    }

    const data = readDiscards();
    const exists = data.items.some((i) => i.ticker.toLowerCase() === body.ticker!.toLowerCase());
    if (exists) {
        return NextResponse.json({ error: "Already discarded" }, { status: 409 });
    }

    const item: DiscardItem = {
        ticker: body.ticker.trim(),
        symbol: (body.symbol ?? body.ticker).trim(),
        name: body.name.trim(),
        assetType: body.assetType ?? "s",
        discardedAt: new Date().toISOString(),
        reason: body.reason ?? "",
    };
    data.items.unshift(item);
    writeDiscards(data);
    return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    const ticker = new URL(req.url).searchParams.get("ticker");
    if (!ticker) {
        return NextResponse.json({ error: "ticker query param required" }, { status: 400 });
    }
    const data = readDiscards();
    const before = data.items.length;
    data.items = data.items.filter((i) => i.ticker.toLowerCase() !== ticker.toLowerCase());
    if (data.items.length === before) {
        return NextResponse.json({ error: "Ticker not in discards" }, { status: 404 });
    }
    writeDiscards(data);
    return NextResponse.json({ ok: true });
}
