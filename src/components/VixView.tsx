// ============================================================
// VixView — Volatility-regime analysis (SERIOUS mode)
// ============================================================
// The empirically-grounded counterpart to the astro "turbulence":
// classifies each day by the REAL VIX (CBOE volatility index) and
// measures the S&P 500's FORWARD 1-month return by regime.
// This is a documented effect (high VIX → mean-reversion), so unlike
// the astro panels, it tends to be genuinely significant.
// ============================================================

"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import Header from "./Header";
import { motion } from "framer-motion";
import { Gauge, Info, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { compareRegimes, formatPValue, mean, annualizedReturn } from "@/lib/stats";
import type { EChartParam } from "@/lib/echarts-types";

interface DailyPrice { date: string; price: number; }
interface Combined { date: string; vix: number; sp: number; }

const FWD = 21; // forward trading days ≈ 1 month

// VIX regimes (standard market convention)
const REGIMES = [
    { key: "low", label: "Complacencia", range: "VIX < 15", lo: 0, hi: 15, color: "#34d399" },
    { key: "normal", label: "Normal", range: "15–20", lo: 15, hi: 20, color: "#22d3ee" },
    { key: "elevated", label: "Elevado", range: "20–30", lo: 20, hi: 30, color: "#fbbf24" },
    { key: "high", label: "Pánico", range: "VIX > 30", lo: 30, hi: Infinity, color: "#fb7185" },
] as const;

function regimeOf(vix: number) {
    return REGIMES.find((r) => vix >= r.lo && vix < r.hi) ?? REGIMES[REGIMES.length - 1];
}

export default function VixView() {
    const [vix, setVix] = useState<DailyPrice[]>([]);
    const [sp, setSp] = useState<DailyPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/ticker?symbol=${encodeURIComponent("^VIX")}`).then((r) => r.json()),
            fetch(`/api/ticker?symbol=${encodeURIComponent("^GSPC")}`).then((r) => r.json()),
        ])
            .then(([v, g]: [{ data?: DailyPrice[] }, { data?: DailyPrice[] }]) => {
                setVix(v.data ?? []);
                setSp(g.data ?? []);
                setLoading(false);
            })
            .catch((e) => { setErr(e instanceof Error ? e.message : "Error"); setLoading(false); });
    }, []);

    // Align VIX + S&P by date
    const combined = useMemo<Combined[]>(() => {
        if (!vix.length || !sp.length) return [];
        const spMap = new Map(sp.map((d) => [d.date, d.price]));
        const out: Combined[] = [];
        for (const v of vix) {
            const spPrice = spMap.get(v.date);
            if (spPrice && v.price > 0) out.push({ date: v.date, vix: v.price, sp: spPrice });
        }
        return out;
    }, [vix, sp]);

    // Forward-return analysis by VIX regime
    const analysis = useMemo(() => {
        if (combined.length < FWD + 30) return null;
        const buckets: Record<string, number[]> = { low: [], normal: [], elevated: [], high: [] };
        for (let i = 0; i + FWD < combined.length; i++) {
            const fwd = combined[i + FWD].sp / combined[i].sp - 1; // forward 1-month return (decimal)
            buckets[regimeOf(combined[i].vix).key].push(fwd);
        }
        const stats = REGIMES.map((r) => {
            const arr = buckets[r.key];
            const avg = arr.length ? mean(arr) * 100 : 0;
            const posPct = arr.length ? (arr.filter((x) => x > 0).length / arr.length) * 100 : 0;
            // annualize the monthly forward mean (12 periods/yr)
            const ann = arr.length ? annualizedReturn(arr, 12) * 100 : 0;
            return { ...r, n: arr.length, avg, posPct, ann };
        });
        // Significance: panic (high) vs complacency (low) forward returns
        const cmp = compareRegimes(buckets.high, buckets.low, { periodsPerYear: 12, iterations: 2000, seed: 21 });
        return { stats, cmp, total: combined.length - FWD };
    }, [combined]);

    // VIX timeline chart with regime bands
    const chartOptions = useMemo(() => {
        if (!combined.length) return null;
        // downsample for performance
        const step = Math.max(1, Math.floor(combined.length / 1500));
        const pts = combined.filter((_, i) => i % step === 0);
        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis", backgroundColor: "rgba(0,0,0,0.9)", borderColor: "rgba(255,255,255,0.1)",
                textStyle: { color: "#fff", fontSize: 11 },
                formatter: (params: EChartParam[]) => {
                    const p = params[0];
                    const v = typeof p?.value === "number" ? p.value : 0;
                    return `<div style="font-size:10px;color:#a1a1aa">${p?.axisValue}</div><b>VIX ${v.toFixed(1)}</b> · ${regimeOf(v).label}`;
                },
            },
            grid: { left: "1%", right: "1%", top: "8%", bottom: "8%", containLabel: true },
            xAxis: { type: "category", data: pts.map((p) => p.date), boundaryGap: false, axisLabel: { color: "#71717a", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#71717a", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(82,82,91,0.12)", type: "dashed" } } },
            dataZoom: [{ type: "inside" }, { type: "slider", bottom: 0, height: 18, backgroundColor: "rgba(0,0,0,0.3)", fillerColor: "rgba(34,211,238,0.1)" }],
            visualMap: {
                show: false, dimension: 1, seriesIndex: 0,
                pieces: REGIMES.map((r) => ({ gte: r.lo, lt: r.hi === Infinity ? 200 : r.hi, color: r.color })),
            },
            series: [{ name: "VIX", type: "line", data: pts.map((p) => p.vix), smooth: true, symbol: "none", lineStyle: { width: 1.5 }, areaStyle: { opacity: 0.04 } }],
        };
    }, [combined]);

    return (
        <div className="min-h-screen">
            <Header />
            <div className="p-6 max-w-[1400px] mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #059669, #06b6d4)" }}>
                            <Gauge size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">Régimen de Volatilidad (VIX)</h1>
                            <p className="text-xs text-zinc-500">Retorno futuro del S&P 500 a 1 mes según el nivel real del VIX · datos Yahoo Finance</p>
                        </div>
                    </div>
                </motion.div>

                {loading && <div className="glass-card p-12 text-center text-zinc-500 text-sm">Cargando VIX y S&P 500…</div>}
                {err && <div className="glass-card p-6 text-sm text-rose-400">Error: {err}</div>}

                {analysis && (
                    <>
                        {/* Current VIX banner */}
                        <div className="glass-card p-4 mb-6 flex items-center gap-4" style={{ borderLeft: `3px solid ${regimeOf(combined[combined.length - 1].vix).color}` }}>
                            <div className="text-2xl font-bold font-mono" style={{ color: regimeOf(combined[combined.length - 1].vix).color }}>
                                {combined[combined.length - 1].vix.toFixed(1)}
                            </div>
                            <div>
                                <div className="text-sm font-semibold" style={{ color: regimeOf(combined[combined.length - 1].vix).color }}>
                                    {regimeOf(combined[combined.length - 1].vix).label}
                                </div>
                                <div className="text-[10px] text-zinc-500">VIX actual · {combined[combined.length - 1].date}</div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="glass-card p-4 mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Histórico del VIX (2000–presente)</h3>
                            {chartOptions && <ReactECharts option={chartOptions} style={{ height: 300 }} theme="dark" />}
                        </div>

                        {/* Regime cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {analysis.stats.map((s) => (
                                <div key={s.key} className="glass-card p-4 border" style={{ borderColor: `${s.color}25` }}>
                                    <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: s.color }}>{s.label}</div>
                                    <div className="text-[10px] text-zinc-600 mb-2">{s.range}</div>
                                    <div className={`text-2xl font-bold ${s.avg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                        {s.avg >= 0 ? "+" : ""}{s.avg.toFixed(2)}%
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-1">retorno medio S&P a 1 mes</div>
                                    <div className="text-[10px] text-zinc-600 mt-2">{s.n.toLocaleString()} días · {s.posPct.toFixed(0)}% positivos</div>
                                </div>
                            ))}
                        </div>

                        {/* Significance */}
                        <div className={`glass-card p-5 mb-6 border ${analysis.cmp.significant ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-amber-500/20 bg-amber-500/[0.02]"}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {analysis.cmp.significant ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-amber-400" />}
                                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: analysis.cmp.significant ? "#34d399" : "#fbbf24" }}>
                                    Pánico vs Complacencia · {formatPValue(analysis.cmp.pValue)}
                                </h3>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Tras niveles de <strong className="text-rose-300">pánico (VIX&gt;30)</strong> el S&P rindió de media{" "}
                                <strong className="text-emerald-300">{(analysis.cmp.meanA * 100).toFixed(2)}%/mes</strong> el mes siguiente, frente a{" "}
                                <strong className="text-zinc-300">{(analysis.cmp.meanB * 100).toFixed(2)}%/mes</strong> tras{" "}
                                <strong className="text-emerald-300">complacencia (VIX&lt;15)</strong>.{" "}
                                {analysis.cmp.significant
                                    ? "La diferencia ES estadísticamente significativa — el efecto de reversión a la media del VIX está documentado y es real."
                                    : "La diferencia no alcanza significancia en esta muestra."}
                            </p>
                        </div>

                        {/* How to read */}
                        <div className="glass-card p-5 border border-cyan-500/10 bg-cyan-500/[0.02]">
                            <div className="flex items-center gap-2 mb-3">
                                <Info size={14} className="text-cyan-400" />
                                <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-500/60">Cómo leerlo</h3>
                            </div>
                            <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                                <p>El VIX es la volatilidad implícita a 30 días del S&P 500 — el &ldquo;índice del miedo&rdquo;. A diferencia de la turbulencia astrológica, <strong className="text-zinc-200">mide el estado real del mercado</strong>.</p>
                                <p>Clasificamos cada día por su VIX y miramos el retorno del S&P en los <strong className="text-zinc-200">21 días siguientes</strong>. El patrón histórico: comprar tras picos de pánico tiende a pagar (reversión), y la complacencia extrema precede retornos más flojos.</p>
                                <p className="text-amber-500/70 italic flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> Es una regularidad estadística in-sample, no una garantía. Los retornos pasados no aseguran resultados futuros.</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
