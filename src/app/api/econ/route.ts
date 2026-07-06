// ============================================================
// API Route — /api/econ?country=us|ea|es
// ============================================================
// Country macro dashboard payload: for every indicator in the registry,
// fetches its raw series (FRED / DBnomics), applies the transform
// (level / YoY / MoM / delta) and returns the latest reading plus a
// short history for sparklines. Sources are free & keyless; failures
// degrade per-indicator (a dead series never kills the dashboard).

import { NextRequest, NextResponse } from "next/server";
import { COUNTRIES, type CountryId, type IndicatorDef, type Transform } from "@/lib/econ-indicators";
import { fetchFredSeries, fetchDbnomicsSeries, type SeriesPoint } from "@/lib/api/econ-sources";

export interface EconIndicatorPayload {
    key: string;
    date: string;               // period of the latest reading
    value: number;              // transformed latest value
    prev: number | null;        // previous transformed value (for the trend arrow)
    history: SeriesPoint[];     // last ≤24 transformed points (sparkline)
}

const HISTORY = 24;

/** Apply the registry transform over the raw series. */
function transform(points: SeriesPoint[], kind: Transform): SeriesPoint[] {
    switch (kind) {
        case "level":
            return points;
        case "delta":
            return points.slice(1).map((p, i) => ({ date: p.date, value: p.value - points[i].value }));
        case "mom":
            return points.slice(1).flatMap((p, i) =>
                points[i].value !== 0 ? [{ date: p.date, value: (p.value / points[i].value - 1) * 100 }] : []);
        case "yoy":
            return points.slice(12).flatMap((p, i) =>
                points[i].value !== 0 ? [{ date: p.date, value: (p.value / points[i].value - 1) * 100 }] : []);
    }
}

async function loadIndicator(def: IndicatorDef): Promise<EconIndicatorPayload | null> {
    try {
        const raw = def.source.kind === "fred"
            ? await fetchFredSeries(def.source.id)
            : await fetchDbnomicsSeries(def.source.id);
        const series = transform(raw, def.transform);
        if (series.length === 0) return null;
        const last = series[series.length - 1];
        const prev = series.length > 1 ? series[series.length - 2].value : null;
        return {
            key: def.key,
            date: last.date,
            value: last.value,
            prev,
            history: series.slice(-HISTORY),
        };
    } catch (error) {
        console.error(`[econ] ${def.key}:`, error);
        return null; // degrade gracefully — the view shows N/D for this row
    }
}

export async function GET(req: NextRequest) {
    const country = (new URL(req.url).searchParams.get("country") ?? "us") as CountryId;
    const spec = COUNTRIES[country];
    if (!spec) {
        return NextResponse.json({ error: `Unknown country "${country}"` }, { status: 400 });
    }

    const results = await Promise.all(spec.indicators.map(loadIndicator));
    const indicators = results.filter((r): r is EconIndicatorPayload => r !== null);

    return NextResponse.json({ country, indicators });
}
