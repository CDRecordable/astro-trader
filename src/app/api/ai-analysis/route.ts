// ============================================================
// API Route — /api/ai-analysis  (list all cached stock analyses)
// ============================================================
// Used to badge watchlist rows that already have an AI analysis and to feed
// the aggregate "AI analyses" view. Reads the on-disk cache directory.

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { userDataPath } from "@/lib/paths";

const CACHE_DIR = userDataPath("ai-analysis");

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
