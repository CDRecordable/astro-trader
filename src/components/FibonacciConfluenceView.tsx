"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

type EventCategory = "heavy" | "mercury" | "eclipse";
import Header from "./Header";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Activity, Clock, BookOpen, X } from "lucide-react";
import ReactECharts from "echarts-for-react";
import { PLANETARY_TRANSITS } from "@/lib/macro-algorithm";
import { MERCURY_RETROGRADES } from "@/lib/mercury-data";
import { OVERLAY_INDICES } from "@/lib/overlay-indices";
import { monteCarloBaseline, formatPValue } from "@/lib/stats";
import type { EChartParam, EChartObj } from "@/lib/echarts-types";

// ── Types ──────────────────────────────────────────────────────
interface PricePoint { date: string; price: number; }

// ── Unified Astrological Event Calendar ────────────────────────
interface AstroEvent {
    date: string;
    endDate?: string;
    label: string;
    category: "heavy" | "mercury" | "eclipse";
    color: string;
    description: string;
}

function buildAstroCalendar(): AstroEvent[] {
    const events: AstroEvent[] = [];

    for (const t of PLANETARY_TRANSITS) {
        events.push({
            date: t.date, label: t.name, category: "heavy",
            color: t.type === "tension" ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)",
            description: t.description,
        });
    }

    for (const [start, end] of MERCURY_RETROGRADES) {
        events.push({
            date: start, endDate: end, label: "☿ Rx", category: "mercury",
            color: "rgba(168,85,247,0.25)",
            description: "Mercury retrograde — historically correlated with communication breakdowns, failed negotiations, and sudden reversals in speculative markets.",
        });
    }

    const ECLIPSES = [
        "2000-01-21", "2000-07-16", "2001-01-09", "2001-06-21", "2002-06-10", "2002-12-04",
        "2003-05-16", "2003-11-09", "2004-05-04", "2004-10-28", "2005-04-24", "2005-10-17",
        "2006-03-29", "2006-09-22", "2007-03-19", "2007-08-28", "2008-02-21", "2008-08-16",
        "2009-02-09", "2009-08-06", "2010-06-26", "2010-12-21", "2011-06-15", "2011-12-10",
        "2012-06-04", "2012-11-28", "2013-04-25", "2013-10-18", "2014-04-15", "2014-10-08",
        "2015-04-04", "2015-09-28", "2016-03-23", "2016-09-16", "2017-02-11", "2017-08-07",
        "2018-01-31", "2018-07-27", "2019-01-21", "2019-07-16", "2020-01-10", "2020-06-05",
        "2020-11-30", "2021-05-26", "2021-11-19", "2022-05-16", "2022-11-08", "2023-05-05",
        "2023-10-28", "2024-03-25", "2024-09-18", "2025-03-14", "2025-09-07", "2026-02-17",
        "2026-08-12",
    ];
    for (const d of ECLIPSES) {
        events.push({
            date: d, label: "Eclipse", category: "eclipse",
            color: "rgba(234,179,8,0.3)",
            description: "Lunar or solar eclipse — ancient financial astrology considers these moments of peak market vulnerability and emotional extremes.",
        });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const ASTRO_CALENDAR = buildAstroCalendar();

// ── Fibonacci Engine ───────────────────────────────────────────
const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS: Record<number, string> = {
    0: "#6b7280", 0.236: "#3b82f6", 0.382: "#06b6d4",
    0.5: "#eab308", 0.618: "#f97316", 0.786: "#ef4444", 1: "#6b7280"
};

interface SwingPivot { idx: number; date: string; price: number; type: "high" | "low"; }

function detectSwings(data: PricePoint[], windowSize: number = 60): SwingPivot[] {
    // Adaptively reduce the window for shorter datasets
    const w = Math.min(windowSize, Math.floor(data.length / 6));
    if (w < 10 || data.length < 50) return [];
    const pivots: SwingPivot[] = [];
    for (let i = w; i < data.length - w; i++) {
        const price = data[i].price;
        let isHigh = true, isLow = true;
        for (let j = i - w; j <= i + w; j++) {
            if (j === i) continue;
            if (data[j].price >= price) isHigh = false;
            if (data[j].price <= price) isLow = false;
        }
        if (isHigh) pivots.push({ idx: i, date: data[i].date, price, type: "high" });
        if (isLow) pivots.push({ idx: i, date: data[i].date, price, type: "low" });
    }
    return pivots;
}

interface FibRange {
    fromPivot: SwingPivot;
    toPivot: SwingPivot;
    levels: { ratio: number; price: number }[];
    magnitude: number; // percentage size of the swing
}

function buildFibRanges(pivots: SwingPivot[]): FibRange[] {
    const ranges: FibRange[] = [];
    for (let i = 0; i < pivots.length - 1; i++) {
        const a = pivots[i], b = pivots[i + 1];
        if (a.type === b.type) continue;
        const high = a.type === "high" ? a.price : b.price;
        const low = a.type === "low" ? a.price : b.price;
        const diff = high - low;
        const magnitude = diff / high;
        if (magnitude < 0.08) continue;
        ranges.push({
            fromPivot: a, toPivot: b, magnitude,
            levels: FIB_RATIOS.map(r => ({ ratio: r, price: low + diff * r }))
        });
    }
    return ranges;
}

// ── Confluence now tracks which FibRange it belongs to ─────────
interface Confluence {
    date: string;
    price: number;
    fibRatio: number;
    fibPrice: number;
    fibRangeIdx: number; // <-- index into fibRanges[]
    eventLabel: string;
    eventCategory: string;
    eventDescription: string;
    priceDist: number;
}

function detectConfluences(data: PricePoint[], fibRanges: FibRange[], events: AstroEvent[]): Confluence[] {
    const results: Confluence[] = [];
    const TIME_WINDOW_MS = 7 * 86400000;
    const PRICE_TOLERANCE = 0.025;

    for (const evt of events) {
        const evtTime = new Date(evt.date).getTime();
        let bestIdx = -1, bestDist = Infinity;
        for (let i = 0; i < data.length; i++) {
            const dist = Math.abs(new Date(data[i].date).getTime() - evtTime);
            if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        }
        if (bestIdx < 0 || bestDist > TIME_WINDOW_MS) continue;
        const price = data[bestIdx].price;

        for (let ri = 0; ri < fibRanges.length; ri++) {
            const range = fibRanges[ri];
            const rangeStart = Math.min(range.fromPivot.idx, range.toPivot.idx);
            const rangeEnd = Math.max(range.fromPivot.idx, range.toPivot.idx);
            if (bestIdx < rangeStart || bestIdx > rangeEnd + 120) continue;

            for (const lev of range.levels) {
                if (lev.ratio === 0 || lev.ratio === 1) continue;
                const dist = Math.abs(price - lev.price) / lev.price;
                if (dist <= PRICE_TOLERANCE) {
                    results.push({
                        date: data[bestIdx].date, price,
                        fibRatio: lev.ratio, fibPrice: lev.price,
                        fibRangeIdx: ri,
                        eventLabel: evt.label, eventCategory: evt.category,
                        eventDescription: evt.description, priceDist: dist,
                    });
                    break;
                }
            }
        }
    }

    const byDate = new Map<string, Confluence>();
    for (const c of results) {
        const existing = byDate.get(c.date);
        if (!existing || c.priceDist < existing.priceDist) byDate.set(c.date, c);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Main Component ─────────────────────────────────────────────
export default function FibonacciConfluenceView() {
    const [selectedAsset, setSelectedAsset] = useState("sp500");
    const [lookbackDays, setLookbackDays] = useState(0);
    const [rawData, setRawData] = useState<Record<string, PricePoint[]>>({});
    const [loading, setLoading] = useState(true);
    const [pinnedConfluence, setPinnedConfluence] = useState<Confluence | null>(null);
    const [enabledCategories, setEnabledCategories] = useState<Record<EventCategory, boolean>>({ heavy: true, mercury: true, eclipse: true });

    const toggleCategory = useCallback((cat: EventCategory) => {
        setEnabledCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    }, []);

    useEffect(() => {
        setLoading(true);
        fetch("/api/macro-daily")
            .then(r => r.json())
            .then(d => { setRawData(d); setLoading(false); })
            .catch(console.error);
    }, []);

    // Reset pinned confluence when switching asset/timeframe
    useEffect(() => { setPinnedConfluence(null); }, [selectedAsset, lookbackDays]);

    const activeData = useMemo(() => {
        const ds = rawData[selectedAsset] || [];
        if (ds.length === 0 || lookbackDays === 0) return ds;
        return ds.slice(-lookbackDays);
    }, [rawData, selectedAsset, lookbackDays]);

    const swingPivots = useMemo(() => detectSwings(activeData, 60), [activeData]);
    const fibRanges = useMemo(() => buildFibRanges(swingPivots), [swingPivots]);
    const allConfluences = useMemo(() => detectConfluences(activeData, fibRanges, ASTRO_CALENDAR), [activeData, fibRanges]);

    // Filter confluences by enabled categories
    const confluences = useMemo(() => allConfluences.filter(c => enabledCategories[c.eventCategory as EventCategory]), [allConfluences, enabledCategories]);

    const assetConfig = OVERLAY_INDICES.find(i => i.key === selectedAsset) || OVERLAY_INDICES[0];

    // Determine which FibRange to display based on pinned confluence
    const displayRangeIdx = pinnedConfluence
        ? pinnedConfluence.fibRangeIdx
        : fibRanges.length > 0 ? fibRanges.length - 1 : -1;

    // Chart options
    const chartOpts = useMemo(() => {
        if (activeData.length === 0) return null;
        const dates = activeData.map(d => d.date);
        const prices = activeData.map(d => d.price);

        // FIBONACCI LEVELS: show from the displayRange (pinned or most recent)
        const fibLines: EChartObj[] = [];
        if (displayRangeIdx >= 0 && displayRangeIdx < fibRanges.length) {
            const r = fibRanges[displayRangeIdx];
            for (const lev of r.levels) {
                if (lev.ratio === 0 || lev.ratio === 1) continue;
                const col = FIB_COLORS[lev.ratio] || "#fff";
                fibLines.push({
                    yAxis: lev.price,
                    lineStyle: { color: col + "55", type: "dashed", width: 1 },
                    label: { show: true, position: "insideEndTop", formatter: `${(lev.ratio * 100).toFixed(1)}%  ($${lev.price.toFixed(0)})`, color: col + "aa", fontSize: 9 },
                });
            }
            // Also mark the swing high/low that define this range
            fibLines.push({
                xAxis: r.fromPivot.date,
                lineStyle: { color: "rgba(255,255,255,0.15)", type: "dotted", width: 1 },
                label: { show: true, formatter: r.fromPivot.type === "high" ? "▼ Swing High" : "▲ Swing Low", position: "start", color: "rgba(255,255,255,0.4)", fontSize: 8 },
            });
            fibLines.push({
                xAxis: r.toPivot.date,
                lineStyle: { color: "rgba(255,255,255,0.15)", type: "dotted", width: 1 },
                label: { show: true, formatter: r.toPivot.type === "high" ? "▼ Swing High" : "▲ Swing Low", position: "start", color: "rgba(255,255,255,0.4)", fontSize: 8 },
            });
        }

        // Heavy transit verticals + Mercury Rx bands
        const markAreas: unknown[] = [];
        const eventLines: EChartObj[] = [];
        const startMs = new Date(dates[0]).getTime();
        const endMs = new Date(dates[dates.length - 1]).getTime();

        for (const evt of ASTRO_CALENDAR) {
            const evtMs = new Date(evt.date).getTime();
            if (evtMs < startMs || evtMs > endMs) continue;

            if (evt.category === "mercury" && evt.endDate) {
                markAreas.push([
                    { xAxis: evt.date, itemStyle: { color: evt.color } },
                    { xAxis: evt.endDate }
                ]);
            } else if (evt.category === "heavy") {
                eventLines.push({
                    xAxis: evt.date,
                    lineStyle: { color: evt.color, type: "solid", width: 2 },
                    label: { show: true, formatter: evt.label, position: "end", color: evt.color, fontSize: 8, rotate: 90 },
                });
            }
        }

        // Confluence scatter — highlight the pinned one, embed data for rich tooltip
        const scatterData = confluences.map(c => {
            const isPinned = pinnedConfluence && c.date === pinnedConfluence.date;
            const catColor = c.eventCategory === "heavy" ? "#f87171" : c.eventCategory === "mercury" ? "#c084fc" : "#fbbf24";
            return {
                value: [c.date, c.price],
                symbolSize: isPinned ? 26 : 18,
                itemStyle: {
                    color: isPinned ? "#ffffff" : catColor,
                    shadowBlur: isPinned ? 24 : 12,
                    shadowColor: isPinned ? "#a855f7" : catColor + "88",
                    borderColor: isPinned ? "#a855f7" : "transparent",
                    borderWidth: isPinned ? 3 : 0,
                },
                // Custom data for tooltip
                _conf: { label: c.eventLabel, cat: c.eventCategory, fib: c.fibRatio, fibPrice: c.fibPrice, dist: c.priceDist, desc: c.eventDescription },
            };
        });

        return {
            backgroundColor: "transparent",
            tooltip: [
                {
                    trigger: "axis",
                    backgroundColor: "rgba(0,0,0,0.92)",
                    borderColor: "rgba(255,255,255,0.1)",
                    textStyle: { color: "#fff", fontSize: 11 },
                },
            ],
            grid: { left: 55, right: 30, top: 30, bottom: 50 },
            xAxis: {
                type: "category", data: dates,
                axisLabel: { color: "#71717a", fontSize: 10, interval: Math.floor(dates.length / 8) },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
            },
            yAxis: {
                type: "value", scale: true,
                axisLabel: { color: "#71717a", fontSize: 10 },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
            },
            dataZoom: [{ type: "inside" }, { type: "slider", height: 22, bottom: 5, borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(0,0,0,0.3)", fillerColor: "rgba(168,85,247,0.15)", handleStyle: { color: "#a855f7" } }],
            series: [
                {
                    name: assetConfig.label,
                    type: "line",
                    data: prices,
                    lineStyle: { color: assetConfig.color, width: 1.5 },
                    areaStyle: {
                        color: {
                            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [{ offset: 0, color: assetConfig.color + "30" }, { offset: 1, color: "transparent" }]
                        }
                    },
                    symbol: "none",
                    markLine: { symbol: "none", data: [...fibLines, ...eventLines] },
                    markArea: { data: markAreas, silent: true },
                },
                {
                    name: "Confluences",
                    type: "effectScatter",
                    data: scatterData,
                    rippleEffect: { brushType: "stroke", scale: 2.5 },
                    zlevel: 2,
                    tooltip: {
                        trigger: "item",
                        backgroundColor: "rgba(0,0,0,0.95)",
                        borderColor: "rgba(168,85,247,0.4)",
                        borderWidth: 1,
                        padding: [12, 16],
                        textStyle: { color: "#fff", fontSize: 11 },
                        formatter: (params: EChartParam) => {
                            const d = (params.data as { _conf?: { cat: string; label: string; fib: number; fibPrice: number; dist: number; desc: string } })?._conf;
                            if (!d) return '';
                            const val = params.value as (string | number)[];
                            const catLabel = d.cat === 'heavy' ? '🔴 Heavy Transit' : d.cat === 'mercury' ? '🟣 Mercury Rx' : '🟡 Eclipse';
                            return `<div style="max-width:320px">`
                                + `<div style="font-size:13px;font-weight:700;margin-bottom:6px">${d.label}</div>`
                                + `<div style="font-size:10px;color:#a1a1aa;margin-bottom:8px">${catLabel} · ${val[0]}</div>`
                                + `<div style="display:flex;gap:16px;margin-bottom:8px">`
                                + `<div><div style="font-size:9px;color:#71717a;text-transform:uppercase">Price</div><div style="font-size:14px;font-weight:600">$${Number(val[1]).toFixed(2)}</div></div>`
                                + `<div><div style="font-size:9px;color:#71717a;text-transform:uppercase">Fib Level</div><div style="font-size:14px;font-weight:600;color:#a855f7">${(d.fib * 100).toFixed(1)}%</div></div>`
                                + `<div><div style="font-size:9px;color:#71717a;text-transform:uppercase">Fib Price</div><div style="font-size:14px;font-weight:600">$${d.fibPrice.toFixed(2)}</div></div>`
                                + `<div><div style="font-size:9px;color:#71717a;text-transform:uppercase">Distance</div><div style="font-size:14px;font-weight:600;color:${d.dist < 0.01 ? '#22c55e' : '#eab308'}">${(d.dist * 100).toFixed(2)}%</div></div>`
                                + `</div>`
                                + `<div style="font-size:10px;color:#a1a1aa;line-height:1.5;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">${d.desc.slice(0, 160)}...</div>`
                                + `<div style="font-size:9px;color:#7c3aed;margin-top:6px">Click confluence list below to pin Fibonacci levels</div>`
                                + `</div>`;
                        },
                    },
                },
            ],
        };
    }, [activeData, fibRanges, confluences, assetConfig, displayRangeIdx, pinnedConfluence, enabledCategories]);

    // Stats — computed from ALL confluences but only show combined rate for ENABLED categories
    const categoryStats = useMemo(() => {
        const result: Record<EventCategory, { count: number; reversals: number; measurable: number }> = {
            heavy: { count: 0, reversals: 0, measurable: 0 },
            mercury: { count: 0, reversals: 0, measurable: 0 },
            eclipse: { count: 0, reversals: 0, measurable: 0 },
        };
        for (const c of allConfluences) {
            const cat = c.eventCategory as EventCategory;
            result[cat].count++;
            const cIdx = activeData.findIndex(d => d.date === c.date);
            if (cIdx < 0 || cIdx + 30 >= activeData.length) continue;
            result[cat].measurable++;
            const priceAtConf = c.price;
            const priceAfter = activeData[cIdx + 30].price;
            const priceBefore = cIdx >= 10 ? activeData[cIdx - 10].price : priceAtConf;
            const wasFalling = priceBefore > priceAtConf;
            const moveAfter = (priceAfter - priceAtConf) / priceAtConf;
            if ((wasFalling && moveAfter > 0.03) || (!wasFalling && moveAfter < -0.03)) {
                result[cat].reversals++;
            }
        }
        return result;
    }, [allConfluences, activeData]);

    const stats = useMemo(() => {
        if (allConfluences.length === 0 || activeData.length < 30) return null;
        // Combined rate uses only ENABLED categories
        let totalReversals = 0, totalMeasurable = 0, totalCount = 0;
        for (const cat of ["heavy", "mercury", "eclipse"] as EventCategory[]) {
            if (enabledCategories[cat]) {
                totalReversals += categoryStats[cat].reversals;
                totalMeasurable += categoryStats[cat].measurable;
                totalCount += categoryStats[cat].count;
            }
        }
        return {
            total: totalCount,
            reversals: totalReversals,
            measurable: totalMeasurable,
            rate: totalMeasurable > 0 ? Math.round((totalReversals / totalMeasurable) * 100) : 0,
        };
    }, [allConfluences, activeData, enabledCategories, categoryStats]);

    // Baseline control: the SAME reversal test at random dates. Answers the
    // question the raw rate cannot — does confluence beat chance?
    const baseline = useMemo(() => {
        if (!stats || stats.measurable < 5) return null;
        const lo = 10, hi = activeData.length - 31;
        if (hi - lo < 50) return null;

        // 1 if the bar at idx "reverses" (>3% move against prior 10-bar direction within 30 bars)
        const reversalAt = (idx: number): number => {
            const priceAt = activeData[idx].price;
            const after = activeData[idx + 30].price;
            const before = activeData[idx - 10].price;
            const wasFalling = before > priceAt;
            const move = (after - priceAt) / priceAt;
            return (wasFalling && move > 0.03) || (!wasFalling && move < -0.03) ? 1 : 0;
        };

        const nSample = stats.measurable;
        const observedRate = stats.rate / 100;
        const mc = monteCarloBaseline(
            observedRate,
            (rng) => {
                let hits = 0;
                for (let k = 0; k < nSample; k++) hits += reversalAt(lo + Math.floor(rng() * (hi - lo)));
                return hits / nSample;
            },
            2000,
            4242,
        );
        return {
            baselinePct: Math.round(mc.baselineMean * 100),
            liftPp: Math.round(mc.lift * 100),
            pValue: mc.pValue,
            beatsChance: mc.pValue < 0.05 && mc.lift > 0,
        };
    }, [stats, activeData]);

    const nextTransit = useMemo(() => {
        // eslint-disable-next-line react-hooks/purity -- next future transit depends on current time
        const now = Date.now();
        return PLANETARY_TRANSITS.find(t => new Date(t.date).getTime() > now);
    }, []);

    // Handle clicking a confluence in the sidebar
    const handlePinConfluence = useCallback((c: Confluence) => {
        setPinnedConfluence(prev => (prev && prev.date === c.date) ? null : c);
    }, []);

    const pinnedLabel = pinnedConfluence
        ? `Showing Fib from: ${pinnedConfluence.date} (${pinnedConfluence.eventLabel})`
        : fibRanges.length > 0
            ? `Showing Fib from latest swing (${fibRanges[fibRanges.length - 1].fromPivot.date} → ${fibRanges[fibRanges.length - 1].toPivot.date})`
            : "No swings detected";

    return (
        <div className="min-h-screen pb-20">
            <Header />
            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(216,180,254,0.05))" }}>
                            <Target size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">Fibonacci-Astro Confluence Zones</h1>
                            <p className="text-xs text-zinc-500">Multi-swing Fibonacci retracements × {ASTRO_CALENDAR.length} astrological events</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select className="bg-zinc-900 border border-white/10 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer" value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}>
                            {OVERLAY_INDICES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
                        </select>
                        <select className="bg-zinc-900 border border-white/10 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer" value={lookbackDays.toString()} onChange={e => setLookbackDays(Number(e.target.value))}>
                            <option value="365">1 Year</option>
                            <option value="1095">3 Years</option>
                            <option value="1825">5 Years</option>
                            <option value="0">All Time</option>
                        </select>
                    </div>
                </motion.div>

                {/* Main Layout: Chart + Sidebar */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                    {/* Chart */}
                    <div className="xl:col-span-3 glass-card p-5 border border-white/5 relative" style={{ minHeight: 560 }}>
                        {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 animate-pulse">Loading daily market data...</div>}
                        {!loading && chartOpts && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                                {/* Legend + Active Fib indicator */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                                        <span className="flex items-center gap-1.5"><span className="w-5 h-2.5 rounded-sm" style={{ background: "rgba(168,85,247,0.25)" }} /> Mercury Rx</span>
                                        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-red-500/60 rounded" /> Heavy Transit</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] border-b border-dashed border-blue-400/40" /> Fibonacci</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_#c084fc] bg-purple-400" /> Confluence</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-500 font-mono">{pinnedLabel}</span>
                                        {pinnedConfluence && (
                                            <button onClick={() => setPinnedConfluence(null)} className="text-[10px] text-purple-400 underline cursor-pointer hover:text-purple-300">Clear</button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <ReactECharts option={chartOpts} style={{ height: "100%", minHeight: 480 }} theme="dark" />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Sidebar — Stats + Next Transit only */}
                    <div className="flex flex-col gap-5">
                        {/* Stats Card */}
                        <div className="glass-card p-5 border border-white/5">
                            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4 flex items-center gap-2"><Activity size={14} className="text-emerald-400" /> Confluence Report</h3>
                            {stats ? (
                                <div className="space-y-4">
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                        <div className="text-3xl font-bold text-zinc-100">{stats.total}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Active Confluences</div>
                                    </div>

                                    {/* Toggleable category breakdown */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Click to toggle · recalculates rate</p>
                                        {([
                                            { cat: "heavy" as EventCategory, label: "Heavy Transits", dotColor: "bg-red-500", textColor: "text-red-400", bg: "bg-red-500/5", border: "border-red-500/10" },
                                            { cat: "mercury" as EventCategory, label: "Mercury Rx", dotColor: "bg-purple-400", textColor: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/10" },
                                            { cat: "eclipse" as EventCategory, label: "Eclipses", dotColor: "bg-yellow-400", textColor: "text-yellow-400", bg: "bg-yellow-500/5", border: "border-yellow-500/10" },
                                        ]).map(({ cat, label, dotColor, textColor, bg, border }) => {
                                            const s = categoryStats[cat];
                                            const rate = s.measurable > 0 ? Math.round((s.reversals / s.measurable) * 100) : null;
                                            const enabled = enabledCategories[cat];
                                            return (
                                                <button
                                                    key={cat}
                                                    onClick={() => toggleCategory(cat)}
                                                    className={`w-full flex items-center justify-between rounded-lg p-2.5 border transition-all cursor-pointer ${enabled ? `${bg} ${border}` : "bg-zinc-900/50 border-zinc-800/50 opacity-40"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${enabled ? dotColor : "bg-zinc-600"}`} />
                                                        <span className={`text-[10px] ${enabled ? "text-zinc-300" : "text-zinc-600 line-through"}`}>{label}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-sm font-bold ${enabled ? textColor : "text-zinc-600"}`}>{s.count}</span>
                                                        {rate !== null && <span className={`text-[9px] ml-2 ${enabled ? "text-zinc-500" : "text-zinc-700"}`}>({rate}% rev.)</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                                        <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-1">Combined Reversal Rate</div>
                                        <div className="text-2xl font-bold text-emerald-400">{stats.rate}%</div>
                                        <div className="text-[10px] text-zinc-500">{stats.reversals} preceded a &gt;3% reversal within 30 days</div>
                                    </div>

                                    {/* Baseline control — is the rate better than random dates? */}
                                    {baseline && (
                                        <div className={`mt-3 rounded-xl p-4 border ${baseline.beatsChance ? "bg-emerald-500/5 border-emerald-500/15" : "bg-amber-500/5 border-amber-500/15"}`}>
                                            <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: baseline.beatsChance ? "#34d399" : "#fbbf24" }}>
                                                vs. Random Dates (control)
                                            </div>
                                            <div className="flex items-end gap-4 mb-2">
                                                <div>
                                                    <div className="text-[9px] text-zinc-500">Random baseline</div>
                                                    <div className="text-lg font-bold text-zinc-300">{baseline.baselinePct}%</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-zinc-500">Lift</div>
                                                    <div className={`text-lg font-bold ${baseline.liftPp > 0 ? "text-emerald-400" : "text-red-400"}`}>{baseline.liftPp > 0 ? "+" : ""}{baseline.liftPp}pp</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-zinc-500">Significance</div>
                                                    <div className={`text-sm font-bold font-mono ${baseline.beatsChance ? "text-emerald-400" : "text-amber-400"}`}>{formatPValue(baseline.pValue)}</div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                                {baseline.beatsChance
                                                    ? "Confluence reversals occur more often than at random dates — beats chance."
                                                    : "The reversal rate is not distinguishable from picking random dates. The ±2.5% tolerance makes confluences easy to satisfy, so a high raw rate alone is not evidence."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-zinc-500">Not enough data to analyze. Try &ldquo;All Time&rdquo;.</div>
                            )}
                        </div>

                        {/* Next Transit */}
                        <div className="glass-card p-5 border border-white/5 bg-purple-900/5">
                            <h3 className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-3 flex items-center gap-2"><Clock size={14} /> Next Major Transit</h3>
                            {nextTransit && (
                                <div>
                                    <div className="text-sm font-bold text-zinc-200 mb-1">{nextTransit.name}</div>
                                    <div className="text-xs font-mono text-zinc-500 mb-2">{nextTransit.date}</div>
                                    <p className="text-[11px] text-purple-300/60 leading-relaxed line-clamp-3">{nextTransit.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Confluences List — below chart, full width, multi-column */}
                {confluences.length > 0 && (
                    <div className="mt-6 glass-card p-5 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2"><Target size={14} className="text-purple-400" /> Confluence Timeline</h3>
                                <p className="text-[9px] text-zinc-600 mt-0.5">Click any to pin its Fibonacci levels on the chart · Hover chart orbs for details</p>
                            </div>
                            <span className="text-[10px] text-zinc-600">Showing {Math.min(confluences.length, 20)} of {confluences.length}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {confluences.slice(-20).reverse().map((c, i) => {
                                const isActive = pinnedConfluence?.date === c.date;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => handlePinConfluence(c)}
                                        className={`flex items-center gap-3 text-[11px] p-3 rounded-lg border transition-all cursor-pointer text-left ${isActive ? "border-purple-500/50 bg-purple-500/10" : "border-white/5 bg-white/[0.02] hover:border-purple-500/20 hover:bg-purple-500/[0.03]"
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.eventCategory === "heavy" ? "bg-red-500" : c.eventCategory === "mercury" ? "bg-purple-400" : "bg-yellow-400"}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-zinc-300 truncate">{c.eventLabel}</div>
                                            <div className="text-[9px] text-zinc-600 font-mono">{c.date}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-mono text-zinc-400">Fib {(c.fibRatio * 100).toFixed(1)}%</div>
                                            <div className="text-[9px] text-zinc-600">${c.price.toFixed(0)}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pinned Confluence Detail */}
                <AnimatePresence>
                    {pinnedConfluence && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="mt-6 glass-card border border-purple-500/20 p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-100">{pinnedConfluence.eventLabel} · {pinnedConfluence.date}</h3>
                                    <p className="text-xs text-zinc-400">
                                        Price: <strong className="text-zinc-200">${pinnedConfluence.price.toFixed(2)}</strong>
                                        {" "}· Fibonacci {(pinnedConfluence.fibRatio * 100).toFixed(1)}% level at ${pinnedConfluence.fibPrice.toFixed(2)}
                                        {" "}(distance: {(pinnedConfluence.priceDist * 100).toFixed(2)}%)
                                        {" "}· Swing range #{pinnedConfluence.fibRangeIdx + 1} of {fibRanges.length}
                                    </p>
                                </div>
                                <button onClick={() => setPinnedConfluence(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={16} /></button>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">{pinnedConfluence.eventDescription}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Educational Panel */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="glass-card p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={14} className="text-blue-400" />
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">How Fibonacci Works</h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            The system detects <strong className="text-zinc-300">structural swing highs and lows</strong> (local peaks and valleys). Between each consecutive pair, it draws Fibonacci retracement levels at <span className="text-blue-400">23.6%</span>, <span className="text-cyan-400">38.2%</span>, <span className="text-yellow-400">50.0%</span>, <span className="text-orange-400">61.8%</span>, and <span className="text-red-400">78.6%</span>. These represent psychologically significant price zones where the market is most likely to find support or resistance.
                        </p>
                    </div>
                    <div className="glass-card p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Target size={14} className="text-purple-400" />
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">What is a Confluence?</h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            A <strong className="text-purple-400">Confluence Node</strong> fires when the market&apos;s price sits within ±2.5% of a Fibonacci level at the exact same moment a major astrological event occurs (±7 days). This combines <em>price geometry</em> (Fibonacci) with <em>time geometry</em> (planetary cycles). <strong className="text-zinc-300">Hover</strong> any orb on the chart for details, or <strong className="text-zinc-300">click</strong> an event in the timeline below to pin its Fibonacci range.
                        </p>
                    </div>
                    <div className="glass-card p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity size={14} className="text-emerald-400" />
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Reading the Chart</h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            <strong className="text-purple-300">Purple bands</strong> = Mercury retrograde periods. <strong className="text-red-300">Red vertical lines</strong> = heavy planetary tensions (moments of market stress that can trigger <em>reversals</em> — either bounces from support or breakdowns from resistance). <strong className="text-zinc-300">Dashed horizontals</strong> = Fibonacci levels. <strong className="text-purple-400">Glowing orbs</strong> = Confluence Nodes. <strong className="text-zinc-300">Reversal ≠ drop</strong>: this module measures <em>directional change</em>, not direction itself.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
