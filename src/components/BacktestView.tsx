// ============================================================
// BacktestView - "What if you traded with the stars?" Engine
// Uses daily data from /api/macro-daily for all 4 assets
// ============================================================

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { FlaskConical, Sliders, TrendingUp, TrendingDown, Info, Lightbulb } from "lucide-react";
import { generateMacroTimeline } from "@/lib/macro-algorithm";
import { getMoonPhase, isNewMoon } from "@/lib/lunar-data";
import { isRetrograde } from "@/lib/mercury-data";
import { permutationPValue, mean, formatPValue, significanceStrength } from "@/lib/stats";
import type { EChartParam } from "@/lib/echarts-types";
import { useTranslations } from "next-intl";

type AssetKey = "sp500" | "btc" | "gold" | "nasdaq";

const ASSETS: { key: AssetKey; label: string; color: string; symbol: string }[] = [
    { key: "sp500", label: "S&P 500", color: "#3b82f6", symbol: "^GSPC" },
    { key: "btc", label: "Bitcoin", color: "#f7931a", symbol: "BTC-USD" },
    { key: "gold", label: "Gold (GLD)", color: "#eab308", symbol: "GLD" },
    { key: "nasdaq", label: "Nasdaq (QQQ)", color: "#06b6d4", symbol: "QQQ" },
];

// Stateless metric comparison cell — top-level so it isn't recreated each render.
function MetricBox({ label, bhVal, stratVal, unit, lowerIsBetter, baselineLabel }: { label: string; bhVal: number; stratVal: number; unit: string; lowerIsBetter?: boolean; baselineLabel?: string }) {
    const t = useTranslations("backtester");
    const better = lowerIsBetter ? stratVal < bhVal : stratVal > bhVal;
    return (
        <div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1.5">{label}</div>
            <div className="flex gap-3 text-xs">
                <div>
                    <span className="text-[8px] text-zinc-600 block mb-0.5">{baselineLabel ?? t("buyAndHold")}</span>
                    <span className="font-mono font-semibold text-zinc-400">{bhVal.toFixed(1)}{unit}</span>
                </div>
                <div>
                    <span className="text-[8px] text-zinc-600 block mb-0.5">{t("astroStrategy")}</span>
                    <span className={`font-mono font-semibold ${better ? "text-purple-400" : "text-red-400"}`}>{stratVal.toFixed(1)}{unit}</span>
                </div>
            </div>
        </div>
    );
}

export default function BacktestView() {
    const t = useTranslations("backtester");
    const [selectedAsset, setSelectedAsset] = useState<AssetKey>("sp500");
    const [turbThreshold, setTurbThreshold] = useState(50);
    const [useLunar, setUseLunar] = useState(false);
    const [useMercury, setUseMercury] = useState(false);
    const [costBps, setCostBps] = useState(10); // transaction cost per switch, basis points (0.10%)

    const [dailySp500, setDailySp500] = useState<{ date: string; price: number }[]>([]);
    const [dailyBtc, setDailyBtc] = useState<{ date: string; price: number }[]>([]);
    const [dailyGold, setDailyGold] = useState<{ date: string; price: number }[]>([]);
    const [dailyNasdaq, setDailyNasdaq] = useState<{ date: string; price: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // loading initial state is already true
        fetch("/api/macro-daily")
            .then((r) => r.json())
            .then((data) => {
                if (data.sp500?.length) setDailySp500(data.sp500);
                if (data.btc?.length) setDailyBtc(data.btc);
                if (data.gold?.length) setDailyGold(data.gold);
                if (data.nasdaq?.length) setDailyNasdaq(data.nasdaq);
                setLoading(false);
            })
            .catch((e) => { console.error("Failed to fetch daily data", e); setLoading(false); });
    }, []);

    const asset = ASSETS.find((a) => a.key === selectedAsset)!;

    const turbulenceData = useMemo(() => {
        const start = "2000-01-01";
        const end = new Date().toISOString().split("T")[0];
        // Turbulence is slow-moving (generational aspects), so a coarse grid is
        // plenty; getTurbulence() maps each daily bar to the nearest point.
        const timeline = generateMacroTimeline(start, end, 700);
        const map = new Map<string, number>();
        const sortedDates: string[] = [];
        const sortedValues: number[] = [];
        for (const pt of timeline) {
            map.set(pt.date, pt.turbulenceIndex);
            sortedDates.push(pt.date);
            sortedValues.push(pt.turbulenceIndex);
        }
        return { map, sortedDates, sortedValues };
    }, []);

    const getTurbulence = (dateKey: string): number => {
        const exact = turbulenceData.map.get(dateKey);
        if (exact !== undefined) return exact;
        const dates = turbulenceData.sortedDates;
        let lo = 0, hi = dates.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (dates[mid] < dateKey) lo = mid + 1;
            else hi = mid;
        }
        return turbulenceData.sortedValues[Math.min(lo, dates.length - 1)];
    };

    const priceData = useMemo(() => {
        switch (selectedAsset) {
            case "sp500": return dailySp500;
            case "btc": return dailyBtc;
            case "gold": return dailyGold;
            case "nasdaq": return dailyNasdaq;
            default: return dailySp500;
        }
    }, [selectedAsset, dailySp500, dailyBtc, dailyGold, dailyNasdaq]);

    const backtestResults = useMemo(() => {
        if (priceData.length < 10) return null;

        let buyHoldValue = 10000;
        let strategyValue = 10000;
        let prevPrice = priceData[0].price;

        const buyHoldCurve: { date: string; value: number }[] = [];
        const strategyCurve: { date: string; value: number }[] = [];

        let maxBuyHold = 10000;
        let maxStrategy = 10000;
        let maxDdBuyHold = 0;
        let maxDdStrategy = 0;

        // Win-rate measured on real 22-bar (≈1 month) windows, not single days.
        let winMonths = 0;
        let totalMonths = 0;
        let winCheckStrat = 10000;   // strategy value at the start of the current window
        let winCheckBH = 10000;      // buy&hold value at the start of the current window

        // Returns split by regime — the honest significance test:
        // does avoiding high-turbulence days actually separate good days from bad?
        const inMarketReturns: number[] = [];   // decimal daily returns while invested
        const outMarketReturns: number[] = [];  // decimal daily returns while in cash
        let prevInMarket = true;
        let nSwitches = 0;
        const costRate = costBps / 10000; // bps → decimal

        for (let i = 0; i < priceData.length; i++) {
            const pt = priceData[i];
            const d = new Date(pt.date);
            const dateKey = pt.date;

            const dailyRatio = prevPrice > 0 ? pt.price / prevPrice : 1;
            const decReturn = dailyRatio - 1;
            buyHoldValue *= dailyRatio;

            const turb = getTurbulence(dateKey);
            let shouldBeInMarket = turb < turbThreshold;

            if (useLunar) {
                const phase = getMoonPhase(d);
                if (isNewMoon(phase)) shouldBeInMarket = true;
            }
            if (useMercury) {
                if (isRetrograde(d)) shouldBeInMarket = false;
            }

            // Transaction cost: charge on every switch between invested ↔ cash.
            if (i > 0 && shouldBeInMarket !== prevInMarket) {
                strategyValue *= 1 - costRate;
                nSwitches++;
            }
            prevInMarket = shouldBeInMarket;

            if (shouldBeInMarket) {
                strategyValue *= dailyRatio;
                if (i > 0) inMarketReturns.push(decReturn);
            } else if (i > 0) {
                outMarketReturns.push(decReturn);
            }

            // Monthly win-rate on the actual window return (fixes the 1-day bug)
            if (i > 0 && i % 22 === 0) {
                totalMonths++;
                const sR = strategyValue / winCheckStrat - 1;
                const bR = buyHoldValue / winCheckBH - 1;
                if (sR > bR) winMonths++;
                winCheckStrat = strategyValue;
                winCheckBH = buyHoldValue;
            }

            buyHoldCurve.push({ date: dateKey, value: buyHoldValue });
            strategyCurve.push({ date: dateKey, value: strategyValue });

            maxBuyHold = Math.max(maxBuyHold, buyHoldValue);
            maxStrategy = Math.max(maxStrategy, strategyValue);
            maxDdBuyHold = Math.max(maxDdBuyHold, (maxBuyHold - buyHoldValue) / maxBuyHold * 100);
            maxDdStrategy = Math.max(maxDdStrategy, (maxStrategy - strategyValue) / maxStrategy * 100);

            prevPrice = pt.price;
        }

        // CAGR from actual CALENDAR span — correct for BTC (365d) and stocks (252d) alike.
        const msSpan = new Date(priceData[priceData.length - 1].date).getTime() - new Date(priceData[0].date).getTime();
        const years = msSpan > 0 ? msSpan / (365.25 * 86400000) : priceData.length / 252;
        const bhReturn = (buyHoldValue / 10000 - 1) * 100;
        const stratReturn = (strategyValue / 10000 - 1) * 100;
        const bhCagr = years > 0 ? (Math.pow(buyHoldValue / 10000, 1 / years) - 1) * 100 : 0;
        const stratCagr = years > 0 ? (Math.pow(strategyValue / 10000, 1 / years) - 1) * 100 : 0;

        // Significance: permutation test on in-market vs out-of-market daily returns.
        const inAvg = mean(inMarketReturns) * 100;
        const outAvg = mean(outMarketReturns) * 100;
        const pValue = (inMarketReturns.length >= 30 && outMarketReturns.length >= 30)
            ? permutationPValue(inMarketReturns, outMarketReturns, 2000, 1234)
            : 1;
        const edgeReal = pValue < 0.05 && inAvg > outAvg;

        return {
            buyHoldCurve, strategyCurve,
            buyHoldFinal: buyHoldValue, strategyFinal: strategyValue,
            bhReturn, stratReturn, bhCagr, stratCagr,
            maxDdBuyHold, maxDdStrategy,
            winRate: totalMonths > 0 ? (winMonths / totalMonths) * 100 : 0,
            totalMonths, years,
            // significance / honesty
            inAvg, outAvg, pValue, edgeReal,
            pStrength: significanceStrength(pValue),
            nInMarket: inMarketReturns.length,
            nOutMarket: outMarketReturns.length,
            nSwitches,
        };
    }, [priceData, turbulenceData, getTurbulence, turbThreshold, useLunar, useMercury, costBps]);

    const chartOptions = useMemo(() => {
        if (!backtestResults) return null;

        const dates = backtestResults.buyHoldCurve.map((d) => d.date);
        const bhValues = backtestResults.buyHoldCurve.map((d) => d.value.toFixed(0));
        const stratValues = backtestResults.strategyCurve.map((d) => d.value.toFixed(0));

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(0,0,0,0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                padding: 14,
                borderRadius: 12,
                textStyle: { color: "#fff", fontSize: 11 },
                formatter: (params: EChartParam[]) => {
                    if (!params?.length) return "";
                    const date = params[0].axisValue;
                    return `<div style="color:#a1a1aa;font-size:10px;margin-bottom:6px">${date}</div>
                        ${params.map((p) => `<div style="color:${p.color};font-size:12px;font-weight:600">
                            ${p.seriesName}: $${Number(p.value).toLocaleString()}</div>`).join("")}`;
                },
            },
            legend: {
                data: [t("buyAndHold"), t("astroStrategy")],
                textStyle: { color: "#a1a1aa", fontSize: 10 },
                top: 0, right: 20,
            },
            grid: { left: "2%", right: "2%", bottom: "14%", top: "10%", containLabel: true },
            xAxis: {
                type: "category", data: dates, boundaryGap: false,
                axisLabel: { color: "#a1a1aa", fontSize: 9 },
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
                { type: "inside", start: 0, end: 100 },
                { type: "slider", show: true, bottom: 5, height: 22, borderColor: "transparent", backgroundColor: "rgba(0,0,0,0.3)", fillerColor: "rgba(168,85,247,0.1)", handleStyle: { color: "#a855f7" } },
            ],
            series: [
                {
                    name: t("buyAndHold"), type: "line", data: bhValues, smooth: false, symbol: "none",
                    lineStyle: { width: 1.5, color: "#3b82f6", opacity: 0.6 },
                },
                {
                    name: t("astroStrategy"), type: "line", data: stratValues, smooth: false, symbol: "none",
                    lineStyle: { width: 2, color: "#a855f7" },
                    areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(168,85,247,0.06)" }, { offset: 1, color: "rgba(168,85,247,0)" }] } },
                },
            ],
        };
    }, [backtestResults, t]);

    return (
        <div className="min-h-screen">
            <Header />
            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                            <FlaskConical size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">{t("title")}</h1>
                            <p className="text-xs text-zinc-500">{t("subtitle")} · {priceData.length.toLocaleString()} daily data points</p>
                        </div>
                    </div>
                </motion.div>

                {/* Controls */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sliders size={14} className="text-purple-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t("strategyParameters")}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Asset selector */}
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-600 block mb-2">{t("asset")}</label>
                            <div className="flex gap-2 flex-wrap">
                                {ASSETS.map((a) => (
                                    <button
                                        key={a.key}
                                        onClick={() => setSelectedAsset(a.key)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                        style={{
                                            background: selectedAsset === a.key ? `${a.color}20` : "transparent",
                                            border: selectedAsset === a.key ? `1px solid ${a.color}40` : "1px solid var(--border-subtle)",
                                            color: selectedAsset === a.key ? a.color : "var(--text-muted)",
                                        }}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Threshold slider */}
                        <div>
                            <label className="text-[10px] uppercase tracking-widets text-zinc-600 block mb-2">
                                {t("turbulenceThreshold")}: <span className="text-purple-400 font-bold">{turbThreshold}</span>
                            </label>
                            <input
                                type="range" min={20} max={80}
                                value={turbThreshold}
                                onChange={(e) => setTurbThreshold(Number(e.target.value))}
                                className="w-full accent-purple-500"
                            />
                            <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
                                <span>{t("conservative")}</span>
                                <span>{t("aggressive")}</span>
                            </div>
                        </div>

                        {/* Optional filters */}
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-600 block mb-2">{t("optionalFilters")}</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={useLunar} onChange={(e) => setUseLunar(e.target.checked)} className="accent-purple-500" />
                                    <span className="text-xs text-zinc-400">{t("lunarFilter")}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={useMercury} onChange={(e) => setUseMercury(e.target.checked)} className="accent-purple-500" />
                                    <span className="text-xs text-zinc-400">{t("mercuryFilter")}</span>
                                </label>
                                <div className="pt-1">
                                    <label className="text-[10px] text-zinc-500 block mb-1">
                                        {t("txCost")}: <span className="text-purple-400 font-semibold">{(costBps / 100).toFixed(2)}%</span>
                                    </label>
                                    <input
                                        type="range" min={0} max={50} step={5}
                                        value={costBps}
                                        onChange={(e) => setCostBps(Number(e.target.value))}
                                        className="w-full accent-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Strategy summary */}
                        <div className="glass-card p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                            <div className="text-[10px] text-zinc-500 mb-1">{t("strategyRule")}</div>
                            <div className="text-xs text-zinc-300 leading-relaxed">
                                {t("holdWhen")} <strong style={{ color: asset.color }}>{asset.label}</strong> {t("whenTurbulence")} <strong className="text-purple-400">{turbThreshold}</strong>
                                {useLunar && <>{t("plusNewMoon")} <strong className="text-purple-300">{t("newMoon")}</strong> {t("windows")}</>}
                                {useMercury && <>{t("exitDuring")} <strong className="text-red-400">Mercury ℞</strong></>}
                                {t("otherwiseCash")}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Results — chart full width */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-4 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">{t("cumulativeReturns")}</h3>
                    {chartOptions ? (
                        <ReactECharts option={chartOptions} style={{ height: 420 }} theme="dark" />
                    ) : (
                        <div className="h-[420px] flex items-center justify-center text-zinc-600 text-sm">
                            {loading ? t("loading") : t("noData")}
                        </div>
                    )}
                </motion.div>

                {/* Metrics + Verdict below chart */}
                {backtestResults && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Final Values */}
                        <div className="glass-card p-4 border border-white/5">
                            <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-3 font-semibold">{t("finalPortfolioValue")}</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] text-zinc-600">{t("buyAndHold")}</div>
                                    <div className="text-xl font-bold text-zinc-300">${backtestResults.buyHoldFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-zinc-600">{t("astroStrategy")}</div>
                                    <div className={`text-xl font-bold ${backtestResults.strategyFinal > backtestResults.buyHoldFinal ? "text-purple-400" : "text-red-400"}`}>
                                        ${backtestResults.strategyFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="glass-card p-4 border border-white/5">
                            <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-4 font-semibold">{t("keyMetrics")}</div>
                            <div className="grid grid-cols-2 gap-y-5">
                                <MetricBox label={t("totalReturn")} bhVal={backtestResults.bhReturn} stratVal={backtestResults.stratReturn} unit="%" />
                                <MetricBox label={t("cagr")} bhVal={backtestResults.bhCagr} stratVal={backtestResults.stratCagr} unit="%" />
                                <MetricBox label={t("maxDrawdown")} bhVal={backtestResults.maxDdBuyHold} stratVal={backtestResults.maxDdStrategy} unit="%" lowerIsBetter />
                                <MetricBox label={t("winRate")} bhVal={50} stratVal={backtestResults.winRate} unit="%" baselineLabel={t("winRateVsCoin")} />
                            </div>
                        </div>

                        {/* Verdict */}
                        <div className="glass-card p-4 border border-purple-500/10 bg-purple-500/[0.02]">
                            <div className="text-[9px] uppercase tracking-widest text-purple-400/60 mb-2 font-semibold">{t("verdict")}</div>
                            {backtestResults.stratReturn > backtestResults.bhReturn ? (
                                <div className="flex items-start gap-2">
                                    <TrendingUp size={16} className="text-emerald-400 mt-0.5" />
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        {t("verdictOutperformed")}{" "}
                                        <strong className="text-purple-400">{(backtestResults.stratReturn - backtestResults.bhReturn).toFixed(1)}%</strong>{" "}
                                        {t("withMaxDrawdown")} <strong>{backtestResults.maxDdStrategy.toFixed(1)}%</strong> {t("vs")} <strong>{backtestResults.maxDdBuyHold.toFixed(1)}%</strong>.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2">
                                    <TrendingDown size={16} className="text-red-400 mt-0.5" />
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        {t("verdictUnderperformed")}{" "}
                                        <strong className="text-red-400">{(backtestResults.bhReturn - backtestResults.stratReturn).toFixed(1)}%</strong>.
                                        {backtestResults.maxDdStrategy < backtestResults.maxDdBuyHold &&
                                            <> {t("drawdownImproved")} <strong className="text-emerald-400">{(backtestResults.maxDdBuyHold - backtestResults.maxDdStrategy).toFixed(1)}%</strong> {t("betterRiskAdjusted")}</>
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Statistical significance — replaces hardcoded marketing verdicts */}
                {backtestResults && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5 border border-purple-500/10 bg-purple-500/[0.02] mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb size={14} className="text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400/60">{t("significanceTitle")}</h3>
                        </div>
                        <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">{t("significanceDesc")}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">{t("inMarketAvg")}</div>
                                <div className="text-lg font-bold font-mono text-emerald-400">{backtestResults.inAvg >= 0 ? "+" : ""}{backtestResults.inAvg.toFixed(3)}%</div>
                                <div className="text-[9px] text-zinc-600">{backtestResults.nInMarket.toLocaleString()} {t("days")}</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">{t("outMarketAvg")}</div>
                                <div className="text-lg font-bold font-mono text-zinc-400">{backtestResults.outAvg >= 0 ? "+" : ""}{backtestResults.outAvg.toFixed(3)}%</div>
                                <div className="text-[9px] text-zinc-600">{backtestResults.nOutMarket.toLocaleString()} {t("days")}</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">p-value</div>
                                <div className={`text-lg font-bold font-mono ${backtestResults.edgeReal ? "text-emerald-400" : "text-amber-400"}`}>{formatPValue(backtestResults.pValue)}</div>
                                <div className="text-[9px] text-zinc-600">{backtestResults.pStrength}</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">{t("switches")}</div>
                                <div className="text-lg font-bold font-mono text-zinc-400">{backtestResults.nSwitches.toLocaleString()}</div>
                                <div className="text-[9px] text-zinc-600">@ {(costBps / 100).toFixed(2)}%</div>
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg text-xs leading-relaxed ${backtestResults.edgeReal ? "bg-emerald-500/5 border border-emerald-500/10 text-emerald-300/90" : "bg-amber-500/5 border border-amber-500/10 text-amber-300/90"}`}>
                            {backtestResults.edgeReal ? t("edgeRealText") : t("edgeNotRealText")}
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-zinc-500 italic leading-relaxed">
                            {t("hindsightCaveat")}
                        </div>
                    </motion.div>
                )}

                {/* How to Read */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5 border border-amber-500/10 bg-amber-500/[0.02]">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={14} className="text-amber-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500/60">{t("howToRead")}</h3>
                    </div>
                    <div className="text-xs text-zinc-400 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p><strong className="text-zinc-200">{t("strategyATitle")}</strong> {t("strategyAText")}</p>
                            <p><strong className="text-zinc-200">{t("strategyBTitle")}</strong> {t("strategyBText")}</p>
                        </div>
                        <div className="space-y-2">
                            <p>{t("cagrExplain")}</p>
                            <p className="text-zinc-500 italic">{t("drawdownNote")}</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
