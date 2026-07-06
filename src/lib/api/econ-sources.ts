// ============================================================
// Macro data sources — FRED public CSV + DBnomics (FREE, no key)
// ============================================================
// FRED's fredgraph.csv endpoint serves any series without an API key but
// rejects requests without a browser-ish User-Agent. DBnomics mirrors
// Eurostat/ECB/OECD as plain JSON. Both are cached via Next revalidate.

export interface SeriesPoint { date: string; value: number }

const FRED_UA = {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept": "text/csv,*/*" },
};

/** Fetch a FRED series as (date, value) points. Missing values (".") skipped. */
export async function fetchFredSeries(id: string): Promise<SeriesPoint[]> {
    const res = await fetch(
        `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`,
        { ...FRED_UA, next: { revalidate: 21_600 } }, // 6h — these update monthly/weekly
    );
    if (!res.ok) throw new Error(`FRED ${id}: ${res.status}`);
    const text = await res.text();
    const out: SeriesPoint[] = [];
    for (const line of text.split("\n").slice(1)) {
        const [date, raw] = line.trim().split(",");
        const value = Number(raw);
        if (date && raw !== "." && isFinite(value)) out.push({ date, value });
    }
    return out;
}

/** Fetch a DBnomics series (provider/dataset/series-code path). */
export async function fetchDbnomicsSeries(id: string): Promise<SeriesPoint[]> {
    const res = await fetch(
        `https://api.db.nomics.world/v22/series/${id}?observations=1`,
        { next: { revalidate: 21_600 } },
    );
    if (!res.ok) throw new Error(`DBnomics ${id}: ${res.status}`);
    const d = await res.json() as {
        series?: { docs?: Array<{ period: string[]; value: Array<number | null> }> };
    };
    const s = d.series?.docs?.[0];
    if (!s) return [];
    const out: SeriesPoint[] = [];
    for (let i = 0; i < s.period.length; i++) {
        const v = s.value[i];
        if (v !== null && isFinite(v)) out.push({ date: s.period[i], value: v });
    }
    return out;
}
