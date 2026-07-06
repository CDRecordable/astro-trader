// ============================================================
// BetaAnalysis — market-sensitivity regression (single asset)
// ============================================================
// The time-series counterpart to the peer scatter: regress an asset's daily
// returns against a benchmark's (stocks → S&P 500, crypto → Bitcoin).
//   slope     → beta (systematic risk: >1 amplifies the market, <1 dampens)
//   R²        → how much of the asset's moves the benchmark explains
//   intercept → daily alpha (excess vs the benchmark, informational)
// BetaChart is the shared presentational core; the default export wires it to
// stock price history (/api/ticker). CryptoBetaAnalysis wires it to BTC.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useTranslations } from "next-intl";
import { Loader2, Info } from "lucide-react";
import { linearRegression } from "@/lib/stats";

export interface PricePoint { date: string; price: number }

const STOCK_BENCHMARK = "^GSPC";   // S&P 500
const MAX_DAYS = 504;              // ~2 trading years
const MIN_POINTS = 40;             // below this the beta is not trustworthy

/** Consecutive simple returns, dropping non-positive prices and data-error ticks. */
function toReturns(points: PricePoint[]): { date: string; ret: number }[] {
    const out: { date: string; ret: number }[] = [];
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1].price, cur = points[i].price;
        if (prev > 0 && cur > 0) {
            const ret = cur / prev - 1;
            if (Math.abs(ret) < 0.9) out.push({ date: points[i].date, ret }); // guard split/data glitches
        }
    }
    return out;
}

/** Align asset (→ y) and benchmark (→ x) returns by date, keep the last window. */
export function pairReturns(asset: PricePoint[], benchmark: PricePoint[]): { x: number; y: number }[] {
    const bench = new Map(toReturns(benchmark).map((r) => [r.date, r.ret]));
    const rows: { x: number; y: number }[] = [];
    for (const a of toReturns(asset)) {
        const bv = bench.get(a.date);
        if (bv !== undefined) rows.push({ x: bv, y: a.ret });
    }
    return rows.slice(-MAX_DAYS);
}

// ── Shared presentational core ────────────────────────────────

export function BetaChart({ paired, loading, error, ticker, benchName }: {
    paired: { x: number; y: number }[];
    loading: boolean;
    error: boolean;
    ticker: string;      // asset symbol (y-axis label)
    benchName: string;   // benchmark name, e.g. "S&P 500" / "Bitcoin"
}) {
    const t = useTranslations("companyDetail");

    const reg = useMemo(
        () => linearRegression(paired.map((p) => p.x), paired.map((p) => p.y)),
        [paired],
    );

    const option = useMemo(() => {
        if (!reg || paired.length < MIN_POINTS) return null;
        const xs = paired.map((p) => p.x);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
        return {
            backgroundColor: "transparent",
            grid: { top: 16, right: 18, bottom: 44, left: 66 },
            tooltip: {
                trigger: "item" as const,
                backgroundColor: "rgba(24,24,27,0.96)", borderColor: "rgba(255,255,255,0.08)",
                textStyle: { color: "#fafafa", fontSize: 12 },
                formatter: (p: { value?: [number, number] }) =>
                    p.value ? `${benchName}: ${pct(p.value[0])}<br/>${ticker}: ${pct(p.value[1])}` : "",
            },
            xAxis: {
                type: "value" as const, scale: true, name: t("betaAxisMarket", { bench: benchName }),
                nameLocation: "middle" as const, nameGap: 28, nameTextStyle: { color: "#a1a1aa", fontSize: 11 },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
                axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            },
            yAxis: {
                type: "value" as const, scale: true, name: t("betaAxisStock", { ticker }),
                nameLocation: "middle" as const, nameRotate: 90, nameGap: 46,
                nameTextStyle: { color: "#a1a1aa", fontSize: 11 },
                axisLine: { show: false },
                axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            },
            series: [
                {
                    type: "scatter", symbolSize: 5,
                    itemStyle: { color: "#22d3ee", opacity: 0.45 },
                    data: paired.map((p) => [p.x, p.y]),
                    markLine: {
                        silent: true, symbol: "none" as const,
                        lineStyle: { color: "rgba(255,255,255,0.14)", width: 1 },
                        label: { show: false },
                        data: [{ xAxis: 0 }, { yAxis: 0 }],
                    },
                },
                {
                    type: "line", silent: true, showSymbol: false, animation: false, z: 3,
                    data: [[x0, reg.slope * x0 + reg.intercept], [x1, reg.slope * x1 + reg.intercept]],
                    lineStyle: { color: "#fbbf24", width: 2 },
                },
            ],
        };
    }, [reg, paired, ticker, benchName, t]);

    if (loading) {
        return <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin" style={{ color: "var(--accent-cyan)" }} /></div>;
    }
    if (error || !reg || paired.length < MIN_POINTS || !option) {
        return <p className="text-[11px] py-4" style={{ color: "var(--text-muted)" }}>{t("betaUnavailable")}</p>;
    }

    const beta = reg.slope;
    const r2pct = Math.round(reg.r2 * 100);
    // Bands leave a dead-zone around 0 so a ~0 beta reads as "uncorrelated",
    // not "inverse hedge" (which only fits a clearly negative slope).
    const reading = beta < -0.15 ? t("betaInverse")
        : beta < 0.15 ? t("betaNeutral")
            : beta < 0.85 ? t("betaLow", { pct: Math.round((1 - beta) * 100) })
                : beta <= 1.15 ? t("betaMarket")
                    : t("betaHigh", { pct: Math.round((beta - 1) * 100) });

    const betaColor = beta > 1.15 ? "var(--signal-avoid)"
        : beta >= 0.15 && beta < 0.85 ? "var(--signal-strong-buy)"
            : "var(--accent-cyan)";

    return (
        <div>
            {/* Readout */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span>β <strong className="text-sm font-mono" style={{ color: betaColor }}>{beta.toFixed(2)}</strong></span>
                <span>· R² <strong style={{ color: reg.r2 >= 0.5 ? "var(--signal-strong-buy)" : reg.r2 >= 0.25 ? "var(--signal-hold)" : "var(--text-secondary)" }}>{reg.r2.toFixed(2)}</strong></span>
                <span>· {t("betaSample", { n: paired.length })}</span>
            </div>

            <div className="rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <ReactECharts option={option} style={{ height: 300 }} notMerge lazyUpdate />
            </div>

            {/* Interpretation */}
            <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--accent-cyan)" }} />
                <span>{reading} {t("betaR2", { r2: r2pct })}</span>
            </div>
        </div>
    );
}

// ── Stock wrapper: asset returns vs the S&P 500 ───────────────

export default function BetaAnalysis({ ticker }: { ticker: string }) {
    const [paired, setPaired] = useState<{ x: number; y: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to loading when the ticker changes
        setLoading(true);
        setError(false);
        Promise.all([
            fetch(`/api/ticker?symbol=${encodeURIComponent(ticker)}`).then((r) => r.json()),
            fetch(`/api/ticker?symbol=${encodeURIComponent(STOCK_BENCHMARK)}`).then((r) => r.json()),
        ])
            .then(([s, g]: [{ data?: PricePoint[] }, { data?: PricePoint[] }]) => {
                if (active) setPaired(pairReturns(s.data ?? [], g.data ?? []));
            })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [ticker]);

    return <BetaChart paired={paired} loading={loading} error={error} ticker={ticker} benchName="S&P 500" />;
}
