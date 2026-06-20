// ============================================================
// On-chain history — local snapshot store (server-side, fs)
// ============================================================
// Free APIs don't give historical holder data, so we BUILD it: every time a
// token's detail is opened we record a snapshot of its whale aggregate +
// holder count to disk. Over repeat visits this accumulates a real series,
// from which we derive "whale accumulation" (Δ of the top holders' balance).
//
// Stored at user-data/onchain-history/{coingeckoId}.json (gitignored).

import fs from "fs";
import path from "path";

const HISTORY_DIR = path.join(process.cwd(), "user-data", "onchain-history");

export interface OnChainSnapshot {
    t: string;                       // ISO timestamp
    holderCount: number | null;
    top10Pct: number | null;
    whaleAggregate: number | null;   // raw aggregate balance of top holders
}

export interface AccumulationResult {
    whaleAccumulationPct: number | null;  // % change in whale aggregate over the window
    whaleWindowDays: number | null;
    holderCountChange: number | null;     // absolute change in holder count
    snapshotCount: number;                // how many snapshots we have (incl. today)
}

function filePath(id: string): string {
    return path.join(HISTORY_DIR, `${id.replace(/[^A-Za-z0-9.\-]/g, "_")}.json`);
}

function readHistory(id: string): OnChainSnapshot[] {
    try {
        const raw = fs.readFileSync(filePath(id), "utf-8");
        const arr = JSON.parse(raw) as OnChainSnapshot[];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function dayKey(iso: string): string {
    return iso.slice(0, 10); // YYYY-MM-DD
}

/**
 * Compare today's reading against history (BEFORE recording it), then persist
 * today's snapshot. `nowMs` is passed in for deterministic day math.
 */
export function recordAndCompare(
    id: string,
    current: { holderCount: number | null; top10Pct: number | null; whaleAggregate: number | null },
    nowMs: number,
): AccumulationResult {
    const history = readHistory(id);
    const todayIso = new Date(nowMs).toISOString();

    // ── Compare against the most informative past snapshot ──
    let whaleAccumulationPct: number | null = null;
    let whaleWindowDays: number | null = null;
    let holderCountChange: number | null = null;

    if (current.whaleAggregate !== null) {
        const past = history
            .filter((s) => s.whaleAggregate !== null && dayKey(s.t) !== dayKey(todayIso))
            // Prefer the snapshot closest to 30 days old; fall back to the oldest.
            .map((s) => ({ s, age: (nowMs - Date.parse(s.t)) / 86_400_000 }))
            .filter((x) => x.age >= 0.5)
            .sort((a, b) => Math.abs(a.age - 30) - Math.abs(b.age - 30))[0];

        if (past && past.s.whaleAggregate && past.s.whaleAggregate > 0) {
            whaleAccumulationPct = ((current.whaleAggregate - past.s.whaleAggregate) / past.s.whaleAggregate) * 100;
            whaleWindowDays = Math.max(1, Math.round(past.age));
            if (current.holderCount !== null && past.s.holderCount !== null) {
                holderCountChange = current.holderCount - past.s.holderCount;
            }
        }
    }

    // ── Record today's snapshot (one per calendar day; replace same-day) ──
    const snapshot: OnChainSnapshot = {
        t: todayIso,
        holderCount: current.holderCount,
        top10Pct: current.top10Pct,
        whaleAggregate: current.whaleAggregate,
    };
    const deduped = history.filter((s) => dayKey(s.t) !== dayKey(todayIso));
    deduped.push(snapshot);
    // Keep the last ~400 days, sorted ascending.
    deduped.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
    const trimmed = deduped.slice(-400);

    try {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
        fs.writeFileSync(filePath(id), JSON.stringify(trimmed, null, 2), "utf-8");
    } catch {
        /* non-fatal: history is best-effort */
    }

    return {
        whaleAccumulationPct,
        whaleWindowDays,
        holderCountChange,
        snapshotCount: trimmed.length,
    };
}
