// ============================================================
// MetricScatter — cross-sectional 2-metric comparison
// ============================================================
// Plots a whole scanned universe on two chosen metrics (X vs Y). Two lenses on
// the same cloud of companies:
//   · "regression" — OLS trend line + R² + n, labels the biggest outliers.
//        The line = how this group prices metric Y against metric X on average;
//        points off the line deviate from that peer trend.
//   · "quadrant"   — median split into 4 boxes, bubble size = market cap.
//        The corner where BOTH axes point the favourable way = the buy box.
// Read-only: clicking a point opens that company's detail (handled by parent).

"use client";

import React, { useCallback, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useTranslations } from "next-intl";
import type { Company, AlgorithmScore } from "@/lib/types";
import { linearRegression } from "@/lib/stats";
import { BarChart3, GitCommitHorizontal, Grid2x2, AlertTriangle } from "lucide-react";

interface Row { company: Company; score?: AlgorithmScore }

type Mode = "regression" | "quadrant";
type Preset = "stock" | "crypto";
type Kind = "percent" | "ratio" | "num2" | "money" | "score";
/** Which direction is "better" for value investing — drives quadrant labels. */
type GoodDir = "high" | "low" | "neutral";

interface MetricDef {
    key: string;
    kind: Kind;
    good: GoodDir;
    log?: boolean;
    get: (r: Row) => number | null;
}

// ── Net-income CAGR from the annual history (oldest → newest) ──
// Undefined when it crosses zero (a CAGR through a loss year is meaningless).
function niCagr(c: Company): number | null {
    const af = c.metrics.annualFinancials;
    if (!af || af.length < 2) return null;
    const first = af[0].netIncome;
    const last = af[af.length - 1].netIncome;
    const yrs = af.length - 1;
    if (first == null || last == null || first <= 0 || last <= 0) return null;
    return Math.pow(last / first, 1 / yrs) - 1;
}

const ok = (v: number | null | undefined): number | null =>
    typeof v === "number" && isFinite(v) ? v : null;

// Registry of everything plottable. Order = dropdown order.
const METRICS: MetricDef[] = [
    { key: "pe", kind: "ratio", good: "low", get: (r) => ok(r.company.metrics.peRatio) },
    { key: "fcfYield", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.fcfYield) },
    { key: "evFcfYield", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.evFcfYield) },
    { key: "bookToMarket", kind: "num2", good: "high", get: (r) => ok(r.company.metrics.bookToMarket) },
    { key: "ebitdaGrowth", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.ebitdaGrowth) },
    { key: "niGrowth", kind: "percent", good: "high", get: (r) => niCagr(r.company) },
    { key: "ebitMargin", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.ebitMargin) },
    { key: "grossMargin", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.grossMargin) },
    { key: "roe", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.roe) },
    { key: "roc", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.roc) },
    { key: "netDebtToEbitda", kind: "ratio", good: "low", get: (r) => ok(r.company.metrics.netDebtToEbitda) },
    { key: "marketCap", kind: "money", good: "neutral", log: true, get: (r) => ok(r.company.metrics.marketCap) },
    { key: "totalScore", kind: "score", good: "high", get: (r) => ok(r.score?.totalScore) },
    { key: "valuationScore", kind: "score", good: "high", get: (r) => ok(r.score?.valuationScore) },
    { key: "trendScore", kind: "score", good: "high", get: (r) => ok(r.score?.trendScore) },
    { key: "timingScore", kind: "score", good: "high", get: (r) => ok(r.score?.timingScore) },
];

// Crypto peers only expose size + momentum in bulk (the rich per-coin metrics
// aren't available for a whole category), so the crypto scatter is a
// size-vs-momentum map rather than valuation-vs-quality.
const CRYPTO_METRICS: MetricDef[] = [
    { key: "marketCap", kind: "money", good: "neutral", log: true, get: (r) => ok(r.company.metrics.marketCap) },
    { key: "cRet1m", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.oneMonthReturn) },
    { key: "cRet3m", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.threeMonthReturn) },
    { key: "cRet6m", kind: "percent", good: "high", get: (r) => ok(r.company.metrics.sixMonthReturn) },
];

const PRESETS: Record<Preset, { metrics: MetricDef[]; x: string; y: string; mode: Mode; colorByRec: boolean }> = {
    stock: { metrics: METRICS, x: "ebitdaGrowth", y: "pe", mode: "regression", colorByRec: true },
    crypto: { metrics: CRYPTO_METRICS, x: "marketCap", y: "cRet1m", mode: "quadrant", colorByRec: false },
};

const REC_COLOR: Record<AlgorithmScore["recommendation"], string> = {
    STRONG_BUY: "#34d399", BUY: "#22d3ee", HOLD: "#fbbf24", AVOID: "#fb7185",
};
const NEUTRAL_COLOR = "#22d3ee";

function fmt(v: number, kind: Kind): string {
    switch (kind) {
        case "percent": return `${(v * 100).toFixed(1)}%`;
        case "ratio": return `${v.toFixed(1)}×`;
        case "num2": return v.toFixed(2);
        case "score": return String(Math.round(v));
        case "money": {
            const a = Math.abs(v);
            if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}T`;
            if (a >= 1_000) return `$${(v / 1_000).toFixed(1)}B`;
            return `$${v.toFixed(0)}M`;
        }
    }
}
/** Compact formatter for axis ticks (integer %, no decimals). */
function fmtAxis(v: number, kind: Kind): string {
    if (kind === "percent") return `${(v * 100).toFixed(0)}%`;
    if (kind === "money") {
        const a = Math.abs(v);
        if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}T`;
        if (a >= 1_000) return `$${(v / 1_000).toFixed(0)}B`;
        return `$${v.toFixed(0)}M`;
    }
    return fmt(v, kind);
}

function median(xs: number[]): number {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

interface Pt { id: string; ticker: string; name: string; sector: string; rec: AlgorithmScore["recommendation"] | null; x: number; y: number; mcap: number }

export default function MetricScatter({ rows, onSelect, highlightId, hideSectorFilter, preset = "stock" }: {
    rows: Row[];
    /** Metric set + defaults: "stock" (valuation×quality) or "crypto" (size×momentum). */
    preset?: Preset;
    /** Click handler for a point. When omitted, points aren't clickable. */
    onSelect?: (companyId: string) => void;
    /** Company id to visually single out (ringed + always labelled) — the
     *  "you are here" marker when embedded in a single company's detail. */
    highlightId?: string;
    /** Hide the sector dropdown (peers are pre-filtered to one sector). */
    hideSectorFilter?: boolean;
}) {
    const t = useTranslations("screener");
    const mLabel = useCallback((key: string) => t(`metrics.${key}`), [t]);

    const cfg = PRESETS[preset];
    const metricList = cfg.metrics;
    const metricByKey = useMemo(() => new Map(metricList.map((m) => [m.key, m])), [metricList]);

    const [xKey, setXKey] = useState(cfg.x);
    const [yKey, setYKey] = useState(cfg.y);
    const [mode, setMode] = useState<Mode>(cfg.mode);
    const [sector, setSector] = useState("all");

    const xM = metricByKey.get(xKey)!;
    const yM = metricByKey.get(yKey)!;

    const sectors = useMemo(() => {
        const set = new Set<string>();
        for (const r of rows) if (r.company.sector) set.add(r.company.sector);
        return Array.from(set).sort();
    }, [rows]);

    // Build the point cloud: only rows with BOTH metrics present and in-sector.
    const pts = useMemo<Pt[]>(() => {
        const out: Pt[] = [];
        for (const r of rows) {
            if (sector !== "all" && r.company.sector !== sector) continue;
            const x = xM.get(r);
            const y = yM.get(r);
            if (x === null || y === null) continue;
            out.push({
                id: r.company.id, ticker: r.company.ticker, name: r.company.name,
                sector: r.company.sector, rec: r.score?.recommendation ?? null,
                x, y, mcap: r.company.metrics.marketCap,
            });
        }
        return out;
    }, [rows, sector, xM, yM]);

    const reg = useMemo(
        () => (mode === "regression" ? linearRegression(pts.map((p) => p.x), pts.map((p) => p.y)) : null),
        [pts, mode],
    );

    // Outliers = the 3 points furthest from the trend line (labelled on-chart).
    const outlierIds = useMemo(() => {
        if (!reg) return new Set<string>();
        const scored = pts.map((p) => ({ id: p.id, resid: Math.abs(p.y - (reg.slope * p.x + reg.intercept)) }));
        scored.sort((a, b) => b.resid - a.resid);
        return new Set(scored.slice(0, 3).map((s) => s.id));
    }, [pts, reg]);

    const medX = useMemo(() => median(pts.map((p) => p.x)), [pts]);
    const medY = useMemo(() => median(pts.map((p) => p.y)), [pts]);
    const maxMcap = useMemo(() => Math.max(1, ...pts.map((p) => p.mcap)), [pts]);

    const option = useMemo(() => {
        const quad = mode === "quadrant";
        const scatterData = pts.map((p) => {
            const isHi = p.id === highlightId;
            const baseSize = quad ? Math.max(7, Math.min(34, 7 + Math.sqrt(p.mcap / maxMcap) * 27)) : 11;
            const color = cfg.colorByRec && p.rec ? REC_COLOR[p.rec] : NEUTRAL_COLOR;
            return {
                value: [p.x, p.y],
                _p: p,
                symbolSize: isHi ? baseSize + 6 : baseSize,
                z: isHi ? 5 : 2,
                itemStyle: isHi
                    ? { color, opacity: 1, borderColor: "#fafafa", borderWidth: 2, shadowBlur: 10, shadowColor: color }
                    : { color, opacity: 0.82, borderColor: "rgba(0,0,0,0.35)", borderWidth: 0.5 },
                label: (isHi || outlierIds.has(p.id))
                    ? { show: true, formatter: p.ticker, position: "top" as const, color: isHi ? "#fafafa" : "#e4e4e7", fontSize: isHi ? 11 : 9, fontWeight: isHi ? 700 : 600 }
                    : { show: false },
            };
        });

        // Median cross-lines (quadrant) or nothing (regression uses its own line series).
        const markLine = quad ? {
            silent: true, symbol: "none" as const,
            lineStyle: { color: "rgba(255,255,255,0.18)", type: "dashed" as const, width: 1 },
            label: { show: false },
            data: [{ xAxis: medX }, { yAxis: medY }],
        } : undefined;

        const series: Record<string, unknown>[] = [{
            type: "scatter", data: scatterData, markLine, emphasis: { focus: "self" },
        }];

        // Regression trend line spanning the observed x-range.
        if (reg && pts.length >= 3) {
            const xs = pts.map((p) => p.x);
            const x0 = Math.min(...xs), x1 = Math.max(...xs);
            series.push({
                type: "line", silent: true, showSymbol: false, animation: false,
                data: [[x0, reg.slope * x0 + reg.intercept], [x1, reg.slope * x1 + reg.intercept]],
                lineStyle: { color: "#22d3ee", width: 1.6, type: "dashed" },
                z: 1,
            });
        }

        return {
            backgroundColor: "transparent",
            grid: { top: 18, right: 22, bottom: 46, left: 60 },
            tooltip: {
                trigger: "item" as const,
                backgroundColor: "rgba(24,24,27,0.96)",
                borderColor: "rgba(255,255,255,0.08)",
                textStyle: { color: "#fafafa", fontSize: 12 },
                formatter: (params: { data?: { _p?: Pt } }) => {
                    const p = params.data?._p;
                    if (!p) return "";
                    const resid = reg ? p.y - (reg.slope * p.x + reg.intercept) : null;
                    const residLine = resid !== null
                        ? `<br/><span style="color:#a1a1aa">${t("residual")}: </span><span style="color:${resid >= 0 ? "#fb7185" : "#34d399"}">${resid >= 0 ? "+" : ""}${fmt(resid, yM.kind)}</span>`
                        : "";
                    return `<strong>${p.ticker}</strong> <span style="color:#a1a1aa">${p.name}</span><br/>`
                        + `<span style="color:#a1a1aa">${mLabel(xKey)}: </span>${fmt(p.x, xM.kind)}<br/>`
                        + `<span style="color:#a1a1aa">${mLabel(yKey)}: </span>${fmt(p.y, yM.kind)}`
                        + residLine;
                },
            },
            xAxis: {
                type: (xM.log ? "log" : "value") as "log" | "value", scale: true, name: mLabel(xKey),
                nameLocation: "middle" as const, nameGap: 30, nameTextStyle: { color: "#a1a1aa", fontSize: 11 },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
                axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: number) => fmtAxis(v, xM.kind) },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            },
            yAxis: {
                type: (yM.log ? "log" : "value") as "log" | "value", scale: true, name: mLabel(yKey),
                nameTextStyle: { color: "#a1a1aa", fontSize: 11, align: "left" as const },
                axisLine: { show: false },
                axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: number) => fmtAxis(v, yM.kind) },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            },
            series,
        };
    }, [pts, mode, reg, outlierIds, medX, medY, maxMcap, xKey, yKey, xM, yM, mLabel, t, highlightId, cfg.colorByRec]);

    const onEvents = useMemo(() => ({
        click: (params: { data?: { _p?: Pt } }) => { const p = params.data?._p; if (p && onSelect) onSelect(p.id); },
    }), [onSelect]);

    // Corner quadrant labels — only meaningful when both axes have a "good" side.
    const cornerLabels = useMemo(() => {
        if (mode !== "quadrant" || xM.good === "neutral" || yM.good === "neutral" || pts.length < 3) return null;
        const xGoodRight = xM.good === "high";
        const yGoodTop = yM.good === "high";
        // position → is this the buy box?
        const cell = (isXRight: boolean, isYTop: boolean) => (isXRight === xGoodRight && isYTop === yGoodTop)
            ? { txt: t("quadrantBuy"), attractive: true }
            : (isXRight !== xGoodRight && isYTop !== yGoodTop)
                ? { txt: t("quadrantAvoid"), attractive: false }
                : { txt: t("quadrantMixed"), attractive: false };
        return {
            tl: cell(false, true), tr: cell(true, true),
            bl: cell(false, false), br: cell(true, false),
        };
    }, [mode, xM.good, yM.good, pts.length, t]);

    const smallSample = pts.length < 8;

    const selectCls = "text-xs rounded-lg px-2.5 py-1.5 cursor-pointer outline-none";
    const selectStyle: React.CSSProperties = { background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" };

    return (
        <div>
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <label className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("axisX")}</label>
                <select className={selectCls} style={selectStyle} value={xKey} onChange={(e) => setXKey(e.target.value)}>
                    {metricList.map((m) => <option key={m.key} value={m.key}>{mLabel(m.key)}</option>)}
                </select>
                <label className="text-[11px] ml-1" style={{ color: "var(--text-muted)" }}>{t("axisY")}</label>
                <select className={selectCls} style={selectStyle} value={yKey} onChange={(e) => setYKey(e.target.value)}>
                    {metricList.map((m) => <option key={m.key} value={m.key}>{mLabel(m.key)}</option>)}
                </select>

                {!hideSectorFilter && (
                    <>
                        <span className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />
                        <select className={selectCls} style={selectStyle} value={sector} onChange={(e) => setSector(e.target.value)}>
                            <option value="all">{t("allSectors")}</option>
                            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </>
                )}

                <span className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />

                {/* Mode toggle */}
                {([["regression", GitCommitHorizontal, t("modeRegression")], ["quadrant", Grid2x2, t("modeQuadrant")]] as const).map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setMode(id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                        style={{
                            background: mode === id ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                            color: mode === id ? "white" : "var(--text-muted)",
                            border: "1px solid var(--border-subtle)",
                        }}>
                        <Icon size={13} /> {label}
                    </button>
                ))}
            </div>

            {pts.length < 3 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                    <BarChart3 size={28} style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("scatterEmpty")}</p>
                    <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>{t("scatterEmptyDesc")}</p>
                </div>
            ) : (
                <>
                    {/* Readout bar */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        <span>{t("plotted", { n: pts.length })}</span>
                        {mode === "regression" && reg && (
                            <>
                                <span>· R² <strong style={{ color: reg.r2 >= 0.5 ? "var(--signal-strong-buy)" : reg.r2 >= 0.25 ? "var(--signal-hold)" : "var(--signal-avoid)" }}>{reg.r2.toFixed(3)}</strong></span>
                                <span>· r {reg.r.toFixed(2)}</span>
                                <span className="font-mono">· y = {reg.slope.toFixed(2)}x {reg.intercept >= 0 ? "+" : "−"} {Math.abs(reg.intercept).toFixed(2)}</span>
                            </>
                        )}
                    </div>

                    {/* Chart + quadrant corner overlays */}
                    <div className="relative" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
                        <ReactECharts option={option} onEvents={onEvents} style={{ height: 440 }} notMerge lazyUpdate />
                        {cornerLabels && (
                            <div className="absolute inset-0 pointer-events-none" style={{ padding: "26px 30px 52px 66px" }}>
                                {([["tl", "top-2 left-2 text-left"], ["tr", "top-2 right-2 text-right"], ["bl", "bottom-2 left-2 text-left"], ["br", "bottom-2 right-2 text-right"]] as const).map(([pos, cls]) => {
                                    const c = cornerLabels[pos];
                                    return (
                                        <span key={pos}
                                            className={`absolute ${cls} text-[10px] font-semibold px-1.5 py-0.5 rounded`}
                                            style={{
                                                color: c.attractive ? "var(--signal-strong-buy)" : "var(--text-muted)",
                                                background: c.attractive ? "rgba(52,211,153,0.10)" : "transparent",
                                                border: c.attractive ? "1px solid rgba(52,211,153,0.3)" : "1px solid transparent",
                                            }}>
                                            {c.attractive ? "★ " : ""}{c.txt}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footnotes */}
                    <div className="mt-2 space-y-1">
                        {mode === "regression" && (
                            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("regressionHint")}</p>
                        )}
                        {mode === "quadrant" && (
                            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("quadrantHint")}</p>
                        )}
                        {sector === "all" && !hideSectorFilter && (
                            <p className="text-[10px] leading-relaxed flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                <AlertTriangle size={11} /> {t("mixedSectorsNote")}
                            </p>
                        )}
                        {smallSample && (
                            <p className="text-[10px] leading-relaxed flex items-center gap-1" style={{ color: "var(--signal-hold)" }}>
                                <AlertTriangle size={11} /> {t("smallSampleNote", { n: pts.length })}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
