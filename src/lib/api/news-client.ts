// ============================================================
// News client — recent headlines from Yahoo Finance (FREE, no key)
// ============================================================
// Grounds the AI narrative layer in CURRENT reality instead of the model's
// stale training knowledge. Same open Yahoo search endpoint used elsewhere.

export interface NewsItem {
    title: string;
    publisher: string;
    date: string;   // YYYY-MM-DD
    link: string;
}

interface YahooNews {
    title?: string;
    publisher?: string;
    link?: string;
    providerPublishTime?: number;
}

/** Recent news headlines for a ticker/company. Returns [] on error. */
export async function fetchTickerNews(query: string, limit = 8): Promise<NewsItem[]> {
    if (!query) return [];
    try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=${limit}`;
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 1_800 },
        });
        if (!res.ok) return [];
        const data = await res.json() as { news?: YahooNews[] };
        return (data.news ?? [])
            .filter((n) => n.title)
            .slice(0, limit)
            .map((n) => ({
                title: n.title!.trim(),
                publisher: n.publisher ?? "",
                date: n.providerPublishTime
                    ? new Date(n.providerPublishTime * 1000).toISOString().slice(0, 10)
                    : "",
                link: n.link ?? "",
            }));
    } catch {
        return [];
    }
}
