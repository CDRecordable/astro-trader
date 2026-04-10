// ============================================================
// SolarActivityView — Sunspot Cycle Analysis
// Compares daily returns during solar max vs solar min regimes
// ============================================================

"use client";

import React, { useState, useMemo, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import Header from "./Header";
import { motion } from "framer-motion";
import { Sun, BookOpen, Info, Calendar, Activity, ChevronDown } from "lucide-react";
import { MONTHLY_SUNSPOT_DATA, getSunspotNumber, getSolarCyclePhase, classifySolarDay, SOLAR_THRESHOLDS, getSolarTimeline } from "@/lib/solar-data";
import { OVERLAY_INDICES, type OverlayIndex } from "@/lib/overlay-indices";
import { useTranslations } from "next-intl";

// ── Types ────────────────────────────────────────────────────
interface DailyPrice { date: string; price: number; }

interface RegimeStats {
    avgReturn: number;
    medianReturn: number;
    totalDays: number;
    positiveDays: number;
    negativePct: number;
    stdDev: number;
    annualizedReturn: number;
    cumulativeReturn: number;
}

// ── Helpers ──────────────────────────────────────────────────
function computeStats(returns: number[]): RegimeStats {
    if (returns.length === 0) return { avgReturn: 0, medianReturn: 0, totalDays: 0, positiveDays: 0, negativePct: 0, stdDev: 0, annualizedReturn: 0, cumulativeReturn: 0 };

    const sorted = [...returns].sort((a, b) => a - b);
    const sum = returns.reduce((a, b) => a + b, 0);
    const avg = sum / returns.length;
    const median = returns.length % 2 === 0
        ? (sorted[returns.length / 2 - 1] + sorted[returns.length / 2]) / 2
        : sorted[Math.floor(returns.length / 2)];
    const variance = returns.reduce((a, r) => a + Math.pow(r - avg, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const positiveDays = returns.filter(r => r > 0).length;
    const negativeDays = returns.filter(r => r < 0).length;

    // Annualize: compound daily mean across 252 trading days
    const dailyMean = avg / 100;
    const annualized = (Math.pow(1 + dailyMean, 252) - 1) * 100;

    // Cumulative return
    let cumulative = 1;
    returns.forEach(r => { cumulative *= (1 + r / 100); });

    return {
        avgReturn: avg,
        medianReturn: median,
        totalDays: returns.length,
        positiveDays,
        negativePct: (negativeDays / returns.length) * 100,
        stdDev,
        annualizedReturn: annualized,
        cumulativeReturn: (cumulative - 1) * 100,
    };
}

// ── Component ────────────────────────────────────────────────
export default function SolarActivityView() {
    const t = useTranslations("solarActivity");
    const [allData, setAllData] = useState<Record<string, DailyPrice[]>>({});
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState<OverlayIndex>(OVERLAY_INDICES[0]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch("/api/macro-daily")
            .then((r) => r.json())
            .then((data) => {
                const result: Record<string, DailyPrice[]> = {};
                for (const idx of OVERLAY_INDICES) {
                    if (data[idx.key]?.length) result[idx.key] = data[idx.key];
                }
                setAllData(result);
                setLoading(false);
            })
            .catch((e) => { console.error("Failed to fetch daily data", e); setLoading(false); });
    }, []);

    const selectedData = allData[selectedIndex.key] || [];
    // Keep sp500 + btc refs for regime cards
    const dailySp500 = allData["sp500"] || [];
    const dailyBtc = allData["btc"] || [];

    const currentSSN = getSunspotNumber(new Date());
    const currentPhase = getSolarCyclePhase(new Date());
    const phaseLabels: Record<string, string> = {
        minimum: "Solar Minimum",
        ascending: "Ascending Phase",
        maximum: "Solar Maximum",
        descending: "Descending Phase",
    };
    const phaseColors: Record<string, string> = {
        minimum: "#22c55e",
        ascending: "#3b82f6",
        maximum: "#ef4444",
        descending: "#eab308",
    };

    // ── Regime analysis: daily returns during solar min vs max ──
    const solarAnalysis = useMemo(() => {
        const analyze = (prices: DailyPrice[]) => {
            if (prices.length < 30) return null;

            const minReturns: number[] = [];
            const modReturns: number[] = [];
            const maxReturns: number[] = [];

            for (let i = 1; i < prices.length; i++) {
                const prevPrice = prices[i - 1].price;
                const curPrice = prices[i].price;
                if (prevPrice <= 0) continue;

                const dailyReturn = ((curPrice - prevPrice) / prevPrice) * 100;
                const date = new Date(prices[i].date);
                const regime = classifySolarDay(date);

                if (regime === "minimum") minReturns.push(dailyReturn);
                else if (regime === "maximum") maxReturns.push(dailyReturn);
                else modReturns.push(dailyReturn);
            }

            const minStats = computeStats(minReturns);
            const modStats = computeStats(modReturns);
            const maxStats = computeStats(maxReturns);

            return {
                min: minStats,
                mod: modStats,
                max: maxStats,
                yieldGap: minStats.annualizedReturn - maxStats.annualizedReturn,
            };
        };

        return analyze(selectedData);
    }, [selectedData]);

    // ── Chart: SSN timeline with high-activity shading ───────
    const chartOptions = useMemo(() => {
        if (selectedData.length === 0) return null;

        const timeline = getSolarTimeline(2000, 2026);
        const ssnDates = timeline.map(d => d.date);
        const ssnValues = timeline.map(d => d.ssn);

        // Map selected index data to monthly (downsample)
        const overlayMonthly: { date: string; price: number }[] = [];
        const dateMap = new Map(selectedData.map(d => [d.date, d.price]));
        for (const d of ssnDates) {
            const price = dateMap.get(d);
            if (price) {
                overlayMonthly.push({ date: d, price });
            } else {
                // Find nearest date
                const target = new Date(d).getTime();
                let nearest = selectedData[0];
                for (const sp of selectedData) {
                    if (Math.abs(new Date(sp.date).getTime() - target) < Math.abs(new Date(nearest.date).getTime() - target)) {
                        nearest = sp;
                    }
                }
                overlayMonthly.push({ date: d, price: nearest.price });
            }
        }

        // Build markArea for high-SSN zones (SSN > 120)
        const markAreas: [{ xAxis: string }, { xAxis: string }][] = [];
        let inHighZone = false;
        let zoneStart = "";
        for (let i = 0; i < ssnDates.length; i++) {
            if (ssnValues[i] > SOLAR_THRESHOLDS.high && !inHighZone) {
                inHighZone = true;
                zoneStart = ssnDates[i];
            } else if (ssnValues[i] <= SOLAR_THRESHOLDS.high && inHighZone) {
                inHighZone = false;
                markAreas.push([{ xAxis: zoneStart }, { xAxis: ssnDates[i] }]);
            }
        }
        if (inHighZone) markAreas.push([{ xAxis: zoneStart }, { xAxis: ssnDates[ssnDates.length - 1] }]);

        return {
            backgroundColor: "transparent",
            grid: { left: 55, right: 55, top: 40, bottom: 60 },
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "rgba(15, 15, 20, 0.95)",
                borderColor: "rgba(255,255,255,0.08)",
                textStyle: { color: "#e4e4e7", fontSize: 11 },
                formatter: (params: any) => {
                    const date = params[0]?.axisValue ?? "";
                    let html = `<div style="font-weight:600;margin-bottom:4px">${date}</div>`;
                    for (const p of params) {
                        const val = typeof p.value === "number" ? p.value.toFixed(1) : p.value;
                        html += `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>${p.seriesName}: <b>${val}</b></div>`;
                    }
                    return html;
                },
            },
            xAxis: {
                type: "category" as const,
                data: ssnDates,
                axisLabel: {
                    color: "#71717a",
                    fontSize: 10,
                    formatter: (v: string) => new Date(v).getFullYear().toString(),
                    interval: 11, // yearly
                },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
            },
            yAxis: [
                {
                    type: "value" as const,
                    name: "Sunspot Number",
                    nameTextStyle: { color: "#71717a", fontSize: 10 },
                    axisLabel: { color: "#71717a", fontSize: 10 },
                    splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
                },
                {
                    type: "value" as const,
                    name: selectedIndex.label,
                    nameTextStyle: { color: selectedIndex.color, fontSize: 10 },
                    axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString() },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: "Sunspot Number",
                    type: "line",
                    data: ssnValues,
                    smooth: true,
                    lineStyle: { width: 2, color: "#f59e0b" },
                    areaStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "rgba(245, 158, 11, 0.25)" },
                                { offset: 1, color: "rgba(245, 158, 11, 0.02)" },
                            ],
                        },
                    },
                    symbol: "none",
                    markArea: {
                        silent: true,
                        data: markAreas.map(([start, end]) => ([
                            { ...start, itemStyle: { color: "rgba(239, 68, 68, 0.08)" } },
                            end,
                        ])),
                    },
                    markLine: {
                        silent: true,
                        symbol: "none",
                        data: [
                            { yAxis: SOLAR_THRESHOLDS.high, lineStyle: { color: "rgba(239, 68, 68, 0.3)", type: "dashed" }, label: { formatter: `High (${SOLAR_THRESHOLDS.high})`, color: "#ef4444", fontSize: 9, position: "end" as const } },
                            { yAxis: SOLAR_THRESHOLDS.low, lineStyle: { color: "rgba(34, 197, 94, 0.3)", type: "dashed" }, label: { formatter: `Low (${SOLAR_THRESHOLDS.low})`, color: "#22c55e", fontSize: 9, position: "end" as const } },
                        ],
                    },
                },
                {
                    name: selectedIndex.label,
                    type: "line",
                    yAxisIndex: 1,
                    data: overlayMonthly.map(d => d.price),
                    smooth: true,
                    lineStyle: { width: 1.5, color: selectedIndex.color, opacity: 0.6 },
                    symbol: "none",
                },
            ],
            dataZoom: [
                {
                    type: "slider",
                    bottom: 10,
                    height: 20,
                    borderColor: "rgba(255,255,255,0.05)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    fillerColor: "rgba(245, 158, 11, 0.08)",
                    handleStyle: { color: "#f59e0b" },
                    textStyle: { color: "#71717a", fontSize: 10 },
                },
            ],
        };
    }, [selectedData, selectedIndex]);

    // ── Solar cycle milestones ────────────────────────────────
    const cycleHistory = useMemo(() => ([
        { label: "Cycle 23 Maximum", date: "Apr 2000", ssn: "~170", phase: "maximum" },
        { label: "Cycle 23/24 Minimum", date: "Dec 2008", ssn: "~1", phase: "minimum" },
        { label: "Cycle 24 Maximum", date: "Apr 2014", ssn: "~102", phase: "maximum" },
        { label: "Cycle 24/25 Minimum", date: "Dec 2019", ssn: "~0.5", phase: "minimum" },
        { label: "Cycle 25 Maximum", date: "Mid 2024", ssn: "~215", phase: "maximum" },
    ]), []);

    // ── Regime Card ─────────────────────────────────────────
    const RegimeCard = ({ label, data }: { label: string; data: { min: RegimeStats; mod: RegimeStats; max: RegimeStats; yieldGap: number } }) => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/5 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(245, 158, 11, 0.04)" }}>
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className="text-[10px] text-zinc-400">{t("dailyReturns")}</span>
            </div>

            {/* Three-way comparison */}
            <div className="grid grid-cols-3 divide-x divide-white/5">
                {/* Solar Minimum */}
                <div className="p-4 text-center">
                    <div className="text-lg mb-1">☀️</div>
                    <div className="text-[9px] uppercase tracking-widest text-emerald-400/70 mb-2 font-semibold">{t("solarMin")}</div>
                    <div className={`text-xl font-bold ${data.min.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.min.annualizedReturn >= 0 ? "+" : ""}{data.min.annualizedReturn.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                    <div className="text-[10px] text-zinc-400 mt-2">{data.min.totalDays.toLocaleString()} {t("tradingDays")}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">SSN &lt; {SOLAR_THRESHOLDS.low}</div>
                </div>

                {/* Moderate */}
                <div className="p-4 text-center">
                    <div className="text-lg mb-1">🌤</div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-400/70 mb-2 font-semibold">{t("solarMid")}</div>
                    <div className={`text-xl font-bold ${data.mod.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.mod.annualizedReturn >= 0 ? "+" : ""}{data.mod.annualizedReturn.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                    <div className="text-[10px] text-zinc-400 mt-2">{data.mod.totalDays.toLocaleString()} {t("tradingDays")}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">SSN {SOLAR_THRESHOLDS.low}–{SOLAR_THRESHOLDS.high}</div>
                </div>

                {/* Solar Maximum */}
                <div className="p-4 text-center">
                    <div className="text-lg mb-1">🔥</div>
                    <div className="text-[9px] uppercase tracking-widest text-red-400/70 mb-2 font-semibold">{t("solarMax")}</div>
                    <div className={`text-xl font-bold ${data.max.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.max.annualizedReturn >= 0 ? "+" : ""}{data.max.annualizedReturn.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                    <div className="text-[10px] text-zinc-400 mt-2">{data.max.totalDays.toLocaleString()} {t("tradingDays")}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">SSN &gt; {SOLAR_THRESHOLDS.high}</div>
                </div>
            </div>

            {/* Detailed metrics */}
            <div className="px-4 py-3 border-t border-white/5 space-y-1.5 text-[11px]">
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2 font-semibold">{t("detailedComparison")}</div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">{t("avgDailyReturn")}</span>
                    <div className="flex gap-3">
                        <span className="text-emerald-300 font-mono">{data.min.avgReturn >= 0 ? "+" : ""}{data.min.avgReturn.toFixed(4)}%</span>
                        <span className="text-amber-300 font-mono">{data.mod.avgReturn >= 0 ? "+" : ""}{data.mod.avgReturn.toFixed(4)}%</span>
                        <span className="text-red-300 font-mono">{data.max.avgReturn >= 0 ? "+" : ""}{data.max.avgReturn.toFixed(4)}%</span>
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">{t("volatility")}</span>
                    <div className="flex gap-3">
                        <span className="text-emerald-300 font-mono">{data.min.stdDev.toFixed(4)}%</span>
                        <span className="text-amber-300 font-mono">{data.mod.stdDev.toFixed(4)}%</span>
                        <span className="text-red-300 font-mono">{data.max.stdDev.toFixed(4)}%</span>
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">Negative days %</span>
                    <div className="flex gap-3">
                        <span className="text-emerald-300 font-mono">{data.min.negativePct.toFixed(1)}%</span>
                        <span className="text-amber-300 font-mono">{data.mod.negativePct.toFixed(1)}%</span>
                        <span className="text-red-300 font-mono">{data.max.negativePct.toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* Yield gap */}
            <div className="px-4 py-3 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500"><span className="font-semibold text-zinc-400">{t("yieldGap")}:</span></span>
                    <span className={`text-lg font-bold ${data.yieldGap > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.yieldGap > 0 ? "+" : ""}{data.yieldGap.toFixed(2)}%<span className="text-xs text-zinc-500">/yr</span>
                    </span>
                </div>
                <div className="text-[9px] text-zinc-600 mt-1">
                    {data.yieldGap > 0 ? "Solar minimum periods outperform solar maximum" : "Solar maximum periods outperform solar minimum"} on an annualized basis
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen">
            <Header />
            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                            <Sun size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">{t("title")}</h1>
                            <p className="text-xs text-zinc-500">{t("subtitle")}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Status Banner */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="glass-card p-4 mb-6 flex items-center gap-4"
                    style={{ borderLeft: `3px solid ${phaseColors[currentPhase]}` }}
                >
                    <div className="text-2xl">☀️</div>
                    <div>
                        <div className="text-sm font-semibold" style={{ color: phaseColors[currentPhase] }}>
                            {phaseLabels[currentPhase]} — SSN {currentSSN.toFixed(1)}
                        </div>
                        <div className="text-xs text-zinc-500">
                            Cycle 25 is currently near its peak. Sunspot numbers above {SOLAR_THRESHOLDS.high} indicate solar maximum regime.
                        </div>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-2xl font-bold text-amber-400">{currentSSN.toFixed(0)}</div>
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">SSN</div>
                    </div>
                </motion.div>

                {/* Chart — full width */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t("solarRegimeBands")}</h3>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-3 h-0.5 rounded-sm" style={{ background: "#f59e0b" }} />{t("ssn")}
                            </span>
                            {/* Index Selector Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.03] transition-all cursor-pointer"
                                >
                                    <span className="inline-block w-3 h-0.5 rounded-sm" style={{ background: selectedIndex.color }} />
                                    <span className="text-zinc-300 font-medium">{selectedIndex.label}</span>
                                    <ChevronDown size={10} className={`text-zinc-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl min-w-[160px]">
                                        {OVERLAY_INDICES.map(idx => (
                                            <button
                                                key={idx.key}
                                                onClick={() => { setSelectedIndex(idx); setDropdownOpen(false); }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors ${selectedIndex.key === idx.key ? "bg-white/[0.04]" : ""
                                                    }`}
                                            >
                                                <span className="w-2 h-2 rounded-full" style={{ background: idx.color }} />
                                                <span className={`text-[11px] ${selectedIndex.key === idx.key ? "text-white font-semibold" : "text-zinc-400"}`}>{idx.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.15)" }} />Solar Max zone
                            </span>
                        </div>
                    </div>
                    {chartOptions ? (
                        <ReactECharts option={chartOptions} style={{ height: 440 }} theme="dark" />
                    ) : (
                        <div className="h-[440px] flex items-center justify-center text-zinc-600 text-sm">
                            {loading ? t("loading") : t("noData")}
                        </div>
                    )}
                </motion.div>

                {/* Regime cards — below chart, side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {solarAnalysis ? (
                        <>
                            <div className="lg:col-span-2">
                                <RegimeCard label={selectedIndex.label} data={solarAnalysis} />
                            </div>
                            <div className="lg:col-span-1 glass-card p-6 border border-zinc-500/10 flex flex-col justify-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                    <Info size={14} /> {t("interpretation")}
                                </h3>
                                <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                                    <p>
                                        For <strong>{selectedIndex.label}</strong>, the historical annualized return is
                                        <span className={solarAnalysis.yieldGap > 0 ? " text-emerald-400 font-semibold" : " text-red-400 font-semibold"}> {Math.abs(solarAnalysis.yieldGap).toFixed(2)}% {solarAnalysis.yieldGap > 0 ? "higher" : "lower"}</span> during Solar Minimum periods compared to Solar Maximum.
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        {solarAnalysis.yieldGap > 0
                                            ? `This observation aligns with the "Solar-Market Hypothesis" where lower sunspot activity correlates with calmer markets and more consistent returns for this asset.`
                                            : `Interestingly, this asset has historically seen better performance during high solar activity periods, contrary to traditional expectations of market disruption during Solar Maximums.`}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-card p-5 text-xs text-zinc-600 italic lg:col-span-3">{loading ? t("loading") : t("noData")}</div>
                    )}
                </div>

                {/* Bottom row: Cycle History + Academic + How to Read */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cycle History */}
                    <div className="glass-card p-5 border border-amber-500/10 bg-amber-500/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={14} className="text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500/60">{t("upcomingSolarEvents")}</h3>
                        </div>
                        <div className="space-y-2">
                            {cycleHistory.map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded">
                                    <span className="text-zinc-300">{c.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-500">{c.date}</span>
                                        <span className="text-[10px] font-mono" style={{ color: c.phase === "maximum" ? "#ef4444" : "#22c55e" }}>{c.ssn}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Academic Evidence */}
                    <div className="glass-card p-5 border border-zinc-500/10">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={14} className="text-zinc-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Scientific Background</h3>
                        </div>
                        <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                            <p><strong className="text-zinc-200">W. Stanley Jevons (1878)</strong> first proposed that sunspot cycles influence economic activity through agricultural effects on credit markets.</p>
                            <p><strong className="text-zinc-200">Krivelyova & Robotti (2003)</strong> found statistically significant correlation between geomagnetic storms (triggered by solar activity) and lower stock returns in the following days.</p>
                            <p><strong className="text-zinc-200">Proposed mechanism:</strong> Solar activity → geomagnetic disturbances → disruption of melatonin/serotonin cycles → altered risk-taking behavior in traders.</p>
                        </div>
                    </div>

                    {/* How to Read This */}
                    <div className="glass-card p-5 border border-amber-500/10 bg-amber-500/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={14} className="text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500/60">{t("howToRead")}</h3>
                        </div>
                        <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                            <p>We classify each trading day by the monthly <strong className="text-amber-300">Sunspot Number (SSN)</strong>:
                                <strong className="text-emerald-300"> SSN &lt; {SOLAR_THRESHOLDS.low}</strong> = Solar Min,
                                <strong className="text-amber-300"> {SOLAR_THRESHOLDS.low}–{SOLAR_THRESHOLDS.high}</strong> = Moderate,
                                <strong className="text-red-300"> SSN &gt; {SOLAR_THRESHOLDS.high}</strong> = Solar Max.
                            </p>
                            <p>Daily returns are computed and aggregated by regime. The <strong className="text-zinc-200">annualized return</strong> shows what you&apos;d earn per year holding only during that regime.</p>
                            <p>The <strong className="text-zinc-200">~11-year solar cycle</strong> means regime transitions happen slowly. This signal is best used for long-term portfolio positioning, not active trading.</p>
                            <p className="text-zinc-500 italic">Source: SILSO / Royal Observatory of Belgium.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
