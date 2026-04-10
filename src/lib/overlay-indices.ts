// ============================================================
// Overlay Indices — Shared definition of indices available for chart overlays
// ============================================================

export interface OverlayIndex {
    key: string;
    label: string;
    symbol: string;
    color: string;
}

/**
 * Available indices for chart overlays across all macro views.
 * Keys must match the property names returned by /api/macro and /api/macro-daily.
 */
export const OVERLAY_INDICES: OverlayIndex[] = [
    { key: "sp500", label: "S&P 500", symbol: "^GSPC", color: "#3b82f6" },
    { key: "nasdaq", label: "Nasdaq (QQQ)", symbol: "QQQ", color: "#06b6d4" },
    { key: "btc", label: "Bitcoin (BTC)", symbol: "BTC-USD", color: "#f7931a" },
    { key: "gold", label: "Gold (GLD)", symbol: "GLD", color: "#eab308" },
];

/** Default overlay index for single-select views */
export const DEFAULT_OVERLAY = OVERLAY_INDICES[0]; // S&P 500
