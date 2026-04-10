// ============================================================
// FMP API Client - HTTP wrapper with error handling
// ============================================================
// Uses /stable/ endpoints for new-generation API keys.

import type {
    FMPProfile,
    FMPKeyMetricsTTM,
    FMPRatiosTTM,
    FMPQuote,
    FMPHistoricalPrice,
    FMPIncomeStatement,
    FMPBalanceSheet,
} from "./types";

const FMP_BASE = "https://financialmodelingprep.com";

function getApiKey(): string {
    const key = process.env.FMP_API_KEY;
    if (!key) throw new Error("FMP_API_KEY not set in environment");
    return key;
}

async function fmpFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${FMP_BASE}${path}`);
    url.searchParams.set("apikey", getApiKey());
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
        throw new Error(`FMP API error: ${res.status} ${res.statusText} — ${path}`);
    }

    const data = await res.json();
    if (data && typeof data === "object" && "Error Message" in data) {
        throw new Error(`FMP API: ${data["Error Message"]}`);
    }

    return data as T;
}

// ── Company Profile ───────────────────────────────────────────
export async function fetchProfile(ticker: string): Promise<FMPProfile | null> {
    const data = await fmpFetch<FMPProfile[]>(`/stable/profile`, { symbol: ticker });
    return data?.[0] ?? null;
}

// ── Key Metrics TTM ───────────────────────────────────────────
export async function fetchKeyMetricsTTM(ticker: string): Promise<FMPKeyMetricsTTM | null> {
    const data = await fmpFetch<FMPKeyMetricsTTM[]>(`/api/v3/key-metrics-ttm/${ticker}`);
    return data?.[0] ?? null;
}

// ── Ratios TTM ────────────────────────────────────────────────
export async function fetchRatiosTTM(ticker: string): Promise<FMPRatiosTTM | null> {
    const data = await fmpFetch<FMPRatiosTTM[]>(`/stable/ratios-ttm`, { symbol: ticker });
    return data?.[0] ?? null;
}

// ── Quote ─────────────────────────────────────────────────────
export async function fetchQuote(ticker: string): Promise<FMPQuote | null> {
    const data = await fmpFetch<FMPQuote[]>(`/stable/quote`, { symbol: ticker });
    return data?.[0] ?? null;
}

// ── Historical Daily Prices ───────────────────────────────────
export async function fetchHistoricalPrices(
    ticker: string,
    fromDate?: string,
    toDate?: string
): Promise<FMPHistoricalPrice[]> {
    const params: Record<string, string> = { symbol: ticker };
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    const data = await fmpFetch<FMPHistoricalPrice[]>(
        `/stable/historical-price-eod/full`,
        params
    );
    return data ?? [];
}

// ── Income Statements (annual) ────────────────────────────────
export async function fetchIncomeStatements(
    ticker: string,
    limit: number = 3
): Promise<FMPIncomeStatement[]> {
    return fmpFetch<FMPIncomeStatement[]>(`/stable/income-statement`, {
        symbol: ticker,
        limit: String(limit),
    });
}

// ── Balance Sheets (annual) ───────────────────────────────────
export async function fetchBalanceSheets(
    ticker: string,
    limit: number = 3
): Promise<FMPBalanceSheet[]> {
    return fmpFetch<FMPBalanceSheet[]>(`/stable/balance-sheet-statement`, {
        symbol: ticker,
        limit: String(limit),
    });
}
