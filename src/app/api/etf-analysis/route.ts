// ============================================================
// API Route — /api/etf-analysis  (list all cached ETF analyses)
// ============================================================

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "user-data", "etf-analysis");

export async function GET() {
    try {
        const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
        const items = files
            .map((f) => {
                try { return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), "utf-8")); }
                catch { return null; }
            })
            .filter(Boolean);
        return NextResponse.json({ items });
    } catch {
        return NextResponse.json({ items: [] });
    }
}
