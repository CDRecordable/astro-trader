// ============================================================
// API Route — /api/portfolio/equity  (portfolio value over time)
// ============================================================
// Forward-tracking equity curve: one snapshot of total portfolio value per
// calendar day, appended whenever the portfolio is valued. Honest by design —
// it builds from the moment you start using the portfolio.
//   GET    → { points: EquityPoint[] }
//   POST   → append/replace today's { totalValue, cash, invested }
//   DELETE → clear the curve (called on portfolio reset)

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface EquityPoint {
    date: string;        // ISO timestamp
    totalValue: number;
    cash: number;
    invested: number;
}

const DATA_PATH = path.join(process.cwd(), "user-data", "equity-history.json");

function read(): EquityPoint[] {
    try {
        const arr = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as EquityPoint[];
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}
function write(points: EquityPoint[]): void {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(points, null, 2), "utf-8");
}

export async function GET() {
    return NextResponse.json({ points: read() });
}

export async function DELETE() {
    write([]);
    return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
    const b = await req.json() as { totalValue?: number; cash?: number; invested?: number };
    if (typeof b.totalValue !== "number") {
        return NextResponse.json({ error: "totalValue required" }, { status: 400 });
    }
    const points = read();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const point: EquityPoint = {
        date: now.toISOString(),
        totalValue: b.totalValue,
        cash: b.cash ?? 0,
        invested: b.invested ?? 0,
    };
    // One point per calendar day → replace today's if it already exists.
    if (points.length > 0 && points[points.length - 1].date.slice(0, 10) === today) {
        points[points.length - 1] = point;
    } else {
        points.push(point);
    }
    write(points);
    return NextResponse.json({ ok: true, points });
}
