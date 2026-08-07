// ============================================================
// TechnicalChart — TradingView-style multi-pane candle chart
// ============================================================
// First candlestick + multi-grid ECharts in the repo. Four stacked panes
// (price / volume / RSI / MACD) sharing one x-axis, one crosshair and one
// zoom. Design goal: premium restraint — desaturated candles, 1px lines,
// transparent backgrounds, the app's tokens throughout.
//
// Indicators are ALWAYS computed over the full series (slicing first would
// corrupt the warm-up); timeframes only move the zoom window.
//
// Crypto candles are synthetic (no high/low), so the price pane honestly
// falls back to a close line instead of drawing invented wicks.

"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useTranslations } from "next-intl";
import { sma, ema, rsi, macd, bollinger, type Candle } from "@/lib/technical";

export interface OverlayState {
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    ema: boolean;      // EMA 12 + 26
    bollinger: boolean;
}

const DEFAULT_OVERLAYS: OverlayState = {
    sma20: false, sma50: true, sma200: true, ema: false, bollinger: false,
};

/** Timeframes move the zoom window only — bars, not recomputation. */
const TIMEFRAMES = [
    { key: "3M", bars: 63 },
    { key: "6M", bars: 126 },
    { key: "1Y", bars: 252 },
    { key: "2Y", bars: 504 },
    { key: "MAX", bars: Infinity },
] as const;
type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

// Muted palette over --bg-card: candles readable but never neon.
const UP = "rgba(52,211,153,0.75)";
const UP_BORDER = "#34d399";
const DOWN = "rgba(251,113,133,0.75)";
const DOWN_BORDER = "#fb7185";
const AXIS_COLOR = "#71717a";
const SPLIT_LINE = "rgba(255,255,255,0.05)";

const TOOLTIP_STYLE = {
    backgroundColor: "rgba(20,22,30,0.96)",
    borderColor: "rgba(255,255,255,0.1)",
    textStyle: { color: "#e5e7eb", fontSize: 11, fontFamily: "var(--font-jetbrains)" },
} as const;

function axis(gridIndex: number, showLabels: boolean) {
    return {
        type: "category" as const,
        gridIndex,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisTick: { show: false },
        axisLabel: showLabels ? { color: AXIS_COLOR, fontSize: 10 } : { show: false },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
    };
}

function valueAxis(gridIndex: number, opts?: { min?: number; max?: number; scale?: boolean }) {
    return {
        type: "value" as const,
        gridIndex,
        scale: opts?.scale ?? true,
        min: opts?.min,
        max: opts?.max,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: AXIS_COLOR, fontSize: 10, fontFamily: "var(--font-jetbrains)" },
        splitLine: { lineStyle: { color: SPLIT_LINE } },
    };
}

function thinLine(name: string, xAxisIndex: number, yAxisIndex: number, data: (number | null)[], color: string, width = 1) {
    return {
        name, type: "line" as const, xAxisIndex, yAxisIndex, data,
        showSymbol: false, connectNulls: false,
        lineStyle: { color, width }, itemStyle: { color },
        emphasis: { disabled: true }, sampling: "lttb" as const, z: 3,
    };
}

export default function TechnicalChart({ candles }: { candles: Candle[] }) {
    const t = useTranslations("technical");
    const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAYS);
    const [tf, setTf] = useState<TimeframeKey>("1Y");

    const hasOHLC = candles.length > 0 && candles.every((c) => c.high !== undefined && c.low !== undefined);
    const hasVolume = candles.length > 0 && candles.every((c) => c.volume !== undefined);

    const option = useMemo(() => {
        const n = candles.length;
        if (n === 0) return null;
        const dates = candles.map((c) => c.date);
        const closes = candles.map((c) => c.close);

        // Indicators over the FULL series (see header note).
        const s20 = sma(closes, 20), s50 = sma(closes, 50), s200 = sma(closes, 200);
        const e12 = ema(closes, 12), e26 = ema(closes, 26);
        const boll = bollinger(closes);
        const rsiS = rsi(closes);
        const m = macd(closes);

        // Zoom window from the timeframe.
        const bars = TIMEFRAMES.find((x) => x.key === tf)?.bars ?? 252;
        const startIdx = bars === Infinity ? 0 : Math.max(0, n - bars);

        // ── Pane layout ──
        // Volume pane collapses when there is no volume (pure-close series).
        const grids = hasVolume
            ? [
                { left: 64, right: 16, top: 8, height: "46%" },
                { left: 64, right: 16, top: "58%", height: "8%" },
                { left: 64, right: 16, top: "70%", height: "11%" },
                { left: 64, right: 16, top: "85%", height: "11%" },
            ]
            : [
                { left: 64, right: 16, top: 8, height: "52%" },
                { left: 64, right: 16, top: "66%", height: "13%" },
                { left: 64, right: 16, top: "83%", height: "13%" },
            ];
        // Grid indexes per pane (volume optional).
        const PRICE = 0;
        const VOL = hasVolume ? 1 : -1;
        const RSI_G = hasVolume ? 2 : 1;
        const MACD_G = hasVolume ? 3 : 2;
        const gridCount = grids.length;
        const allAxes = Array.from({ length: gridCount }, (_, i) => i);

        const xAxes = allAxes.map((g) => axis(g, g === gridCount - 1));
        const yAxes = [
            valueAxis(PRICE),
            ...(hasVolume ? [{ ...valueAxis(VOL), axisLabel: { show: false }, splitLine: { show: false } }] : []),
            valueAxis(RSI_G, { min: 0, max: 100, scale: false }),
            valueAxis(MACD_G),
        ];

        const series: object[] = [];

        // ── Price pane ──
        if (hasOHLC) {
            series.push({
                name: t("price"),
                type: "candlestick",
                xAxisIndex: PRICE, yAxisIndex: 0,
                data: candles.map((c) => [c.open ?? c.close, c.close, c.low as number, c.high as number]),
                itemStyle: {
                    color: UP, color0: DOWN,
                    borderColor: UP_BORDER, borderColor0: DOWN_BORDER,
                    borderWidth: 1,
                },
                emphasis: { disabled: true },
                z: 4,
            });
        } else {
            // Synthetic series (crypto): an honest close line, not fake candles.
            series.push({
                name: t("price"),
                type: "line",
                xAxisIndex: PRICE, yAxisIndex: 0,
                data: closes,
                showSymbol: false,
                lineStyle: { color: "#22d3ee", width: 1.6 },
                itemStyle: { color: "#22d3ee" },
                areaStyle: {
                    color: {
                        type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(34,211,238,0.16)" },
                            { offset: 1, color: "rgba(34,211,238,0.01)" },
                        ],
                    },
                },
                sampling: "lttb",
                z: 4,
            });
        }

        // ── Overlays ──
        if (overlays.bollinger) {
            // Band = upper line + lower line filled between (stacked trick is
            // brittle; a soft area under the upper bound reads cleanly enough).
            series.push(thinLine("BB+", PRICE, 0, boll.upper, "rgba(255,255,255,0.28)"));
            series.push(thinLine("BB-", PRICE, 0, boll.lower, "rgba(255,255,255,0.28)"));
            series.push(thinLine("BBm", PRICE, 0, boll.middle, "rgba(255,255,255,0.18)"));
        }
        if (overlays.sma20) series.push(thinLine("SMA 20", PRICE, 0, s20, "#a1a1aa"));
        if (overlays.sma50) series.push(thinLine("SMA 50", PRICE, 0, s50, "#22d3ee"));
        if (overlays.sma200) series.push(thinLine("SMA 200", PRICE, 0, s200, "#a78bfa", 1.4));
        if (overlays.ema) {
            series.push(thinLine("EMA 12", PRICE, 0, e12, "#fbbf24"));
            series.push(thinLine("EMA 26", PRICE, 0, e26, "#d97706"));
        }

        // ── Volume pane ──
        if (hasVolume && VOL >= 0) {
            series.push({
                name: t("volume"),
                type: "bar",
                xAxisIndex: VOL, yAxisIndex: VOL,
                data: candles.map((c, i) => ({
                    value: c.volume as number,
                    itemStyle: {
                        color: i > 0 && candles[i].close < candles[i - 1].close
                            ? "rgba(251,113,133,0.35)"
                            : "rgba(52,211,153,0.35)",
                    },
                })),
                barWidth: "60%",
                emphasis: { disabled: true },
            });
        }

        // ── RSI pane ──
        series.push({
            ...thinLine("RSI 14", RSI_G, hasVolume ? 2 : 1, rsiS, "#22d3ee", 1.2),
            markLine: {
                silent: true, symbol: "none",
                lineStyle: { color: "rgba(255,255,255,0.15)", type: "dashed", width: 1 },
                label: { color: AXIS_COLOR, fontSize: 9, fontFamily: "var(--font-jetbrains)" },
                data: [{ yAxis: 30 }, { yAxis: 70 }],
            },
        });

        // ── MACD pane ──
        series.push({
            name: "MACD hist",
            type: "bar",
            xAxisIndex: MACD_G, yAxisIndex: hasVolume ? 3 : 2,
            data: m.histogram.map((v) => ({
                value: v,
                itemStyle: { color: v !== null && v >= 0 ? "rgba(52,211,153,0.45)" : "rgba(251,113,133,0.45)" },
            })),
            barWidth: "60%",
            emphasis: { disabled: true },
        });
        series.push(thinLine("MACD", MACD_G, hasVolume ? 3 : 2, m.line, "#22d3ee", 1.1));
        series.push(thinLine("Señal", MACD_G, hasVolume ? 3 : 2, m.signal, "#fbbf24", 1.1));

        return {
            animation: false,
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "cross", lineStyle: { color: "rgba(255,255,255,0.2)" } },
                ...TOOLTIP_STYLE,
                confine: true,
            },
            axisPointer: { link: [{ xAxisIndex: "all" }] },
            grid: grids,
            xAxis: xAxes.map((a) => ({ ...a, data: dates })),
            yAxis: yAxes,
            dataZoom: [
                {
                    type: "inside",
                    xAxisIndex: allAxes,
                    startValue: startIdx,
                    endValue: n - 1,
                    minValueSpan: 20,
                },
                {
                    type: "slider",
                    xAxisIndex: allAxes,
                    startValue: startIdx,
                    endValue: n - 1,
                    bottom: 2,
                    height: 14,
                    borderColor: "transparent",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    fillerColor: "rgba(34,211,238,0.08)",
                    handleStyle: { color: "#27272a", borderColor: "#3f3f46" },
                    moveHandleStyle: { color: "#27272a" },
                    dataBackground: {
                        lineStyle: { color: "rgba(255,255,255,0.12)" },
                        areaStyle: { color: "rgba(255,255,255,0.04)" },
                    },
                    textStyle: { color: AXIS_COLOR, fontSize: 9 },
                },
            ],
            series,
        };
        // overlays/tf change rebuilds the option; candles identity is stable per fetch
    }, [candles, overlays, tf, hasOHLC, hasVolume, t]);

    if (!option) return null;

    const chip = (active: boolean) => ({
        background: active ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
        color: active ? "#fff" : "var(--text-muted)",
        border: "1px solid " + (active ? "transparent" : "var(--border-subtle)"),
    });

    return (
        <div>
            {/* Controls: timeframes left, overlays right — quiet chips. */}
            <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1">
                    {TIMEFRAMES.map((x) => (
                        <button
                            key={x.key}
                            onClick={() => setTf(x.key)}
                            className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer"
                            style={chip(tf === x.key)}
                        >
                            {x.key}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    {([
                        ["sma20", "SMA 20"],
                        ["sma50", "SMA 50"],
                        ["sma200", "SMA 200"],
                        ["ema", "EMA 12/26"],
                        ["bollinger", "Bollinger"],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setOverlays((o) => ({ ...o, [key]: !o[key] }))}
                            className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer"
                            style={chip(overlays[key])}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {!hasOHLC && (
                <p className="text-[10px] italic mb-2" style={{ color: "var(--text-muted)" }}>
                    {t("syntheticNote")}
                </p>
            )}

            <ReactECharts
                option={option}
                style={{ height: 560, width: "100%" }}
                notMerge
                lazyUpdate
                opts={{ renderer: "canvas" }}
            />
        </div>
    );
}
