// ============================================================
// API Route — /api/solar
// Returns the real, live SILSO monthly sunspot series.
// On network failure, the client falls back to the offline snapshot
// already bundled in solar-data.ts (also real SILSO values).
// ============================================================

import { NextResponse } from "next/server";
import { fetchSilsoMonthly } from "@/lib/api/silso-client";
import { MONTHLY_SUNSPOT_DATA, PROVISIONAL_FROM, type SunspotPoint } from "@/lib/solar-data";

export async function GET() {
    try {
        const data = await fetchSilsoMonthly(2000);
        if (data.length === 0) throw new Error("empty SILSO response");

        const lastProv = [...data].reverse().find((p) => p.provisional);
        const lastDef = [...data].reverse().find((p) => !p.provisional);

        return NextResponse.json({
            data,
            source: "SILSO / Royal Observatory of Belgium (live)",
            live: true,
            lastDefinitive: lastDef ? `${lastDef.year}-${String(lastDef.month).padStart(2, "0")}` : null,
            lastMonth: data.length ? `${data[data.length - 1].year}-${String(data[data.length - 1].month).padStart(2, "0")}` : null,
            provisionalFrom: lastProv
                ? data.find((p) => p.provisional)
                    ? `${data.find((p) => p.provisional)!.year}-${String(data.find((p) => p.provisional)!.month).padStart(2, "0")}`
                    : null
                : null,
        });
    } catch (e) {
        // Fall back to the offline snapshot (still real SILSO values, just stale).
        const [py, pm] = PROVISIONAL_FROM.split("-").map(Number);
        const provIdx = py * 12 + (pm - 1);
        const data: SunspotPoint[] = MONTHLY_SUNSPOT_DATA.map(([year, month, ssn]) => ({
            year,
            month,
            ssn,
            provisional: year * 12 + (month - 1) >= provIdx,
        }));
        return NextResponse.json({
            data,
            source: "SILSO / Royal Observatory of Belgium (offline snapshot)",
            live: false,
            error: e instanceof Error ? e.message : "fetch failed",
            provisionalFrom: PROVISIONAL_FROM,
            lastMonth: data.length ? `${data[data.length - 1].year}-${String(data[data.length - 1].month).padStart(2, "0")}` : null,
        });
    }
}
