// ============================================================
// Financial Charts - ECharts integration
// ============================================================

"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { Company } from "@/lib/types";

interface PriceChartProps {
    company: Company;
}

export function PriceChart({ company }: PriceChartProps) {
    const option = useMemo(() => ({
        backgroundColor: "transparent",
        grid: {
            top: 20,
            right: 16,
            bottom: 30,
            left: 50,
        },
        tooltip: {
            trigger: "axis" as const,
            backgroundColor: "rgba(24, 24, 27, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            textStyle: { color: "#fafafa", fontSize: 12 },
            formatter: (params: Array<{ name: string; value: number }>) => {
                const p = params[0];
                return `<strong>${p.name}</strong><br/>Price: $${p.value.toFixed(2)}`;
            },
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
            axisLabel: { color: "#71717a", fontSize: 10, formatter: "${value}" },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
        },
        series: [
            {
                type: "line",
                data: company.historicalData.map((d) => d.price),
                smooth: true,
                showSymbol: false,
                lineStyle: {
                    color: "#22d3ee",
                    width: 2,
                },
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
    }), [company.historicalData]);

    return (
        <ReactECharts
            option={option}
            style={{ height: 220 }}
            opts={{ renderer: "canvas" }}
        />
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
