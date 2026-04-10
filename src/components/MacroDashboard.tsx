// ============================================================
// MacroDashboard - Interactive Astrological Timeline
// ============================================================
"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { generateMacroTimeline, PLANETARY_TRANSITS, pearsonCorrelation } from "@/lib/macro-algorithm";
import { GEO_EVENTS, type EventCategory } from "@/lib/geo-events";
import Header from "./Header";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Activity, Map, ArrowRight, ShieldAlert, Zap, Globe2, BarChart2, ChevronDown, TrendingUp, TrendingDown, Check } from "lucide-react";
import { OVERLAY_INDICES } from "@/lib/overlay-indices";
import { useTranslations } from "next-intl";

export default function MacroDashboard() {
    const t = useTranslations("macroDashboard");
    const [timeRange, setTimeRange] = useState<"1Y" | "5Y" | "10Y" | "MAX" | "FORECAST">("MAX");
    const [allMarketData, setAllMarketData] = useState<Record<string, { date: string; price: number }[]>>({});
    const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());
    const [overlayDropdownOpen, setOverlayDropdownOpen] = useState(false);
    const [activeCategories, setActiveCategories] = useState<Record<EventCategory, boolean>>({
        crisis: true,
        war: true,
        tech_boom: true,
        policy: true
    });
    const [expandedTransit, setExpandedTransit] = useState<string | null>(null);

    useEffect(() => {
        // Fetch real market history silently
        fetch("/api/macro")
            .then(res => res.json())
            .then(data => {
                const result: Record<string, { date: string; price: number }[]> = {};
                for (const idx of OVERLAY_INDICES) {
                    if (data[idx.key]?.length) result[idx.key] = data[idx.key];
                }
                setAllMarketData(result);
            })
            .catch(e => console.error("Failed to fetch real macro data", e));
    }, []);

    // Calculate dynamic dates
    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();

        if (timeRange === "FORECAST") {
            start.setFullYear(end.getFullYear() - 2); // Show couple years back for context
            end.setFullYear(end.getFullYear() + 8);   // Forecast out to ~2034
        } else {
            // Pad the end date slightly into the future to show emerging trends
            end.setMonth(end.getMonth() + 6);
            if (timeRange === "1Y") start.setFullYear(end.getFullYear() - 1);
            else if (timeRange === "5Y") start.setFullYear(end.getFullYear() - 5);
            else if (timeRange === "10Y") start.setFullYear(end.getFullYear() - 10);
            else start.setFullYear(2000);
        }

        return {
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0]
        };
    }, [timeRange]);

    // Generate timeline data
    const timelineData = useMemo(() => {
        return generateMacroTimeline(startDate, endDate, 500);
    }, [startDate, endDate]);

    // Filter Geopolitical events that fall within our timeframe and active categories
    const visibleEvents = useMemo(() => {
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();

        return GEO_EVENTS.filter(evt => {
            const time = new Date(evt.date).getTime();
            return time >= startMs && time <= endMs && activeCategories[evt.category];
        });
    }, [startDate, endDate, activeCategories]);

    const toggleCategory = (cat: EventCategory) => {
        setActiveCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    // ECharts Configuration
    const chartOptions = useMemo(() => {
        const dates = timelineData.map(d => d.date);
        const turbulence = timelineData.map(d => ({
            value: d.turbulenceIndex,
            activeTransits: d.activeTransits
        }));

        // Map market data for each active overlay
        const overlayData: Record<string, (number | undefined)[]> = {};
        for (const idx of OVERLAY_INDICES) {
            const rawData = allMarketData[idx.key] || [];
            if (!rawData.length) continue;
            overlayData[idx.key] = timelineData.map(d => {
                const targetTime = d.timestamp;
                let closestPrice: number | null = null;
                let minDiff = Infinity;
                for (const pt of rawData) {
                    const diff = Math.abs(new Date(pt.date).getTime() - targetTime);
                    if (diff < minDiff) { minDiff = diff; closestPrice = pt.price; }
                }
                return minDiff < 45 * 86400000 ? (closestPrice ?? undefined) : undefined;
            });
        }

        const colorMap: Record<EventCategory, string> = {
            crisis: "#ef4444",
            war: "#f97316",
            tech_boom: "#06b6d4",
            policy: "#8b5cf6"
        };
        const eventMap: Record<string, any> = {};

        // Map events to ECharts markPoints on the Turbulence line
        const markPoints = visibleEvents.map(evt => {
            // Find closest data point
            const closest = timelineData.reduce((prev, curr) => {
                return (Math.abs(curr.timestamp - new Date(evt.date).getTime()) < Math.abs(prev.timestamp - new Date(evt.date).getTime()) ? curr : prev);
            });
            eventMap[closest.date] = evt;

            return {
                name: evt.title,
                coord: [closest.date, closest.turbulenceIndex],
                value: evt.title,
                itemStyle: { color: colorMap[evt.category] },
                symbolSize: 14,
            };
        });

        const series: any[] = [
            {
                name: "Macro Turbulence",
                type: "line",
                data: turbulence,
                smooth: true,
                symbol: "none",
                lineStyle: { width: 3, color: "#eab308" },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(239, 68, 68, 0.3)" }, // Red/Tension
                            { offset: 0.5, color: "rgba(234, 179, 8, 0.1)" }, // Amber/Neutral
                            { offset: 1, color: "rgba(34, 197, 94, 0.05)" } // Green/Fluidity
                        ]
                    }
                },
                markPoint: {
                    symbol: "circle",
                    data: markPoints,
                    label: { show: false },
                },
                yAxisIndex: 0,
            }
        ];

        // Dynamically add series for active overlays
        const activeIndices = OVERLAY_INDICES.filter(idx => activeOverlays.has(idx.key) && overlayData[idx.key]);
        activeIndices.forEach((idx, i) => {
            series.push({
                name: idx.label,
                type: "line",
                data: (overlayData[idx.key] || []).map(v => v ?? null),
                smooth: true,
                symbol: "none",
                lineStyle: { width: 2, color: idx.color, opacity: 0.8 },
                yAxisIndex: 1 + i,
            });
        });

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(255,255,255,0.1)",
                padding: 16,
                borderRadius: 12,
                textStyle: { color: "#fff" },
                axisPointer: { type: "cross", crossStyle: { color: "#52525b" } },
                formatter: (params: any) => {
                    const dataParams = Array.isArray(params) ? params : [params];
                    if (!dataParams.length) return "";

                    const dateStr = dataParams[0].name;
                    let html = `<div style="font-family: inherit; font-size: 12px; margin-bottom: 12px; color: #a1a1aa"><strong>${dateStr}</strong></div>`;

                    dataParams.forEach(p => {
                        if (p.value === undefined || p.value === null) return;
                        if (p.componentType === 'markPoint') return;

                        // Safely extract the value (handles object wraps from Echarts if any)
                        const rawVal = typeof p.value === 'object' && p.value !== null ? (p.value as any).value || p.value : p.value;

                        html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 32px; margin-bottom: 6px; font-size: 13px;">
                            <span style="display: flex; align-items: center; gap: 6px; color: #d4d4d8;">
                                ${p.marker}
                                ${p.seriesName}
                            </span>
                            <strong style="color: #fff;">${rawVal}</strong>
                        </div>`;
                    });

                    // Add underlying transits powering the Turbulence calculation!
                    const macroData = dataParams.find((p: any) => p.seriesName === "Macro Turbulence");
                    if (macroData && macroData.data && macroData.data.activeTransits) {
                        html += `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);">
                            <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Driving Transits</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${(macroData.data.activeTransits as string[]).map((t: string) =>
                            `<span style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: ${t.includes('Tension') ? 'rgba(239, 68, 68, 0.15)' : t.includes('Fluidity') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)'}; color: ${t.includes('Tension') ? '#fca5a5' : t.includes('Fluidity') ? '#86efac' : '#a1a1aa'}; border: 1px solid ${t.includes('Tension') ? 'rgba(239, 68, 68, 0.2)' : t.includes('Fluidity') ? 'rgba(34, 197, 94, 0.2)' : 'transparent'};">
                                        ${t.replace("Tension: ", "").replace("Fluidity: ", "")}
                                    </span>`
                        ).join("")}
                            </div>
                        </div>
                        `;
                    }

                    const evt = eventMap[dateStr];
                    if (evt) {
                        const evtColor = colorMap[evt.category as EventCategory] || "#fbbf24";
                        html += `
                        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
                            <div style="font-weight: bold; font-size: 14px; color: ${evtColor}; margin-bottom: 4px;">${evt.title}</div>
                            <div style="font-size: 12px; color: #d4d4d8; margin-bottom: 10px; white-space: normal; line-height: 1.4; max-width: 260px;">${evt.description}</div>
                            <div style="font-size: 10px; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(251, 191, 36, 0.2); display: inline-block;">
                                ✦ Aspects: ${evt.astrologicalSignatures?.join(", ") || "None"}
                            </div>
                        </div>
                        `;
                    }
                    return `<div style="min-width: 220px;">${html}</div>`;
                }
            },
            grid: { left: "2%", right: "2%", bottom: "10%", top: "15%", containLabel: true },
            xAxis: {
                type: "category",
                data: dates,
                boundaryGap: false,
                axisLabel: {
                    color: "#a1a1aa",
                    fontSize: 10,
                    formatter: (val: string) => {
                        const d = new Date(val);
                        return timeRange === "MAX" || timeRange === "10Y" ? d.getFullYear() : `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
                    }
                },
                axisLine: { lineStyle: { color: "#52525b" } },
                splitLine: { show: true, lineStyle: { color: "rgba(82, 82, 91, 0.2)", type: "dashed" } }
            },
            yAxis: [
                {
                    type: "value",
                    name: "Level of Turbulence",
                    min: 0, max: 100,
                    nameTextStyle: { color: "#a1a1aa", fontSize: 10, padding: [0, 0, 0, 20] },
                    axisLabel: { color: "#a1a1aa", fontSize: 10 },
                    splitLine: { show: false }
                },
                // Dynamic y-axes for active overlays
                ...activeIndices.map((idx, i) => ({
                    type: "value",
                    show: true,
                    min: "dataMin", max: "dataMax",
                    position: i % 2 === 0 ? "right" : "right",
                    offset: i * 50,
                    axisLabel: { color: idx.color, fontSize: 10 },
                    splitLine: { show: false }
                })),
            ],
            dataZoom: [
                { type: "inside", start: 0, end: 100 },
                { type: "slider", show: true, bottom: 5, height: 20, borderColor: "transparent", backgroundColor: "rgba(0,0,0,0.2)", fillerColor: "rgba(234, 179, 8, 0.1)", handleStyle: { color: "#eab308" } }
            ],
            series
        };
    }, [timelineData, visibleEvents, timeRange, activeOverlays, allMarketData]);

    return (
        <div className="min-h-screen">
            <Header />

            <div className="p-6 max-w-[1600px] mx-auto">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl" style={{ background: "rgba(234, 179, 8, 0.1)", color: "#eab308" }}>
                                <Globe2 size={24} />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">{t("title")}</h1>
                        </div>
                        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                            {t("subtitle")}
                        </p>
                    </div>

                    {/* Top Right Controls */}
                    <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
                        {(["1Y", "5Y", "10Y", "MAX", "FORECAST"] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${timeRange === range ? (range === "FORECAST" ? "bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/30" : "bg-zinc-800 text-white shadow-sm") : (range === "FORECAST" ? "text-purple-500 hover:text-purple-300 hover:bg-purple-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Main Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Column: Filters & Toggles */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Event Overlays */}
                        <div className="glass-card p-5">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <Map size={14} /> {t("geopoliticalOverlay")}
                            </h3>
                            <div className="space-y-2">
                                <button onClick={() => toggleCategory("crisis")} className={`w-full flex justify-between items-center p-2.5 rounded-xl border transition-all ${activeCategories.crisis ? "bg-red-500/10 border-red-500/20 text-red-400" : "border-white/5 text-zinc-500 hover:bg-white/5"}`}>
                                    <span className="text-sm font-medium flex items-center gap-2"><ShieldAlert size={16} /> {t("financialCrises")}</span>
                                    <div className={`w-3 h-3 rounded-full border ${activeCategories.crisis ? "bg-red-500 border-red-500" : "border-zinc-700"}`} />
                                </button>
                                <button onClick={() => toggleCategory("war")} className={`w-full flex justify-between items-center p-2.5 rounded-xl border transition-all ${activeCategories.war ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "border-white/5 text-zinc-500 hover:bg-white/5"}`}>
                                    <span className="text-sm font-medium flex items-center gap-2"><Activity size={16} /> {t("warsConflicts")}</span>
                                    <div className={`w-3 h-3 rounded-full border ${activeCategories.war ? "bg-orange-500 border-orange-500" : "border-zinc-700"}`} />
                                </button>
                                <button onClick={() => toggleCategory("tech_boom")} className={`w-full flex justify-between items-center p-2.5 rounded-xl border transition-all ${activeCategories.tech_boom ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "border-white/5 text-zinc-500 hover:bg-white/5"}`}>
                                    <span className="text-sm font-medium flex items-center gap-2"><Sparkles size={16} /> {t("techBooms")}</span>
                                    <div className={`w-3 h-3 rounded-full border ${activeCategories.tech_boom ? "bg-cyan-500 border-cyan-500" : "border-zinc-700"}`} />
                                </button>
                                <button onClick={() => toggleCategory("policy")} className={`w-full flex justify-between items-center p-2.5 rounded-xl border transition-all ${activeCategories.policy ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "border-white/5 text-zinc-500 hover:bg-white/5"}`}>
                                    <span className="text-sm font-medium flex items-center gap-2"><Zap size={16} /> {t("policyShifts")}</span>
                                    <div className={`w-3 h-3 rounded-full border ${activeCategories.policy ? "bg-purple-500 border-purple-500" : "border-zinc-700"}`} />
                                </button>
                            </div>
                        </div>

                        {/* Asset Correlation */}
                        <div className="glass-card p-5">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <BarChart2 size={14} /> {t("compareAssets")}
                            </h3>
                            <div className="relative">
                                <button
                                    onClick={() => setOverlayDropdownOpen(!overlayDropdownOpen)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] transition-all cursor-pointer"
                                >
                                    <span className="text-sm text-zinc-300">
                                        {activeOverlays.size === 0 ? t("selectIndices") : `${activeOverlays.size} ${t("active")}`}
                                    </span>
                                    <ChevronDown size={14} className={`text-zinc-500 transition-transform ${overlayDropdownOpen ? "rotate-180" : ""}`} />
                                </button>
                                {overlayDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-1 z-50 py-1 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl">
                                        {OVERLAY_INDICES.map(idx => {
                                            const isActive = activeOverlays.has(idx.key);
                                            return (
                                                <button
                                                    key={idx.key}
                                                    onClick={() => {
                                                        setActiveOverlays(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(idx.key)) next.delete(idx.key);
                                                            else next.add(idx.key);
                                                            return next;
                                                        });
                                                    }}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${isActive ? "bg-white/[0.04]" : ""
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive ? "border-transparent" : "border-zinc-700"
                                                        }`} style={{ background: isActive ? idx.color : "transparent" }}>
                                                        {isActive && <Check size={10} className="text-white" />}
                                                    </div>
                                                    <span className="w-2 h-2 rounded-full" style={{ background: idx.color }} />
                                                    <span className={`text-sm ${isActive ? "text-white font-medium" : "text-zinc-400"}`}>{idx.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {activeOverlays.size > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {OVERLAY_INDICES.filter(idx => activeOverlays.has(idx.key)).map(idx => (
                                        <span key={idx.key} className="text-[10px] px-2 py-1 rounded-md border flex items-center gap-1.5" style={{ borderColor: `${idx.color}33`, background: `${idx.color}11`, color: idx.color }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: idx.color }} />
                                            {idx.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Current Status Box */}
                        {(() => {
                            // Compute today's turbulence independently of the timeline range
                            const todayStr = new Date().toISOString().split("T")[0];
                            const todayData = generateMacroTimeline(todayStr, todayStr, 1)[0];
                            const turb = todayData?.turbulenceIndex ?? 0;
                            const label = turb > 80 ? t("extremeTension") : turb > 60 ? t("highTension") : turb > 40 ? t("elevatedTension") : turb > 25 ? t("moderateTension") : turb > 10 ? t("lowTension") : t("deepFluidity");
                            const labelColor = turb > 60 ? "text-red-400" : turb > 40 ? "text-orange-400" : turb > 20 ? "text-amber-400/80" : "text-emerald-400";
                            const glowColor = turb > 60 ? "bg-red-500/20" : turb > 40 ? "bg-orange-500/20" : "bg-amber-500/20";
                            const transits = todayData?.activeTransits?.filter(t => t !== "Neutral Zone") || [];

                            // Find next upcoming transit
                            const now = Date.now();
                            const nextTransit = PLANETARY_TRANSITS.find(t => new Date(t.date).getTime() > now);

                            return (
                                <div className="glass-card p-5 relative overflow-hidden">
                                    <div className={`absolute -right-4 -top-4 w-24 h-24 ${glowColor} blur-2xl rounded-full`} />
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">{t("todayReading")}</h3>
                                    <div className="text-[10px] text-zinc-600 mb-2">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                                    <div className="text-4xl font-bold text-amber-500 mb-1">
                                        {turb} <span className="text-lg text-zinc-500 font-medium">/ 100</span>
                                    </div>
                                    <div className={`text-sm font-medium ${labelColor}`}>{label}</div>
                                    {transits.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {transits.map((t, i) => (
                                                <span key={i} className={`text-[9px] px-2 py-0.5 rounded-md ${t.includes("Tension") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                                                    {t.replace("Tension: ", "").replace("Fluidity: ", "")}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {nextTransit && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <div className="text-[10px] text-zinc-500 mb-1">{t("nextHeavyTransit")}</div>
                                            <div className="text-xs text-zinc-300">{nextTransit.name} ({new Date(nextTransit.date).getFullYear()})</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Right Column: Chart */}
                    <div className="lg:col-span-3">
                        <div className="glass-card p-1 min-h-[600px] h-full flex flex-col">
                            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-semibold text-white">{t("turbulenceOscillator")}</div>
                                    <div className="text-xs text-zinc-500">{t("turbulenceSubtitle")}</div>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> {t("financialCrises")}</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> {t("warsConflicts")}</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-500" /> {t("techBooms")}</div>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-[500px]">
                                <ReactECharts
                                    option={chartOptions}
                                    style={{ height: "100%", width: "100%" }}
                                    opts={{ renderer: "canvas" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ NEW: Positions Panel + Correlation Meters ═══════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                    {/* ── Planetary Transits Accordion ─────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <Globe2 size={14} /> {t("planetaryPositions")}
                        </h3>
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                            {(() => {
                                const startMs = new Date(startDate).getTime();
                                const endMs = new Date(endDate).getTime();
                                const visible = PLANETARY_TRANSITS.filter(t => {
                                    const tMs = new Date(t.date).getTime();
                                    return tMs >= startMs && tMs <= endMs;
                                });
                                if (visible.length === 0) return <div className="text-xs text-zinc-600 italic py-4">{t("noMajorTransits")}</div>;
                                return visible.map(transit => {
                                    const isOpen = expandedTransit === `${transit.name}-${transit.date}`;
                                    const isFuture = new Date(transit.date) > new Date();
                                    return (
                                        <button
                                            key={`${transit.name}-${transit.date}`}
                                            onClick={() => setExpandedTransit(isOpen ? null : `${transit.name}-${transit.date}`)}
                                            className={`w-full text-left rounded-xl border transition-all duration-200 ${isOpen
                                                ? (transit.type === "tension" ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20")
                                                : "border-white/5 hover:bg-white/[0.02]"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${transit.type === "tension" ? "bg-red-500" : "bg-emerald-500"}`} />
                                                    <div>
                                                        <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                                            {transit.name}
                                                            {isFuture && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">FORECAST</span>}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500">
                                                            {new Date(transit.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                                                            <span className="ml-2 px-1 rounded text-[9px]" style={{
                                                                background: transit.type === "tension" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                                                                color: transit.type === "tension" ? "#fca5a5" : "#86efac"
                                                            }}>
                                                                {transit.type === "tension" ? t("tension") : t("fluidity")} · {transit.intensity}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronDown size={14} className={`text-zinc-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                            </div>
                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                                        <div className="px-3 pb-3 pt-0">
                                                            <div className="text-xs text-zinc-400 leading-relaxed pl-5 border-l border-white/5">
                                                                {transit.description}
                                                            </div>
                                                            <div className="mt-2 pl-5 flex items-center gap-4">
                                                                <div className="text-[10px] text-zinc-600">{t("spread")} ~{Math.round(transit.spreadDays / 30)} months</div>
                                                                <div className="text-[10px] text-zinc-600">{t("impactWindow")} {new Date(new Date(transit.date).getTime() - transit.spreadDays * 86400000).getFullYear()} – {new Date(new Date(transit.date).getTime() + transit.spreadDays * 86400000).getFullYear()}</div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </motion.div>

                    {/* ── Correlation Meters ───────────────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <BarChart2 size={14} /> {t("regimeAnalysis")}
                        </h3>
                        <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                            {t("regimeSubtitle")}
                        </p>
                        {(() => {
                            const spPairs: { turb: number, price: number }[] = [];
                            const btcPairs: { turb: number, price: number }[] = [];
                            const realSp500 = allMarketData["sp500"] || [];
                            const realBtc = allMarketData["btc"] || [];

                            timelineData.forEach((d) => {
                                if (realSp500.length) {
                                    let best = Infinity, bestP = 0;
                                    for (const pt of realSp500) {
                                        const diff = Math.abs(new Date(pt.date).getTime() - d.timestamp);
                                        if (diff < best) { best = diff; bestP = pt.price; }
                                    }
                                    if (best < 45 * 86400000) spPairs.push({ turb: d.turbulenceIndex, price: bestP });
                                }
                                if (realBtc.length) {
                                    let best = Infinity, bestP = 0;
                                    for (const pt of realBtc) {
                                        const diff = Math.abs(new Date(pt.date).getTime() - d.timestamp);
                                        if (diff < best) { best = diff; bestP = pt.price; }
                                    }
                                    if (best < 45 * 86400000) btcPairs.push({ turb: d.turbulenceIndex, price: bestP });
                                }
                            });

                            const analyze = (pairs: { turb: number, price: number }[]) => {
                                const data: { turb: number, ret: number }[] = [];
                                for (let i = 1; i < pairs.length; i++) {
                                    if (pairs[i - 1].price > 0) {
                                        data.push({ turb: pairs[i].turb, ret: ((pairs[i].price - pairs[i - 1].price) / pairs[i - 1].price) * 100 });
                                    }
                                }
                                const crisis = data.filter(d => d.turb > 65);
                                const fluid = data.filter(d => d.turb < 25);
                                const neutral = data.filter(d => d.turb >= 25 && d.turb <= 65);
                                const avg = (arr: typeof data) => arr.length > 0 ? arr.reduce((s, d) => s + d.ret, 0) / arr.length : 0;
                                const negPct = (arr: typeof data) => arr.length > 0 ? (arr.filter(d => d.ret < 0).length / arr.length) * 100 : 0;
                                const posPct = (arr: typeof data) => arr.length > 0 ? (arr.filter(d => d.ret > 0).length / arr.length) * 100 : 0;
                                const prsn = pearsonCorrelation(data.map(d => d.turb), data.map(d => d.ret));
                                const diff = avg(fluid) - avg(crisis);
                                return { avgCrisis: avg(crisis), avgFluid: avg(fluid), avgNeutral: avg(neutral), crisisNeg: negPct(crisis), fluidPos: posPct(fluid), crisisN: crisis.length, fluidN: fluid.length, neutralN: neutral.length, pearson: prsn, total: data.length, diff };
                            };

                            const sp = analyze(spPairs);
                            const btc = analyze(btcPairs);

                            const renderAsset = (name: string, s: typeof sp, accent: string, bgClass: string) => (
                                <div className="glass-card border border-white/5 overflow-hidden">
                                    <div className={`px-4 py-3 ${bgClass} flex items-center justify-between`}>
                                        <span className="text-sm font-semibold text-white">{name}</span>
                                        <span className="text-[10px] text-zinc-400">{s.total} monthly returns · Yahoo Finance</span>
                                    </div>
                                    <div className="grid grid-cols-3 divide-x divide-white/5">
                                        <div className="p-4 text-center">
                                            <div className="text-[9px] uppercase tracking-widest text-red-400/70 mb-2 font-semibold">🔴 {t("highTurb")}</div>
                                            <div className="text-[10px] text-zinc-600 mb-1">Index &gt; 65</div>
                                            <div className={`text-2xl font-bold ${s.avgCrisis < 0 ? "text-red-400" : "text-amber-400"}`}>
                                                {s.avgCrisis > 0 ? "+" : ""}{s.avgCrisis.toFixed(1)}%
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-1">{t("avgMonthlyReturn")}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2">{s.crisisN} {t("months")}</div>
                                            <div className="text-[10px] text-red-400/60 mt-0.5">{s.crisisNeg.toFixed(0)}{t("wereNegative")}</div>
                                        </div>
                                        <div className="p-4 text-center">
                                            <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">⚪ {t("neutral")}</div>
                                            <div className="text-[10px] text-zinc-600 mb-1">Index 25–65</div>
                                            <div className="text-2xl font-bold text-zinc-300">
                                                {s.avgNeutral > 0 ? "+" : ""}{s.avgNeutral.toFixed(1)}%
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-1">{t("avgMonthlyReturn")}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2">{s.neutralN} {t("months")}</div>
                                        </div>
                                        <div className="p-4 text-center">
                                            <div className="text-[9px] uppercase tracking-widest text-emerald-400/70 mb-2 font-semibold">🟢 {t("lowTurb")}</div>
                                            <div className="text-[10px] text-zinc-600 mb-1">Index &lt; 25</div>
                                            <div className={`text-2xl font-bold ${s.avgFluid > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {s.avgFluid > 0 ? "+" : ""}{s.avgFluid.toFixed(1)}%
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-1">{t("avgMonthlyReturn")}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2">{s.fluidN} {t("months")}</div>
                                            <div className="text-[10px] text-emerald-400/60 mt-0.5">{s.fluidPos.toFixed(0)}{t("werePositive")}</div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 border-t border-white/5 bg-black/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-zinc-500"><span className="font-semibold text-zinc-400">{t("yieldGap")}</span> {t("yieldGapDetail")}</span>
                                            <span className={`text-lg font-bold ${s.diff > 0 ? "text-amber-400" : "text-zinc-500"}`}>
                                                {s.diff > 0 ? "+" : ""}{s.diff.toFixed(1)}%<span className="text-xs text-zinc-500 font-normal">/month</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-2">
                                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(s.diff) * 12)}%`, background: `linear-gradient(90deg, ${accent}30, ${accent})` }} />
                                        </div>
                                        <div className="text-[10px] text-zinc-600 mt-1.5 text-right">Pearson ρ = {s.pearson.toFixed(3)}</div>
                                    </div>
                                </div>
                            );

                            return (
                                <div className="space-y-4">
                                    {realSp500.length > 0 ? renderAsset("S&P 500", sp, "#3b82f6", "bg-blue-500/5")
                                        : <div className="text-xs text-zinc-600 italic p-3">{t("loadingSP500")}</div>}
                                    {realBtc.length > 0 ? renderAsset("Bitcoin (BTC)", btc, "#f97316", "bg-orange-500/5")
                                        : <div className="text-xs text-zinc-600 italic p-3">{t("loadingBTC")}</div>}
                                    {(realSp500.length > 0 || realBtc.length > 0) && (
                                        <div className="glass-card p-4 border border-amber-500/10 bg-amber-500/[0.02]">
                                            <div className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2 font-semibold">{t("interpretation")}</div>
                                            <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                                                <p>{t("interpretationP1")}</p>
                                                <p>{t("interpretationP2")}</p>
                                                <p className="text-zinc-500 italic">{t("interpretationP3")}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
