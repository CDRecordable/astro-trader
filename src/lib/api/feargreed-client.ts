// ============================================================
// Crypto Fear & Greed index — alternative.me (FREE, no key)
// ============================================================
// The sentiment gauge of crypto — its rough analog to the VIX.
// Used as a macro adjustment: extreme fear (contrarian) nudges scores up,
// extreme greed nudges them down. Surfaced, never the main driver.

export interface FearGreed {
    value: number;                 // 0 (extreme fear) … 100 (extreme greed)
    classification: string;        // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
}

export async function fetchFearGreed(): Promise<FearGreed | null> {
    try {
        const res = await fetch("https://api.alternative.me/fng/?limit=1", {
            next: { revalidate: 3_600 },
        });
        if (!res.ok) throw new Error(`F&G ${res.status}`);
        const d = await res.json() as { data?: Array<{ value: string; value_classification: string }> };
        const row = d.data?.[0];
        if (!row) return null;
        const value = Number(row.value);
        if (!isFinite(value)) return null;
        return { value, classification: row.value_classification };
    } catch (error) {
        console.error("[FearGreed] error:", error);
        return null;
    }
}
