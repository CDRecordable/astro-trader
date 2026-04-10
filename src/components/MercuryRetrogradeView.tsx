// ============================================================
// MercuryRetrogradeView — Daily data analysis
// Compares daily returns during Mercury retrograde vs direct
// ============================================================

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { RotateCcw, BookOpen, Info, Calendar, AlertTriangle, ChevronDown } from "lucide-react";
import { isRetrograde, getNextRetrograde, getRetrogratesInRange, MERCURY_RETROGRADES } from "@/lib/mercury-data";
import { OVERLAY_INDICES, type OverlayIndex } from "@/lib/overlay-indices";
import { useTranslations } from "next-intl";

// ── Types ────────────────────────────────────────────────────
interface DailyPrice { date: string; price: number }

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
    const n = returns.length;
    const avg = returns.reduce((s, v) => s + v, 0) / n;
    const sorted = [...returns].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const variance = returns.reduce((s, v) => s + (v - avg) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const pos = returns.filter(r => r > 0).length;

    let cumulative = 1;
    for (const r of returns) cumulative *= (1 + r / 100);
    const cumulativeReturn = (cumulative - 1) * 100;

    const years = n / 252;
    const annualizedReturn = years > 0 ? (Math.pow(cumulative, 1 / years) - 1) * 100 : 0;

    return { avgReturn: avg, medianReturn: median, totalDays: n, positiveDays: pos, negativePct: ((n - pos) / n) * 100, stdDev, annualizedReturn, cumulativeReturn };
}

// ── Component ────────────────────────────────────────────────

export default function MercuryRetrogradeView() {
    const t = useTranslations("mercuryRetrograde");
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
    const dailySp500 = allData["sp500"] || [];
    const dailyBtc = allData["btc"] || [];

    const currentlyRetrograde = isRetrograde(new Date());
    const nextRx = getNextRetrograde(new Date());

    // ── Regime analysis: daily returns during retrograde vs direct ──
    const mercuryAnalysis = useMemo(() => {
        const analyze = (prices: DailyPrice[]) => {
            if (prices.length < 30) return null;

            const rxReturns: number[] = [];
            const directReturns: number[] = [];

            for (let i = 1; i < prices.length; i++) {
                const prevPrice = prices[i - 1].price;
                const curPrice = prices[i].price;
                if (prevPrice <= 0) continue;

                const dailyReturn = ((curPrice - prevPrice) / prevPrice) * 100;
                const date = new Date(prices[i].date);

                if (isRetrograde(date)) {
                    rxReturns.push(dailyReturn);
                } else {
                    directReturns.push(dailyReturn);
                }
            }

            const rxStats = computeStats(rxReturns);
            const directStats = computeStats(directReturns);

            return {
                rx: rxStats,
                direct: directStats,
                yieldGap: directStats.annualizedReturn - rxStats.annualizedReturn,
            };
        };

        return analyze(selectedData);
    }, [selectedData]);

    // ── Chart with retrograde shading ────────────────────────
    const chartOptions = useMemo(() => {
        if (!selectedData.length) return null;

        const dates = selectedData.map(d => d.date);
        const prices = selectedData.map(d => d.price);
        const startDate = new Date(dates[0]);
        const endDate = new Date(dates[dates.length - 1]);
        const retrogrades = getRetrogratesInRange(startDate, endDate);

        // Map retrograde dates to nearest actual trading day in our data
        const findClosestDate = (target: Date): string => {
            const ts = target.getTime();
            let closest = dates[0];
            let minDiff = Infinity;
            for (const d of dates) {
                const diff = Math.abs(new Date(d).getTime() - ts);
                if (diff < minDiff) { minDiff = diff; closest = d; }
            }
            return closest;
        };

        const markAreas = retrogrades.map(rx => [
            { xAxis: findClosestDate(rx.start), itemStyle: { color: "rgba(239, 68, 68, 0.08)" } },
            { xAxis: findClosestDate(rx.end) },
        ]);

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(0,0,0,0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                padding: 16,
                borderRadius: 12,
                textStyle: { color: "#fff", fontSize: 11 },
                formatter: (params: any) => {
                    const p = params[0];
                    if (!p) return "";
                    const date = new Date(p.axisValue);
                    const rx = isRetrograde(date);
                    return `<div style="font-size:11px;color:#a1a1aa;margin-bottom:4px">${p.axisValue}</div>
                        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px">$${Number(p.value).toLocaleString()}</div>
                        <div style="font-size:12px;color:${rx ? "#ef4444" : "#4ade80"}">☿ ${rx ? "Retrograde" : "Direct"}</div>`;
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
                    color: "#a1a1aa", fontSize: 9,
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
                    fillerColor: "rgba(239,68,68,0.1)",
                    handleStyle: { color: "#ef4444" },
                    textStyle: { color: "#a1a1aa", fontSize: 9 },
                },
            ],
            series: [{
                name: selectedIndex.label,
                type: "line",
                data: prices,
                smooth: false,
                symbol: "none",
                lineStyle: { width: 1.5, color: selectedIndex.color },
                areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: selectedIndex.color.replace(')', ',0.08)').replace('rgb', 'rgba') }, { offset: 1, color: "rgba(0,0,0,0)" }] } },
                markArea: {
                    silent: true,
                    data: markAreas,
                },
            }],
        };
    }, [selectedData, selectedIndex]);

    // ── Upcoming retrogrades calendar ────────────────────────
    const upcomingRetrogrades = useMemo(() => {
        const now = new Date();
        return MERCURY_RETROGRADES
            .map(([s, e]) => ({ start: new Date(s), end: new Date(e) }))
            .filter(r => r.end.getTime() > now.getTime())
            .slice(0, 8);
    }, []);

    // ── Regime Card ─────────────────────────────────────────
    const RegimeCard = ({ label, data }: { label: string; data: { rx: RegimeStats; direct: RegimeStats; yieldGap: number } }) => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/5 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(239, 68, 68, 0.04)" }}>
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className="text-[10px] text-zinc-400">{t("dailyReturns")}</span>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 divide-x divide-white/5">
                {/* Retrograde */}
                <div className="p-5 text-center">
                    <div className="text-lg mb-1">☿ ℞</div>
                    <div className="text-[9px] uppercase tracking-widest text-red-400/70 mb-2 font-semibold">{t("retrograde")}</div>
                    <div className={`text-xl font-bold ${data.rx.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.rx.annualizedReturn >= 0 ? "+" : ""}{data.rx.annualizedReturn.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                    <div className="text-[10px] text-zinc-400 mt-2">{data.rx.totalDays.toLocaleString()} {t("tradingDays")}</div>
                    <div className="text-[10px] text-red-400/60 mt-0.5">{data.rx.negativePct.toFixed(0)}% negative</div>
                </div>

                {/* Direct */}
                <div className="p-5 text-center">
                    <div className="text-lg mb-1">☿ ✓</div>
                    <div className="text-[9px] uppercase tracking-widest text-emerald-400/70 mb-2 font-semibold">{t("direct")}</div>
                    <div className={`text-xl font-bold ${data.direct.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.direct.annualizedReturn >= 0 ? "+" : ""}{data.direct.annualizedReturn.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{t("annualizedReturn")}</div>
                    <div className="text-[10px] text-zinc-400 mt-2">{data.direct.totalDays.toLocaleString()} {t("tradingDays")}</div>
                    <div className="text-[10px] text-emerald-400/60 mt-0.5">{data.direct.negativePct.toFixed(0)}% negative</div>
                </div>
            </div>

            {/* Detailed metrics */}
            <div className="px-4 py-3 border-t border-white/5 space-y-1.5 text-[11px]">
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2 font-semibold">{t("detailedComparison")}</div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">{t("avgDailyReturn")}</span>
                    <div className="flex gap-4">
                        <span className="text-red-300 font-mono">{data.rx.avgReturn >= 0 ? "+" : ""}{data.rx.avgReturn.toFixed(4)}%</span>
                        <span className="text-emerald-300 font-mono">{data.direct.avgReturn >= 0 ? "+" : ""}{data.direct.avgReturn.toFixed(4)}%</span>
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">{t("medianDailyReturn")}</span>
                    <div className="flex gap-4">
                        <span className="text-red-300 font-mono">{data.rx.medianReturn >= 0 ? "+" : ""}{data.rx.medianReturn.toFixed(4)}%</span>
                        <span className="text-emerald-300 font-mono">{data.direct.medianReturn >= 0 ? "+" : ""}{data.direct.medianReturn.toFixed(4)}%</span>
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">{t("volatility")}</span>
                    <div className="flex gap-4">
                        <span className="text-red-300 font-mono">{data.rx.stdDev.toFixed(4)}%</span>
                        <span className="text-emerald-300 font-mono">{data.direct.stdDev.toFixed(4)}%</span>
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
                    {data.yieldGap > 0 ? "Direct periods outperform retrograde" : "Retrograde periods outperform direct"} on an annualized basis
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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
                            <RotateCcw size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">{t("title")}</h1>
                            <p className="text-xs text-zinc-500">{t("subtitle")} · {dailySp500.length.toLocaleString()} S&P 500 trading days</p>
                        </div>
                    </div>
                </motion.div>

                {/* Status Banner */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="glass-card p-4 mb-6 flex items-center gap-4"
                    style={{ borderLeft: currentlyRetrograde ? "3px solid #ef4444" : "3px solid #22c55e" }}
                >
                    {currentlyRetrograde ? (
                        <>
                            <AlertTriangle size={24} className="text-red-400" />
                            <div>
                                <div className="text-sm font-semibold text-red-400">☿ {t("inRetrograde")}</div>
                                <div className="text-xs text-zinc-500">Historical data shows different return profiles during these windows.</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-2xl">☿</div>
                            <div>
                                <div className="text-sm font-semibold text-emerald-400">{t("currentlyDirect")}</div>
                                <div className="text-xs text-zinc-500">
                                    Next retrograde: {nextRx ? (
                                        <span className="text-zinc-300">{nextRx.start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — {nextRx.end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                                    ) : "N/A"}
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Chart — full width */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Mercury Retrograde Windows</h3>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
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
                            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.3)" }} />
                            <span>{t("retrograde")}</span>
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
                    {mercuryAnalysis ? (
                        <>
                            <div className="lg:col-span-1">
                                <RegimeCard label={selectedIndex.label} data={mercuryAnalysis} />
                            </div>
                            <div className="lg:col-span-2 glass-card p-6 border border-zinc-500/10 flex flex-col justify-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                    <Info size={14} /> {t("interpretation")}
                                </h3>
                                <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                                    <p>
                                        For <strong>{selectedIndex.label}</strong>, the historical annualized return is
                                        <span className={mercuryAnalysis.yieldGap > 0 ? " text-emerald-400 font-semibold" : " text-red-400 font-semibold"}> {Math.abs(mercuryAnalysis.yieldGap).toFixed(2)}% {mercuryAnalysis.yieldGap > 0 ? "higher" : "lower"}</span> during Direct phases compared to Retrograde phases.
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        {mercuryAnalysis.yieldGap > 0
                                            ? `This data aligns with traditional astrological interpretations suggesting that markets may experience more disruption or underperformance during Mercury Retrograde periods for this asset.`
                                            : `Interestingly, this asset has historically seen better performance during Retrograde periods, contrary to traditional astrological expectations of disruption.`}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-card p-5 text-xs text-zinc-600 italic lg:col-span-3">{loading ? t("loading") : t("noData")}</div>
                    )}
                </div>

                {/* Bottom row: Calendar + Educational */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Calendar */}
                    <div className="glass-card p-5 border border-red-500/10 bg-red-500/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={14} className="text-red-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-red-400/60">{t("upcomingRetrogrades")}</h3>
                        </div>
                        <div className="space-y-2">
                            {upcomingRetrogrades.map((rx, i) => {
                                const isCurrent = rx.start.getTime() <= Date.now() && rx.end.getTime() >= Date.now();
                                return (
                                    <div key={i} className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${isCurrent ? "bg-red-500/10 border border-red-500/20" : ""}`}>
                                        <span className={isCurrent ? "text-red-400 font-semibold" : "text-zinc-400"}>
                                            {rx.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {rx.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </span>
                                        <span className="text-[10px] text-zinc-600">{Math.round((rx.end.getTime() - rx.start.getTime()) / 86400000)}d</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* About */}
                    <div className="glass-card p-5 border border-zinc-500/10">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={14} className="text-zinc-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">About Mercury ℞</h3>
                        </div>
                        <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                            <p>Mercury retrograde occurs <strong className="text-zinc-200">3-4 times per year</strong> for about <strong className="text-zinc-200">3 weeks</strong> each time. It&apos;s an optical illusion — Mercury doesn&apos;t actually move backward.</p>
                            <p>In astrological tradition, Mercury governs <strong className="text-zinc-200">communication, contracts, and technology</strong>. When retrograde, these areas are believed to be disrupted.</p>
                            <p>In markets, this could manifest as: earnings surprises, failed M&A deals, tech outages, and regulatory miscommunication.</p>
                        </div>
                    </div>

                    {/* How to Read This */}
                    <div className="glass-card p-5 border border-amber-500/10 bg-amber-500/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={14} className="text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500/60">{t("howToRead")}</h3>
                        </div>
                        <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                            <p>We classify every trading day as <strong className="text-red-300">Retrograde</strong> or <strong className="text-emerald-300">Direct</strong> using astronomically precise retrograde windows (2000–2030).</p>
                            <p>Daily returns are computed and aggregated by regime. The <strong className="text-zinc-200">annualized return</strong> shows what you'd earn per year holding only during that regime.</p>
                            <p>The <strong className="text-zinc-200">σ (volatility)</strong> measures return dispersion — higher σ = more unpredictable returns.</p>
                            <p className="text-zinc-500 italic">This is a statistical pattern analysis, not a trading recommendation.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
