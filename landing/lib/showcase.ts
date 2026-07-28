// ============================================================
// Showcase types + formatting for the interactive demo
// ============================================================
// The data is a frozen snapshot captured from the real analyzers, so the
// landing makes zero upstream API calls: it can be crawled and hammered
// without touching Yahoo/CoinGecko rate limits.

import raw from "../data/showcase.json";

export type AssetKind = "stock" | "etf" | "crypto";

export interface Pillar { key: string; label: string; value: number; weight: number }

export interface ShowcaseAsset {
    id: string;
    kind: AssetKind;
    ticker: string;
    name: string;
    sector: string;
    price: number;
    currency: string;
    score: { total: number; recommendation: string; pillars: Pillar[] };
    metrics: Record<string, unknown>;
    spark: number[];
    holdings?: { symbol: string; name: string; pct: number | null }[];
    sectors?: { sector: string; pct: number | null }[];
}

export const SHOWCASE = raw as unknown as { generatedAt: string; assets: ShowcaseAsset[] };

/** A displayable metric row: label, formatted value, and how it reads. */
export interface Metric {
    label: string;
    value: string;
    tone: "good" | "warn" | "bad" | "na";
    hint: string;
}

const pctS = (v: unknown, d = 1) => (typeof v === "number" ? `${v.toFixed(d)}%` : "N/D");
const numS = (v: unknown, d = 2) => (typeof v === "number" ? v.toFixed(d) : "N/D");
const bigS = (v: unknown) => {
    if (typeof v !== "number" || !isFinite(v)) return "N/D";
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toFixed(0)}`;
};
const has = (v: unknown): v is number => typeof v === "number" && isFinite(v);

/** Build the metric rows the demo shows for each asset kind. */
export function metricsFor(a: ShowcaseAsset): Metric[] {
    const m = a.metrics;

    if (a.kind === "stock") {
        return [
            { label: "FCF / EV", value: has(m.evFcfYield) ? pctS(m.evFcfYield) : "N/D",
              tone: has(m.evFcfYield) ? ((m.evFcfYield as number) >= 5 ? "good" : (m.evFcfYield as number) >= 2 ? "warn" : "bad") : "na",
              hint: "Caja libre que genera por cada euro de empresa (deuda incluida). Cuanto más alto, más barata." },
            { label: "Margen EBIT", value: pctS(m.ebitMargin),
              tone: has(m.ebitMargin) ? ((m.ebitMargin as number) >= 15 ? "good" : (m.ebitMargin as number) >= 5 ? "warn" : "bad") : "na",
              hint: "Qué parte de cada venta se convierte en beneficio operativo." },
            { label: "ROE", value: pctS(m.roe),
              tone: has(m.roe) ? ((m.roe as number) >= 15 ? "good" : (m.roe as number) >= 8 ? "warn" : "bad") : "na",
              hint: "Rentabilidad que saca al dinero de los accionistas." },
            { label: "Deuda neta / EBITDA", value: has(m.netDebtToEbitda) ? `${numS(m.netDebtToEbitda)}×` : "N/D",
              tone: has(m.netDebtToEbitda) ? ((m.netDebtToEbitda as number) < 1 ? "good" : (m.netDebtToEbitda as number) < 3 ? "warn" : "bad") : "na",
              hint: "Años de beneficio operativo necesarios para pagar la deuda. Negativo = caja neta." },
            { label: "P/E", value: has(m.peRatio) ? numS(m.peRatio, 1) : "N/D",
              tone: has(m.peRatio) ? ((m.peRatio as number) <= 20 ? "good" : (m.peRatio as number) <= 35 ? "warn" : "bad") : "na",
              hint: "Cuántos años de beneficio actual estás pagando." },
        ];
    }

    if (a.kind === "etf") {
        const ter = m.ter as number | null;
        return [
            { label: "TER (comisión anual)", value: has(ter) ? `${(ter * 100).toFixed(2)}%` : "N/D",
              tone: has(ter) ? (ter <= 0.002 ? "good" : ter <= 0.0045 ? "warn" : "bad") : "na",
              hint: "Se descuenta cada día. Al 0,20% pierdes ~2% por década solo en costes." },
            { label: "Patrimonio", value: bigS(m.aum),
              tone: has(m.aum) ? ((m.aum as number) >= 5e8 ? "good" : "warn") : "na",
              hint: "Fondos pequeños corren riesgo real de cierre." },
            { label: "Peso del top-10", value: pctS(m.top10Pct),
              tone: has(m.top10Pct) ? ((m.top10Pct as number) <= 25 ? "good" : (m.top10Pct as number) <= 50 ? "warn" : "bad") : "na",
              hint: "Si el top-10 pesa >50%, tu «diversificación» son unas pocas empresas." },
            { label: "P/E de la cesta", value: numS(m.underlyingPE, 1),
              tone: has(m.underlyingPE) ? ((m.underlyingPE as number) <= 18 ? "good" : (m.underlyingPE as number) <= 26 ? "warn" : "bad") : "na",
              hint: "Si la economía que compras está cara o barata por dentro." },
            { label: "Precio vs media 200", value: has(m.vsSma200) ? `${(m.vsSma200 as number) > 0 ? "+" : ""}${pctS(m.vsSma200)}` : "N/D",
              tone: has(m.vsSma200) ? ((m.vsSma200 as number) >= 0 && (m.vsSma200 as number) <= 15 ? "good" : "warn") : "na",
              hint: "Ligeramente por encima = tendencia sana. Muy por encima = extendido." },
        ];
    }

    // crypto
    return [
        { label: "Supply en circulación", value: pctS(m.supplyPct),
          tone: has(m.supplyPct) ? ((m.supplyPct as number) >= 80 ? "good" : "warn") : "na",
          hint: "Cuánto del máximo ya circula. Bajo = dilución futura pendiente." },
        { label: "FDV / Market cap", value: has(m.fdvMc) ? `${numS(m.fdvMc)}×` : "N/D",
          tone: has(m.fdvMc) ? ((m.fdvMc as number) <= 1.5 ? "good" : (m.fdvMc as number) <= 2.5 ? "warn" : "bad") : "na",
          hint: "Cuánta emisión futura pende sobre el precio." },
        { label: "Concentración top-10", value: pctS(m.top10Concentration),
          tone: has(m.top10Concentration) ? ((m.top10Concentration as number) < 40 ? "good" : "warn") : "na",
          hint: "Qué parte del supply controlan las 10 mayores carteras." },
        { label: "Transacciones/seg (real)", value: has(m.tps) ? numS(m.tps, 1) : "N/D",
          tone: has(m.tps) ? "good" : "na",
          hint: "Medido en vivo contra el nodo de la red, no lo que promete el marketing." },
        { label: "Desde máximo histórico", value: pctS(m.athChange),
          tone: has(m.athChange) ? ((m.athChange as number) <= -60 ? "good" : "warn") : "na",
          hint: "Descuento frente al máximo. En cripto, las caídas profundas son la norma." },
    ];
}

export const RECOMMENDATION_ES: Record<string, string> = {
    STRONG_BUY: "Compra fuerte",
    BUY: "Compra",
    HOLD: "Mantener",
    AVOID: "Evitar",
};
