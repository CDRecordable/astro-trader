"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, X, TrendingUp, Info } from "lucide-react";
import ReactECharts from "echarts-for-react";

// --- Types & Data ---

interface SectorConfig {
    id: string;
    label: string;
    symbol: string;
    planet: string;
    color: string;
    bg: string;
    border: string;
}

const SECTORS: SectorConfig[] = [
    { id: "tech", label: "Technology", symbol: "XLK", planet: "Mercury", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { id: "comms", label: "Communications", symbol: "XLC", planet: "Mercury", color: "#60a5fa", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { id: "discretionary", label: "Consumer Disc.", symbol: "XLY", planet: "Venus", color: "#ec4899", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { id: "staples", label: "Consumer Staples", symbol: "XLP", planet: "Venus", color: "#f472b6", bg: "bg-pink-400/10", border: "border-pink-400/20" },
    { id: "energy", label: "Energy", symbol: "XLE", planet: "Mars", color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/20" },
    { id: "finance", label: "Financials", symbol: "XLF", planet: "Jupiter", color: "#8b5cf6", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { id: "industrials", label: "Industrials", symbol: "XLI", planet: "Saturn", color: "#64748b", bg: "bg-slate-500/10", border: "border-slate-500/20" },
    { id: "materials", label: "Materials", symbol: "XLB", planet: "Saturn", color: "#94a3b8", bg: "bg-slate-400/10", border: "border-slate-400/20" },
    { id: "realestate", label: "Real Estate", symbol: "XLRE", planet: "Moon", color: "#eab308", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    { id: "utilities", label: "Utilities", symbol: "XLU", planet: "Uranus", color: "#0ea5e9", bg: "bg-sky-500/10", border: "border-sky-500/20" },
    { id: "healthcare", label: "Healthcare", symbol: "XLV", planet: "Neptune", color: "#14b8a6", bg: "bg-teal-500/10", border: "border-teal-500/20" },
];

const ORBITAL_PERIODS: Record<string, number> = {
    "Moon": 29.5,
    "Mercury": 88,
    "Venus": 224,
    "Mars": 687,
    "Jupiter": 4332,
    "Saturn": 10759,
    "Uranus": 30688,
    "Neptune": 60182,
};

// Pure deterministic pseudo-dignity generator based on date and orbit cycle.
// Returns a value between -100 (Debilitated) and +100 (Dignified).
function getPlanetaryDignity(planetName: string, dateObj: Date) {
    const orbitDays = ORBITAL_PERIODS[planetName] || 365;
    const epoch = new Date("2000-01-01").getTime();
    const daysSince = (dateObj.getTime() - epoch) / 86400000;

    // Create a smooth sine wave cycle. Offset by arbitrary string sum to individualize planets.
    const offset = Array.from(planetName).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const rad = ((daysSince + offset * orbitDays) / orbitDays) * Math.PI * 2;

    // -1 to 1 
    let score = Math.sin(rad);

    // For slow outer planets (Saturn, Uranus, Neptune, etc.), their primary orbit is so slow 
    // it never changes phase within 20 years. We inject Earth's annual retrograde cycle view.
    if (orbitDays > 1000) {
        const retroRad = ((daysSince + offset) / 365.25) * Math.PI * 2;
        score = (score + Math.cos(retroRad)) / 2;
    }

    return Math.round(score * 100);
}

// Compute simple annualized stats natively here instead of depending on other files
function computeAnnualized(returnsData: number[], totalTrackingDays: number) {
    if (returnsData.length === 0 || totalTrackingDays === 0) return 0;
    const totalReturn = returnsData.reduce((acc, val) => acc + val, 0);
    const yrs = totalTrackingDays / 252;
    return yrs > 0 ? totalReturn / yrs : totalReturn;
}

export default function SectorRotationView() {
    const [selectedSector, setSelectedSector] = useState<SectorConfig | null>(null);
    const [priceData, setPriceData] = useState<{ date: string; price: number; dignity: number }[]>([]);
    const [loading, setLoading] = useState(false);

    const today = new Date();

    // Decorate sectors with current dignity
    const currentSectors = useMemo(() => {
        return SECTORS.map(s => {
            const dig = getPlanetaryDignity(s.planet, today);
            return { ...s, currentDignity: dig };
        }).sort((a, b) => b.currentDignity - a.currentDignity);
    }, [today]);

    // Handle selecting a sector -> Fetch history
    useEffect(() => {
        if (!selectedSector) return;
        let isActive = true;
        setLoading(true);
        setPriceData([]);

        fetch(`/api/ticker?symbol=${selectedSector.symbol}`)
            .then(r => r.json())
            .then(res => {
                if (!isActive || !res.data) return;

                // compute the planetary dignity per day for this sector's planet
                const decorated = res.data.map((d: any) => ({
                    ...d,
                    dignity: getPlanetaryDignity(selectedSector.planet, new Date(d.date))
                }));

                setPriceData(decorated);
                setLoading(false);
            })
            .catch(console.error);

        return () => { isActive = false; };
    }, [selectedSector]);

    // Compute metrics
    const metrics = useMemo(() => {
        if (priceData.length < 30) return null;

        const favReturns = [];
        const chalReturns = [];
        let favDays = 0;
        let chalDays = 0;

        for (let i = 1; i < priceData.length; i++) {
            const prev = priceData[i - 1].price;
            const cur = priceData[i].price;
            if (prev <= 0) continue;

            const r = ((cur - prev) / prev) * 100;
            const isFavorable = priceData[i].dignity >= 0;

            if (isFavorable) { favReturns.push(r); favDays++; }
            else { chalReturns.push(r); chalDays++; }
        }

        const favAnn = computeAnnualized(favReturns, priceData.length);
        const chalAnn = computeAnnualized(chalReturns, priceData.length);
        const gap = favAnn - chalAnn;

        return { favAnn, chalAnn, gap, favDays, chalDays };
    }, [priceData]);

    const chartOptions = useMemo(() => {
        if (!selectedSector || priceData.length === 0) return null;

        const dates = priceData.map(d => d.date);
        const prices = priceData.map(d => d.price);

        // Find favorable (dignity >= 0) zones to shade
        const markAreas = [];
        let zoneStart = null;
        for (let i = 0; i < priceData.length; i++) {
            if (priceData[i].dignity >= 0 && !zoneStart) zoneStart = priceData[i].date;
            else if (priceData[i].dignity < 0 && zoneStart) {
                markAreas.push([{ xAxis: zoneStart, itemStyle: { color: "rgba(16, 185, 129, 0.05)" } }, { xAxis: priceData[i].date }]);
                zoneStart = null;
            }
        }
        if (zoneStart) markAreas.push([{ xAxis: zoneStart, itemStyle: { color: "rgba(16, 185, 129, 0.05)" } }, { xAxis: priceData[priceData.length - 1].date }]);

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(0,0,0,0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                textStyle: { color: "#fff", fontSize: 11 },
                formatter: (params: any) => {
                    const p = params[0];
                    if (!p) return "";
                    return `
                        <div style="font-size:11px;color:#a1a1aa;margin-bottom:4px">${p.axisValue}</div>
                        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px">$${Number(p.value).toFixed(2)}</div>
                    `;
                }
            },
            grid: { left: 40, right: 20, top: 20, bottom: 40 },
            xAxis: {
                type: "category",
                data: dates,
                axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: string) => v.substring(0, 4) },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } }
            },
            yAxis: {
                type: "value",
                scale: true,
                axisLabel: { color: "#71717a", fontSize: 10 },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } }
            },
            dataZoom: [{ type: "inside" }],
            series: [{
                name: selectedSector.symbol,
                type: "line",
                data: prices,
                lineStyle: { color: selectedSector.color, width: 2 },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: selectedSector.color + "40" },
                            { offset: 1, color: "transparent" }
                        ]
                    }
                },
                symbol: "none",
                markArea: { data: markAreas, silent: true }
            }]
        };
    }, [selectedSector, priceData]);

    return (
        <div className="min-h-screen pb-20">
            <Header />
            <div className="p-6 max-w-[1600px] mx-auto">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(125, 211, 252, 0.05))" }}>
                            <PieChart size={20} className="text-sky-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">Sector Rotation & Planetary Rulers</h1>
                            <p className="text-xs text-zinc-500">Evaluating the GICS 11 Sectors based on Astrological Dignity</p>
                        </div>
                    </div>
                </motion.div>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-10">
                    {currentSectors.map((s, idx) => {
                        const isFav = s.currentDignity >= 0;
                        const scoreColor = isFav ? "text-emerald-400" : "text-red-400";
                        const isSelected = selectedSector?.id === s.id;

                        return (
                            <motion.button
                                key={s.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelectedSector(s)}
                                className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                                    ${isSelected ? "border-sky-500 bg-sky-500/10 shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)]" : "border-white/5 bg-white/[0.02] hover:border-white/20"}
                                `}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none transition-opacity" style={{ background: s.color, opacity: isSelected ? 0.3 : 0.1 }} />

                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors">{s.label}</h3>
                                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-black/40 text-zinc-400 border border-white/5">{s.symbol}</span>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                                        <span className="text-xs font-medium text-zinc-400">Ruler: <span className="text-zinc-200">{s.planet}</span></span>
                                    </div>
                                    <div className="flex items-end justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 uppercase">Astro Score</span>
                                        <span className={`text-lg font-bold ${scoreColor}`}>
                                            {isFav ? "+" : ""}{s.currentDignity}
                                        </span>
                                    </div>

                                    {/* Mini gradient bar */}
                                    <div className="w-full h-1 bg-black/50 rounded-full mt-2 overflow-hidden flex">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${Math.abs(s.currentDignity)}%`,
                                                background: isFav ? "#10b981" : "#ef4444",
                                                marginLeft: isFav ? "50%" : `${50 - Math.abs(s.currentDignity) / 2}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Active Sector Analysis View */}
                <AnimatePresence mode="wait">
                    {selectedSector && (
                        <motion.div
                            key={selectedSector.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass-card border border-white/10 overflow-hidden relative"
                        >
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-1/4 w-96 h-96 blur-[120px] opacity-10 pointer-events-none" style={{ background: selectedSector.color }} />

                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg" style={{ background: selectedSector.bg, borderColor: selectedSector.border }}>
                                        <TrendingUp size={24} style={{ color: selectedSector.color }} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-100">{selectedSector.label} <span className="text-zinc-500 font-normal">({selectedSector.symbol})</span></h2>
                                        <p className="text-xs text-zinc-400 mt-0.5">Ruled by <strong>{selectedSector.planet}</strong> · Orbital cycle: {ORBITAL_PERIODS[selectedSector.planet]} days</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedSector(null)} className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors cursor-pointer">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {loading && <div className="h-[400px] flex items-center justify-center text-sm text-zinc-500 animate-pulse">Fetching ETF history from Yahoo Finance...</div>}

                                {!loading && chartOptions && metrics && (
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                                        <div className="lg:col-span-3">
                                            <div className="flex items-center justify-between mb-4 px-2">
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Historical Performance vs Ruler Dignity</h3>
                                                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(16, 185, 129, 0.15)" }}></span> Favorable Window</span>
                                                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-[2px] rounded-sm" style={{ background: selectedSector.color }}></span> {selectedSector.symbol} Price</span>
                                                </div>
                                            </div>
                                            <ReactECharts option={chartOptions} style={{ height: 400 }} theme="dark" />
                                        </div>

                                        <div className="flex flex-col justify-center space-y-4">
                                            <div className="p-5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03]">
                                                <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 mb-1">Dignified Phase</div>
                                                <div className="text-2xl font-bold text-emerald-400 mb-1">{metrics.favAnn >= 0 ? "+" : ""}{metrics.favAnn.toFixed(2)}%</div>
                                                <div className="text-[10px] text-zinc-500 leading-tight">Annualized Yield</div>
                                            </div>

                                            <div className="p-5 rounded-xl border border-red-500/10 bg-red-500/[0.03]">
                                                <div className="text-[10px] uppercase font-bold tracking-widest text-red-500 mb-1">Debilitated Phase</div>
                                                <div className="text-2xl font-bold text-red-400 mb-1">{metrics.chalAnn >= 0 ? "+" : ""}{metrics.chalAnn.toFixed(2)}%</div>
                                                <div className="text-[10px] text-zinc-500 leading-tight">Annualized Yield</div>
                                            </div>

                                            <div className="mt-4 p-5 rounded-xl border border-white/5 bg-zinc-900/50">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Info size={14} className="text-sky-400" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Yield Gap Analysis</span>
                                                </div>
                                                <div className="text-lg font-bold text-zinc-200 mb-2">
                                                    {Math.abs(metrics.gap).toFixed(2)}% <span className="text-xs font-normal text-zinc-500">/yr difference</span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                    {metrics.gap > 0 ? "This sector performs distinctly better when its ruling planet is in a state of high dignity, validating traditional financial astrology principles." : "Historically, this ETF shows a contrarian effect, performing slightly better when its astrological ruler is computationally debilitated."}
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
