// ============================================================
// Financial Charts - ECharts integration
// ============================================================

"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Loader2 } from "lucide-react";
import type { Company } from "@/lib/types";

interface PriceChartProps {
    company: Company;
}

interface PricePoint { date: string; price: number }

// Timeframe options (months; 0 = all history)
const RANGES: { key: string; label: string; months: number }[] = [
    { key: "1M", label: "1M", months: 1 },
    { key: "6M", label: "6M", months: 6 },
    { key: "1Y", label: "1A", months: 12 },
    { key: "3Y", label: "3A", months: 36 },
    { key: "5Y", label: "5A", months: 60 },
    { key: "MAX", label: "Máx", months: 0 },
];

export function PriceChart({ company }: PriceChartProps) {
    const [full, setFull] = useState<PricePoint[]>([]);
    const [range, setRange] = useState("1Y");
    const [loading, setLoading] = useState(true);

    // Fetch the full daily price history (since 2000) once per ticker.
    useEffect(() => {
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to loading when the ticker changes
        setLoading(true);
        fetch(`/api/ticker?symbol=${encodeURIComponent(company.ticker)}`)
            .then((r) => (r.ok ? r.json() : { data: [] }))
            .then((d: { data?: PricePoint[] }) => {
                if (!active) return;
                const data = d.data && d.data.length > 0
                    ? d.data
                    : company.historicalData.map((h) => ({ date: h.date, price: h.price }));
                setFull(data);
            })
            .catch(() => {
                if (active) setFull(company.historicalData.map((h) => ({ date: h.date, price: h.price })));
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [company.ticker, company.historicalData]);

    // Filter to the selected range, using the latest data point as "now"
    // (deterministic — avoids reading the clock during render).
    const filtered = useMemo(() => {
        if (full.length === 0) return [];
        const months = RANGES.find((r) => r.key === range)?.months ?? 12;
        if (months === 0) return full;
        const last = new Date(full[full.length - 1].date);
        const cutoff = new Date(last);
        cutoff.setMonth(cutoff.getMonth() - months);
        const cut = cutoff.toISOString().split("T")[0];
        return full.filter((p) => p.date >= cut);
    }, [full, range]);

    const option = useMemo(() => ({
        backgroundColor: "transparent",
        grid: { top: 20, right: 16, bottom: 30, left: 55 },
        tooltip: {
            trigger: "axis" as const,
            backgroundColor: "rgba(24, 24, 27, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            textStyle: { color: "#fafafa", fontSize: 12 },
            formatter: (params: Array<{ name: string; value: number }>) => {
                const p = params[0];
                return `<strong>${p.name}</strong><br/>Precio: $${Number(p.value).toFixed(2)}`;
            },
        },
        xAxis: {
            type: "category" as const,
            data: filtered.map((d) => d.date),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            axisLabel: { color: "#71717a", fontSize: 10, hideOverlap: true },
            splitLine: { show: false },
        },
        yAxis: {
            type: "value" as const,
            scale: true,
            axisLine: { show: false },
            axisLabel: { color: "#71717a", fontSize: 10, formatter: "${value}" },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
        },
        series: [
            {
                type: "line",
                data: filtered.map((d) => d.price),
                smooth: false,
                showSymbol: false,
                sampling: "lttb" as const,
                lineStyle: { color: "#22d3ee", width: 1.8 },
                areaStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(34, 211, 238, 0.25)" },
                            { offset: 1, color: "rgba(34, 211, 238, 0.02)" },
                        ],
                    },
                },
            },
        ],
    }), [filtered]);

    return (
        <div>
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 mb-2">
                {RANGES.map((r) => (
                    <button
                        key={r.key}
                        onClick={() => setRange(r.key)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all"
                        style={{
                            background: range === r.key ? "var(--accent-cyan-dim)" : "transparent",
                            color: range === r.key ? "white" : "var(--text-muted)",
                            border: `1px solid ${range === r.key ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                        }}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {loading && full.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: 220 }}>
                    <Loader2 size={22} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center text-xs" style={{ height: 220, color: "var(--text-muted)" }}>
                    Sin datos de precio
                </div>
            ) : (
                <ReactECharts option={option} style={{ height: 220 }} opts={{ renderer: "canvas" }} />
            )}
        </div>
    );
}

interface MarginChartProps {
    company: Company;
}

export function MarginChart({ company }: MarginChartProps) {
    const option = useMemo(() => ({
        backgroundColor: "transparent",
        grid: {
            top: 30,
            right: 16,
            bottom: 30,
            left: 50,
        },
        legend: {
            data: ["EBIT Margin", "Gross Margin"],
            textStyle: { color: "#a1a1aa", fontSize: 11 },
            top: 0,
            left: "center",
        },
        tooltip: {
            trigger: "axis" as const,
            backgroundColor: "rgba(24, 24, 27, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            textStyle: { color: "#fafafa", fontSize: 12 },
        },
        xAxis: {
            type: "category" as const,
            data: company.historicalData.map((d) => d.date),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            axisLabel: { color: "#71717a", fontSize: 10, rotate: 45 },
            splitLine: { show: false },
        },
        yAxis: {
            type: "value" as const,
            axisLine: { show: false },
            axisLabel: {
                color: "#71717a",
                fontSize: 10,
                formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
            },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
        },
        series: [
            {
                name: "EBIT Margin",
                type: "line",
                data: company.historicalData.map((d) => d.ebitMargin),
                smooth: true,
                showSymbol: false,
                lineStyle: { color: "#a78bfa", width: 2 },
            },
            {
                name: "Gross Margin",
                type: "line",
                data: company.historicalData.map((d) => d.grossMargin),
                smooth: true,
                showSymbol: false,
                lineStyle: { color: "#34d399", width: 2 },
            },
        ],
    }), [company.historicalData]);

    return (
        <ReactECharts
            option={option}
            style={{ height: 220 }}
            opts={{ renderer: "canvas" }}
        />
    );
}

interface ReturnChartProps {
    company: Company;
}

export function ReturnChart({ company }: ReturnChartProps) {
    const option = useMemo(() => ({
        backgroundColor: "transparent",
        grid: {
            top: 30,
            right: 16,
            bottom: 30,
            left: 50,
        },
        legend: {
            data: ["ROE", "ROC"],
            textStyle: { color: "#a1a1aa", fontSize: 11 },
            top: 0,
            left: "center",
        },
        tooltip: {
            trigger: "axis" as const,
            backgroundColor: "rgba(24, 24, 27, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            textStyle: { color: "#fafafa", fontSize: 12 },
        },
        xAxis: {
            type: "category" as const,
            data: company.historicalData.map((d) => d.date),
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            axisLabel: { color: "#71717a", fontSize: 10, rotate: 45 },
            splitLine: { show: false },
        },
        yAxis: {
            type: "value" as const,
            axisLine: { show: false },
            axisLabel: {
                color: "#71717a",
                fontSize: 10,
                formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
            },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
        },
        series: [
            {
                name: "ROE",
                type: "line",
                data: company.historicalData.map((d) => d.roe),
                smooth: true,
                showSymbol: false,
                lineStyle: { color: "#fbbf24", width: 2 },
            },
            {
                name: "ROC",
                type: "line",
                data: company.historicalData.map((d) => d.roc),
                smooth: true,
                showSymbol: false,
                lineStyle: { color: "#fb7185", width: 2 },
            },
        ],
    }), [company.historicalData]);

    return (
        <ReactECharts
            option={option}
            style={{ height: 220 }}
            opts={{ renderer: "canvas" }}
        />
    );
}

interface ScoreBreakdownChartProps {
    valuationScore: number;
    trendScore: number;
    timingScore: number;
}

export function ScoreBreakdownChart({
    valuationScore,
    trendScore,
    timingScore,
}: ScoreBreakdownChartProps) {
    const option = useMemo(() => ({
        backgroundColor: "transparent",
        radar: {
            indicator: [
                { name: "Valuation", max: 100 },
                { name: "Trend", max: 100 },
                { name: "Timing", max: 100 },
            ],
            axisName: {
                color: "#a1a1aa",
                fontSize: 11,
            },
            splitArea: {
                areaStyle: {
                    color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"],
                },
            },
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        },
        series: [
            {
                type: "radar",
                data: [
                    {
                        value: [valuationScore, trendScore, timingScore],
                        areaStyle: {
                            color: "rgba(34, 211, 238, 0.15)",
                        },
                        lineStyle: {
                            color: "#22d3ee",
                            width: 2,
                        },
                        itemStyle: {
                            color: "#22d3ee",
                        },
                    },
                ],
            },
        ],
    }), [valuationScore, trendScore, timingScore]);

    return (
        <ReactECharts
            option={option}
            style={{ height: 260 }}
            opts={{ renderer: "canvas" }}
        />
    );
}
