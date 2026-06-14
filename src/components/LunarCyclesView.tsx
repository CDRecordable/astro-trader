// ============================================================
// LunarCyclesView — Dichev & Janes methodology
// "Do stock returns follow the moon?" — Daily data analysis
// ============================================================

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { Moon, Info, BarChart2, Calendar, ChevronDown } from "lucide-react";
import { getMoonPhase, getMoonEmoji, getMoonPhaseName, getNewMoonDates, getFullMoonDates } from "@/lib/lunar-data";
import { OVERLAY_INDICES, type OverlayIndex } from "@/lib/overlay-indices";
import { compareRegimes, formatPValue } from "@/lib/stats";
import type { EChartParam, EChartObj } from "@/lib/echarts-types";
import { useTranslations } from "next-intl";

// ── Types ────────────────────────────────────────────────────
type DailyPrice = { date: string; price: number };
type LunarRegime = "new" | "full";

interface RegimeDay {
    date: string;
    price: number;
    dailyReturn: number; // percent
    regime: LunarRegime;
    phase: number; // 0-1
}

interface RegimeStats {
    avgReturn: number;
    medianReturn: number;
    totalDays: number;
    positiveDays: number;
    negativeDays: number;
    positiveRate: number;
    stdDev: number;
    cumulativeReturn: number;
    annualizedReturn: number;
}

// ── Helpers ──────────────────────────────────────────────────

/** Classify a date into new-moon half or full-moon half of the synodic cycle */
function classifyDay(date: Date): LunarRegime {
    const phase = getMoonPhase(date);
    // Phase 0 = new moon, 0.5 = full moon
    // "New moon half" = phase 0.75 to 0.25 (centered on new moon)
    // "Full moon half" = phase 0.25 to 0.75 (centered on full moon)
    if (phase < 0.25 || phase >= 0.75) return "new";
    return "full";
}

function computeStats(returns: number[]): RegimeStats {
    if (returns.length === 0) return { avgReturn: 0, medianReturn: 0, totalDays: 0, positiveDays: 0, negativeDays: 0, positiveRate: 0, stdDev: 0, cumulativeReturn: 0, annualizedReturn: 0 };

    const n = returns.length;
    const avg = returns.reduce((s, v) => s + v, 0) / n;
    const sorted = [...returns].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const variance = returns.reduce((s, v) => s + (v - avg) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const pos = returns.filter(r => r > 0).length;
    const neg = returns.filter(r => r < 0).length;

    // Cumulative return: compound daily returns
    let cumulative = 1;
    for (const r of returns) cumulative *= (1 + r / 100);
    const cumulativeReturn = (cumulative - 1) * 100;

    // Annualized: assume 252 trading days/year
    const years = n / 252;
    const annualizedReturn = years > 0 ? (Math.pow(cumulative, 1 / years) - 1) * 100 : 0;

    return {
        avgReturn: avg,
        medianReturn: median,
        totalDays: n,
        positiveDays: pos,
        negativeDays: neg,
        positiveRate: (pos / n) * 100,
        stdDev,
        cumulativeReturn,
        annualizedReturn,
    };
}

// ── Component ────────────────────────────────────────────────

export default function LunarCyclesView() {
    const t = useTranslations("lunarCycles");
    const ts = useTranslations("stats");
    const [allData, setAllData] = useState<Record<string, DailyPrice[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<OverlayIndex>(OVERLAY_INDICES[0]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch daily data (loading initial state is already true)
    useEffect(() => {
        fetch("/api/macro-daily")
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                const result: Record<string, DailyPrice[]> = {};
                for (const idx of OVERLAY_INDICES) {
                    if (data[idx.key]?.length) result[idx.key] = data[idx.key];
                }
                setAllData(result);
                setLoading(false);
            })
            .catch((e) => {
                console.error("Failed to fetch daily data:", e);
                setError(e.message);
                setLoading(false);
            });
    }, []);

    const selectedData = allData[selectedIndex.key] || [];
    const dailySp500 = allData["sp500"] || [];

    // ── Complete lunar calendar ──────────────────────────────
    const lunarCalendar = useMemo(() => {
        const newMoons = getNewMoonDates(2000, 2027);
        const fullMoons = getFullMoonDates(2000, 2027);

        // Merge and sort all lunar events
        const events = [
            ...newMoons.map(d => ({ date: d, type: "new" as const })),
            ...fullMoons.map(d => ({ date: d, type: "full" as const })),
        ].sort((a, b) => a.date.getTime() - b.date.getTime());

        return { newMoons, fullMoons, events };
    }, []);

    // ── Classify each trading day into a regime for selected index ─────────────
    const lunarAnalysis = useMemo(() => {
        if (selectedData.length < 30) return null;

        const days: RegimeDay[] = [];
        for (let i = 1; i < selectedData.length; i++) {
            const prevPrice = selectedData[i - 1].price;
            const curPrice = selectedData[i].price;
            if (prevPrice <= 0) continue;

            const dailyReturn = ((curPrice - prevPrice) / prevPrice) * 100;
            const d = new Date(selectedData[i].date);
            const phase = getMoonPhase(d);
            const regime = classifyDay(d);
            days.push({ date: selectedData[i].date, price: curPrice, dailyReturn, regime, phase });
        }

        const newReturns = days.filter(d => d.regime === "new").map(d => d.dailyReturn);
        const fullReturns = days.filter(d => d.regime === "full").map(d => d.dailyReturn);
        const newStats = computeStats(newReturns);
        const fullStats = computeStats(fullReturns);

        // Honest significance: permutation test on the real daily returns (decimal).
        const periodsPerYear = selectedIndex.key === "btc" ? 365 : 252;
        const comparison = compareRegimes(
            newReturns.map(r => r / 100),
            fullReturns.map(r => r / 100),
            { periodsPerYear, method: "permutation", iterations: 2000, seed: 7 },
        );

        return days.length >= 30 ? {
            days,
            newStats,
            fullStats,
            comparison,
            yieldGap: newStats.annualizedReturn - fullStats.annualizedReturn
        } : null;
    }, [selectedData, selectedIndex]);

    // ── Chart: selected index with lunar regime bands ──────────────
    const chartOptions = useMemo(() => {
        if (!lunarAnalysis || lunarAnalysis.days.length < 30) return null;

        const days = lunarAnalysis.days;
        const dates = days.map(d => d.date);
        const prices = days.map(d => d.price);

        // Build markArea bands for regime coloring
        const bands: unknown[] = [];
        let bandStart = 0;
        let currentRegime = days[0].regime;

        for (let i = 1; i < days.length; i++) {
            if (days[i].regime !== currentRegime || i === days.length - 1) {
                bands.push([
                    {
                        xAxis: dates[bandStart],
                        itemStyle: {
                            color: currentRegime === "new"
                                ? "rgba(168, 85, 247, 0.06)"
                                : "rgba(234, 179, 8, 0.06)",
                        },
                    },
                    { xAxis: dates[i - 1] },
                ]);
                bandStart = i;
                currentRegime = days[i].regime;
            }
        }

        // Mark exact new moon and full moon dates on the chart
        const markPoints: EChartObj[] = [];
        for (const event of lunarCalendar.events) {
            const dateStr = event.date.toISOString().split("T")[0];
            const idx = dates.indexOf(dateStr);
            if (idx === -1) continue;
            // Only mark every ~3rd event to avoid clutter
            const eventIdx = lunarCalendar.events.indexOf(event);
            if (eventIdx % 3 !== 0) continue;

            markPoints.push({
                coord: [dateStr, prices[idx]],
                symbol: "circle",
                symbolSize: 4,
                itemStyle: {
                    color: event.type === "new" ? "#a855f7" : "#eab308",
                    borderColor: event.type === "new" ? "#a855f7" : "#eab308",
                },
            });
        }

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(0,0,0,0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                padding: 16,
                borderRadius: 12,
                textStyle: { color: "#fff", fontSize: 11 },
                formatter: (params: EChartParam[]) => {
                    const p = params[0];
                    if (!p) return "";
                    const idx = dates.indexOf(p.axisValue ?? "");
                    const day = idx >= 0 ? days[idx] : null;
                    const phase = day ? getMoonPhase(new Date(day.date)) : 0;
                    const emoji = day ? getMoonEmoji(phase) : "";
                    const phaseName = day ? getMoonPhaseName(phase) : "";
                    const regime = day?.regime === "new" ? "🌑 New Moon Half" : "🌕 Full Moon Half";

                    return `<div style="font-size:11px;color:#a1a1aa;margin-bottom:4px">${p.axisValue}</div>
                        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px">$${Number(p.value).toLocaleString()}</div>
                        <div style="font-size:12px;margin-bottom:2px">${emoji} ${phaseName}</div>
                        <div style="font-size:11px;color:${day?.regime === "new" ? "#a855f7" : "#eab308"}">${regime}</div>
                        ${day ? `<div style="font-size:10px;color:${day.dailyReturn >= 0 ? "#4ade80" : "#f87171"};margin-top:4px">Daily: ${day.dailyReturn >= 0 ? "+" : ""}${day.dailyReturn.toFixed(3)}%</div>` : ""}`;
                },
            },
            legend: {
                data: [selectedIndex.label],
                textStyle: { color: "#a1a1aa", fontSize: 10 },
                top: 0, right: 20,
            },
            grid: { left: "2%", right: "2%", bottom: "14%", top: "8%", containLabel: true },
            xAxis: {
                type: "category",
                data: dates,
                boundaryGap: false,
                axisLabel: { color: "#a1a1aa", fontSize: 9, showMaxLabel: true },
                axisLine: { lineStyle: { color: "#333" } },
            },
            yAxis: {
                type: "value",
                axisLabel: {
                    color: "#a1a1aa",
                    fontSize: 9,
                    formatter: (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`,
                },
                splitLine: { lineStyle: { color: "rgba(82,82,91,0.15)", type: "dashed" } },
            },
            dataZoom: [
                { type: "inside", start: 0, end: 100, minValueSpan: 60 },
                {
                    type: "slider", show: true, bottom: 5, height: 22,
                    borderColor: "transparent",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    fillerColor: "rgba(168,85,247,0.1)",
                    handleStyle: { color: "#a855f7" },
                    textStyle: { color: "#a1a1aa", fontSize: 9 },
                },
            ],
            series: [
                {
                    name: selectedIndex.label,
                    type: "line",
                    data: prices,
                    smooth: false,
                    symbol: "none",
                    lineStyle: { width: 1.5, color: selectedIndex.color },
                    markArea: { silent: true, data: bands },
                    markPoint: { data: markPoints, label: { show: false } },
                },
            ],
        };
    }, [lunarAnalysis, lunarCalendar, selectedIndex]);

    // ── Today's moon info ────────────────────────────────────
    const todayPhase = getMoonPhase(new Date());
    const todayEmoji = getMoonEmoji(todayPhase);
    const todayPhaseName = getMoonPhaseName(todayPhase);
    const todayRegime = classifyDay(new Date());

    // ── Upcoming lunar events ────────────────────────────────
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return lunarCalendar.events
            .filter(e => e.date > now)
            .slice(0, 8)
            .map(e => ({
                date: e.date.toISOString().split("T")[0],
                type: e.type,
                emoji: e.type === "new" ? "🌑" : "🌕",
                label: e.type === "new" ? "New Moon" : "Full Moon",
            }));
    }, [lunarCalendar]);

    // ── Regime comparison card ───────────────────────────────
    const RegimeCard = ({ title, subtitle, stats }: { title: string; subtitle: string; stats: { newStats: RegimeStats; fullStats: RegimeStats } | null }) => {
        if (!stats) return (
            <div className="glass-card p-5 border border-white/5">
                <div className="text-sm font-bold text-zinc-300 mb-1">{title}</div>
                <div className="text-xs text-zinc-600">{loading ? t("loading") : t("noData")}</div>
            </div>
        );

        const { newStats, fullStats } = stats;
        const diff = newStats.annualizedReturn - fullStats.annualizedReturn;
        const newBetter = diff > 0;

        return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-5 border border-white/5">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
                    <span className="text-[9px] text-zinc-600">{subtitle}</span>
                </div>
                <div className="text-[10px] text-zinc-500 mb-4">{t("dailyReturns")}</div>

                {/* Side-by-side regime comparison */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* New Moon Half */}
                    <div className="text-center p-3 rounded-lg" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
                        <div className="text-lg mb-1">🌑</div>
                        <div className="text-[9px] uppercase tracking-widest text-purple-400 font-bold mb-2">{t("newMoonHalf")}</div>
                        <div className={`text-xl font-bold ${newStats.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {newStats.annualizedReturn >= 0 ? "+" : ""}{newStats.annualizedReturn.toFixed(2)}%
                        </div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                        <div className="text-[10px] text-zinc-400 mt-2">{newStats.totalDays.toLocaleString()} {t("tradingDays")}</div>
                        <div className="text-[10px] text-emerald-400/60">{newStats.positiveRate.toFixed(1)}% {t("positive")}</div>
                    </div>

                    {/* Full Moon Half */}
                    <div className="text-center p-3 rounded-lg" style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)" }}>
                        <div className="text-lg mb-1">🌕</div>
                        <div className="text-[9px] uppercase tracking-widest text-amber-400 font-bold mb-2">{t("fullMoonHalf")}</div>
                        <div className={`text-xl font-bold ${fullStats.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {fullStats.annualizedReturn >= 0 ? "+" : ""}{fullStats.annualizedReturn.toFixed(2)}%
                        </div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                        <div className="text-[10px] text-zinc-400 mt-2">{fullStats.totalDays.toLocaleString()} {t("tradingDays")}</div>
                        <div className="text-[10px] text-amber-400/60">{fullStats.positiveRate.toFixed(1)}% {t("positive")}</div>
                    </div>
                </div>

                {/* Detailed metrics table */}
                <div className="border-t border-white/5 pt-3">
                    <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2 font-semibold">{t("detailedComparison")}</div>
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">{t("avgDailyReturn")}</span>
                            <div className="flex gap-4">
                                <span className="text-purple-300 font-mono">{newStats.avgReturn >= 0 ? "+" : ""}{newStats.avgReturn.toFixed(4)}%</span>
                                <span className="text-amber-300 font-mono">{fullStats.avgReturn >= 0 ? "+" : ""}{fullStats.avgReturn.toFixed(4)}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">{t("medianDailyReturn")}</span>
                            <div className="flex gap-4">
                                <span className="text-purple-300 font-mono">{newStats.medianReturn >= 0 ? "+" : ""}{newStats.medianReturn.toFixed(4)}%</span>
                                <span className="text-amber-300 font-mono">{fullStats.medianReturn >= 0 ? "+" : ""}{fullStats.medianReturn.toFixed(4)}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">{t("volatility")}</span>
                            <div className="flex gap-4">
                                <span className="text-purple-300 font-mono">{newStats.stdDev.toFixed(4)}%</span>
                                <span className="text-amber-300 font-mono">{fullStats.stdDev.toFixed(4)}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">{t("cumulativeReturn")}</span>
                            <div className="flex gap-4">
                                <span className="text-purple-300 font-mono">{newStats.cumulativeReturn >= 0 ? "+" : ""}{newStats.cumulativeReturn.toFixed(1)}%</span>
                                <span className="text-amber-300 font-mono">{fullStats.cumulativeReturn >= 0 ? "+" : ""}{fullStats.cumulativeReturn.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Yield gap verdict */}
                <div className="mt-4 p-3 rounded-lg" style={{ background: newBetter ? "rgba(168,85,247,0.05)" : "rgba(234,179,8,0.05)", border: `1px solid ${newBetter ? "rgba(168,85,247,0.2)" : "rgba(234,179,8,0.2)"}` }}>
                    <div className="text-[9px] uppercase tracking-widest mb-1 font-semibold" style={{ color: newBetter ? "#a855f7" : "#eab308" }}>
                        {t("annualizedYieldGap")}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold" style={{ color: newBetter ? "#a855f7" : "#eab308" }}>
                            {Math.abs(diff).toFixed(2)}%
                        </span>
                        <span className="text-[10px] text-zinc-500">
                            {newBetter ? t("newMoonOutperforms") : t("fullMoonOutperforms")} {t("perYear")}
                        </span>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen">
            <Header />
            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Page header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                            <Moon size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">{t("title")}</h1>
                            <p className="text-xs text-zinc-500">{t("subtitle")} · {dailySp500.length.toLocaleString()} S&P 500 trading days</p>
                        </div>
                    </div>
                </motion.div>

                {/* Today's moon / current phase */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="glass-card p-4 mb-6 flex items-center gap-4 border border-white/5">
                    <div className="text-3xl">{todayEmoji}</div>
                    <div>
                        <div className="text-sm font-bold text-zinc-200">{t("todayMoonPhase")}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                            Phase: {(todayPhase * 100).toFixed(1)}% through cycle · <strong className={todayRegime === "new" ? "text-purple-400" : "text-amber-400"}>
                                {todayRegime === "new" ? t("newMoonPhaseLabel") : t("fullMoonPhaseLabel")}
                            </strong>
                            {" "}({todayPhaseName})
                        </div>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-[9px] uppercase tracking-widest text-zinc-600">{t("methodology")}</div>
                        <div className="text-[10px] text-zinc-500">Dichev & Janes (2001)</div>
                    </div>
                </motion.div>

                {/* Chart — full width */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t("lunarRegimeBands")}</h3>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
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
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(168,85,247,0.2)" }}></span> {t("newMoonHalf")}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(234,179,8,0.2)" }}></span> {t("fullMoonHalf")}</span>
                        </div>
                    </div>
                    {chartOptions ? (
                        <ReactECharts option={chartOptions} style={{ height: 440 }} theme="dark" />
                    ) : (
                        <div className="h-[440px] flex items-center justify-center text-zinc-600 text-sm">
                            {loading ? t("loading") : error ? `Error: ${error}` : t("noData")}
                        </div>
                    )}
                </motion.div>

                {/* Regime analysis cards — below chart, side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {lunarAnalysis ? (
                        <>
                            <div className="lg:col-span-2">
                                {/* eslint-disable-next-line react-hooks/static-components -- stateless presentational card, no state to reset */}
                                <RegimeCard title={selectedIndex.label} subtitle={`${selectedData.length > 0 ? selectedData[0].date.slice(0, 4) : "2000"} – present`} stats={lunarAnalysis} />
                            </div>
                            <div className="lg:col-span-1 glass-card p-6 border border-zinc-500/10 flex flex-col justify-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                    <Info size={14} /> {t("textualInterpretation")}
                                </h3>
                                <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                                    <p>
                                        For <strong>{selectedIndex.label}</strong>, the historical annualized return is
                                        <span className={lunarAnalysis.yieldGap > 0 ? " text-emerald-400 font-semibold" : " text-red-400 font-semibold"}> {Math.abs(lunarAnalysis.yieldGap).toFixed(2)}% {lunarAnalysis.yieldGap > 0 ? "higher" : "lower"}</span> during the New Moon Half compared to the Full Moon Half.
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        {lunarAnalysis.yieldGap > 0 ? t("alignsWithDJ") : t("contraryToDJ")}
                                    </p>
                                    {/* Honest significance verdict */}
                                    <div className={`mt-2 p-3 rounded-lg text-xs leading-relaxed ${lunarAnalysis.comparison.significant ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-300/90" : "bg-amber-500/5 border border-amber-500/15 text-amber-300/90"}`}>
                                        <div className="font-semibold mb-1">{ts("title")} · {ts("pLabel")} {formatPValue(lunarAnalysis.comparison.pValue)}</div>
                                        <p>{lunarAnalysis.comparison.significant
                                            ? ts("significant", { p: formatPValue(lunarAnalysis.comparison.pValue) })
                                            : ts("notSignificant", { p: formatPValue(lunarAnalysis.comparison.pValue) })}</p>
                                        <p className="text-[10px] text-zinc-500 mt-1">
                                            {ts("sampleSizes", { a: lunarAnalysis.comparison.nA, b: lunarAnalysis.comparison.nB })} · {ts("permutationNote")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-card p-5 text-xs text-zinc-600 italic lg:col-span-3">{loading ? `${t("loading")}` : t("noData")}</div>
                    )}
                </div>

                {/* Bottom panels */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar size={14} className="text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t("upcomingLunarEvents")}</h3>
                        </div>
                        <div className="space-y-2">
                            {upcomingEvents.map((e, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span>{e.emoji}</span>
                                        <span className="text-zinc-400">{e.label}</span>
                                    </div>
                                    <span className="text-zinc-500 font-mono text-[11px]">{e.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Academic research */}
                    <div className="glass-card p-5 border border-amber-500/10 bg-amber-500/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart2 size={14} className="text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500/60">{t("academicResearch")}</h3>
                        </div>
                        <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
                            <p>
                                <strong className="text-zinc-300">Dichev & Janes (2003)</strong> — &ldquo;Lunar Cycle Effects in Stock Returns&rdquo;
                                (<em>Journal of Private Equity</em>). Reported that returns in the ~15 days around
                                new moons were higher than around full moons across 25 years and 48 countries. Later work has
                                disputed its robustness once multiple-testing is accounted for.
                            </p>
                            <p>
                                <strong className="text-zinc-300">Yuan, Zheng & Zhu (2006)</strong> — Found a lunar effect of roughly
                                <strong className="text-emerald-400"> 3–5%</strong> annualized in global markets.
                                <span className="text-zinc-500 italic"> {ts("literatureNote")}</span>
                            </p>
                            <p className="text-zinc-500 italic text-[11px]">
                                The prevailing hypothesis is not gravitational pull, but rather that mood and risk appetite
                                shift subtly with lunar cycles, affecting aggregate market behavior.
                            </p>
                        </div>
                    </div>

                    {/* How to read this */}
                    <div className="glass-card p-5 border border-purple-500/10 bg-purple-500/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={14} className="text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400/60">{t("howToRead")}</h3>
                        </div>
                        <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                            <p>{t("howToReadText1")}</p>
                            <p><strong className="text-purple-300">{t("howToReadText2")}</strong></p>
                            <p><strong className="text-amber-300">{t("howToReadText3")}</strong></p>
                            <p>{t("howToReadText4")}</p>
                            <p className="text-zinc-500 italic text-[11px]">{t("howToReadDisclaimer")}</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
