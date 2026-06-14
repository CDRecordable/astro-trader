// ============================================================
// MacroOverview — Composite Cosmic Fluidity Score Dashboard
// Aggregates turbulence, lunar, and mercury signals into one score
// ============================================================

"use client";

import React, { useMemo, useState } from "react";
import Header from "./Header";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Activity, Moon, RotateCcw, ArrowRight, TrendingUp, TrendingDown, Minus, Calendar, LogIn, LogOut, ChevronDown, Shield, Target, Clock } from "lucide-react";
import { getMoonPhase, getMoonEmoji, getMoonPhaseName, getNewMoonDates } from "@/lib/lunar-data";
import { isRetrograde, getNextRetrograde, MERCURY_RETROGRADES } from "@/lib/mercury-data";
import { getSunspotNumber } from "@/lib/solar-data";
import { generateMacroTimeline } from "@/lib/macro-algorithm";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// ── Compute individual signals ───────────────────────────────

function computeTurbulenceSignal(): { score: number; label: string; value: number; detail: string; trend: "up" | "down" | "stable" } {
    // Compute today's turbulence exactly — single-day call, same as MacroDashboard
    const todayStr = new Date().toISOString().split("T")[0];
    const todayData = generateMacroTimeline(todayStr, todayStr, 1)[0];
    const turbulence = todayData?.turbulenceIndex ?? 50;
    const transits = todayData?.activeTransits?.join(", ") || "None";

    // Compute 7 days ahead for trend
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureStr = futureDate.toISOString().split("T")[0];
    const futureData = generateMacroTimeline(futureStr, futureStr, 1)[0];
    const turbulenceFuture = futureData?.turbulenceIndex ?? 50;

    // Invert: low turbulence = high fluidity
    const score = Math.max(0, Math.min(100, 100 - turbulence));
    const scoreFuture = Math.max(0, Math.min(100, 100 - turbulenceFuture));
    const label = turbulence < 30 ? "turbulenceLow" : turbulence < 60 ? "turbulenceModerate" : turbulence < 80 ? "turbulenceElevated" : "turbulenceHigh";

    // Trend: compare current fluidity score vs 7 days ahead
    const diff = scoreFuture - score;
    const trend: "up" | "down" | "stable" = diff > 3 ? "up" : diff < -3 ? "down" : "stable";

    return { score: Math.round(score * 10) / 10, label, value: Math.round(turbulence * 10) / 10, detail: transits, trend };
}

function computeLunarSignal(): { score: number; label: string; emoji: string; phaseName: string; detail: string; trend: "up" | "down" | "stable" } {
    const phase = getMoonPhase(new Date());
    const emoji = getMoonEmoji(phase);
    const phaseName = getMoonPhaseName(phase);

    // Score: distance from new moon. Phase 0 = new moon = 100, Phase 0.5 = full moon = 0
    // We use a cosine curve for smooth transition
    const score = Math.round(((Math.cos(phase * 2 * Math.PI) + 1) / 2) * 100);
    const label = phase < 0.25 || phase >= 0.75 ? "New Moon Half ✦" : "Full Moon Half";

    // Trend: waning (0.5-1.0 = heading toward new moon = improving)
    // Waxing (0.0-0.5 = heading toward full moon = declining)
    const trend: "up" | "down" | "stable" = phase >= 0.5 ? "up" : phase < 0.5 ? "down" : "stable";

    return { score, label, emoji, phaseName, detail: `Phase: ${(phase * 100).toFixed(1)}% · ${phaseName}`, trend };
}

function computeMercurySignal(): { score: number; label: string; detail: string; trend: "up" | "down" | "stable" } {
    const now = new Date();
    const retro = isRetrograde(now);
    const next = getNextRetrograde(now);

    if (retro) {
        // Check how far into retrograde we are — if past midpoint, improving
        const currentRetro = MERCURY_RETROGRADES.find(([s, e]) => now >= new Date(s) && now <= new Date(e));
        let trend: "up" | "down" | "stable" = "stable";
        if (currentRetro) {
            const startDate = new Date(currentRetro[0]);
            const endDate = new Date(currentRetro[1]);
            const total = endDate.getTime() - startDate.getTime();
            const elapsed = now.getTime() - startDate.getTime();
            trend = elapsed > total * 0.6 ? "up" : "down";
        }
        return { score: 0, label: "⚠ Retrograde", detail: "Mercury is currently retrograde — caution advised", trend };
    }

    // Check proximity to next retrograde (within 7 days = reduced score)
    if (next) {
        const daysUntil = Math.ceil((next.start.getTime() - now.getTime()) / 86400000);
        if (daysUntil <= 7) {
            const score = Math.round((daysUntil / 7) * 50 + 50); // 50-100 range
            return { score, label: `Pre-Shadow (${daysUntil}d)`, detail: `Retrograde starts ${next.start.toISOString().split("T")[0]} — entering shadow zone`, trend: "down" };
        }
        // Far from retrograde — check if getting closer or staying stable
        const trend: "up" | "down" | "stable" = daysUntil > 30 ? "stable" : "down";
        return { score: 100, label: "✦ Direct", detail: `Next retrograde: ${next.start.toISOString().split("T")[0]} (${daysUntil} days away)`, trend };
    }

    return { score: 100, label: "✦ Direct", detail: "No upcoming retrograde in database", trend: "stable" };
}

// ── Gauge SVG Component ──────────────────────────────────────

function FluidityGauge({ score, size = 280 }: { score: number; size?: number }) {
    const r = size / 2 - 20;
    const cx = size / 2;
    const cy = size / 2 + 10;
    const startAngle = 225; // degrees
    const endAngle = -45;
    const totalAngle = startAngle - endAngle; // 270 degrees

    const scoreAngle = startAngle - (score / 100) * totalAngle;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // Arc path
    const arcPath = (start: number, end: number) => {
        const s = toRad(start);
        const e = toRad(end);
        const sx = cx + r * Math.cos(s);
        const sy = cy - r * Math.sin(s);
        const ex = cx + r * Math.cos(e);
        const ey = cy - r * Math.sin(e);
        const sweep = start - end > 180 ? 1 : 0;
        return `M ${sx} ${sy} A ${r} ${r} 0 ${sweep} 1 ${ex} ${ey}`;
    };

    // Score color
    const color = score >= 70 ? "#4ade80" : score >= 40 ? "#eab308" : "#ef4444";
    const label = score >= 80 ? "PEAK FLUIDITY" : score >= 60 ? "FAVORABLE" : score >= 40 ? "NEUTRAL" : score >= 20 ? "CAUTIOUS" : "HIGH RISK";

    // Needle endpoint
    const needleAngle = toRad(scoreAngle);
    const needleLen = r - 15;
    const nx = cx + needleLen * Math.cos(needleAngle);
    const ny = cy - needleLen * Math.sin(needleAngle);

    return (
        <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
            {/* Background arc */}
            <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={16} strokeLinecap="round" />
            {/* Score arc */}
            <motion.path
                d={arcPath(startAngle, scoreAngle)}
                fill="none"
                stroke={color}
                strokeWidth={16}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            />
            {/* Needle */}
            <motion.line
                x1={cx} y1={cy} x2={nx} y2={ny}
                stroke="white" strokeWidth={2.5} strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={5} fill="white" />
            {/* Score text */}
            <text x={cx} y={cy - 40} textAnchor="middle" fill={color} fontSize={48} fontWeight="bold" fontFamily="monospace">
                {score}
            </text>
            <text x={cx} y={cy - 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10} fontWeight="600" letterSpacing={3}>
                {label}
            </text>
            {/* Min/Max labels */}
            <text x={cx - r + 5} y={cy + 20} textAnchor="start" fill="rgba(255,255,255,0.2)" fontSize={9}>0</text>
            <text x={cx + r - 5} y={cy + 20} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={9}>100</text>
        </svg>
    );
}

// ── Signal Timing Computation ────────────────────────────────

interface SignalEvent {
    date: Date;
    type: "entry" | "exit";
    reason: string;
    icon: string;
    confidence: "high" | "medium" | "low";
}

/**
 * Compute entry/exit signals over a ±90-day window.
 * mode "future" → next 90 days (upcoming); mode "past" → previous 90 days (history).
 * Same deterministic rules in both directions (turbulence regime changes, new moons,
 * Mercury retrograde boundaries), so the historical view shows exactly the signals
 * the model WOULD have emitted — useful for eyeballing how they lined up with the market.
 */
function computeSignals(mode: "future" | "past"): SignalEvent[] {
    const events: SignalEvent[] = [];
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    if (mode === "future") to.setMonth(to.getMonth() + 3);
    else from.setMonth(from.getMonth() - 3);
    const inWindow = (d: Date) => d > from && d < to;

    // 1. Turbulence windows — scan the window for regime changes
    const timeline = generateMacroTimeline(
        from.toISOString().split("T")[0],
        to.toISOString().split("T")[0],
        90
    );
    let prevTurb = timeline[0]?.turbulenceIndex ?? 50;
    for (let i = 1; i < timeline.length; i++) {
        const pt = timeline[i];
        if (prevTurb >= 50 && pt.turbulenceIndex < 50) {
            events.push({ date: new Date(pt.date), type: "entry", reason: "Turbulence drops below 50", icon: "⚡", confidence: pt.turbulenceIndex < 35 ? "high" : "medium" });
        }
        if (prevTurb < 65 && pt.turbulenceIndex >= 65) {
            events.push({ date: new Date(pt.date), type: "exit", reason: "Turbulence exceeds 65", icon: "⚡", confidence: pt.turbulenceIndex > 80 ? "high" : "medium" });
        }
        prevTurb = pt.turbulenceIndex;
    }

    // 2. Lunar — new moons = entry
    const y = now.getFullYear();
    for (const nm of getNewMoonDates(y - 1, y + 1)) {
        if (inWindow(nm)) events.push({ date: nm, type: "entry", reason: "New Moon — favorable period begins", icon: "🌑", confidence: "medium" });
    }

    // 3. Mercury — retrograde start = exit, end = entry
    for (const [startStr, endStr] of MERCURY_RETROGRADES) {
        const s = new Date(startStr);
        const e = new Date(endStr);
        if (inWindow(s)) events.push({ date: s, type: "exit", reason: "Mercury Retrograde begins", icon: "☿", confidence: "medium" });
        if (inWindow(e)) events.push({ date: e, type: "entry", reason: "Mercury Retrograde ends", icon: "☿", confidence: "medium" });
    }

    // Chronological (future ascending; past descending → most recent first)
    events.sort((a, b) => mode === "future" ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime());

    // Deduplicate close same-type events (within 3 days)
    const filtered: SignalEvent[] = [];
    for (const ev of events) {
        const last = filtered[filtered.length - 1];
        if (last && Math.abs(ev.date.getTime() - last.date.getTime()) < 3 * 86400000 && ev.type === last.type) {
            if (ev.confidence === "high") filtered[filtered.length - 1] = ev;
            continue;
        }
        filtered.push(ev);
    }

    return filtered;
}

// ── Main Component ───────────────────────────────────────────

export default function MacroOverview() {
    const t = useTranslations("macroOverview");
    const [strategyExpanded, setStrategyExpanded] = useState(false);

    const turbulenceRaw = useMemo(() => computeTurbulenceSignal(), []);
    // Resolve label key through t()
    const turbulence = useMemo(() => ({
        ...turbulenceRaw,
        label: t(turbulenceRaw.label as Parameters<typeof t>[0]),
    }), [turbulenceRaw, t]);
    const lunar = useMemo(() => computeLunarSignal(), []);
    const mercury = useMemo(() => computeMercurySignal(), []);
    const upcomingSignals = useMemo(() => computeSignals("future"), []);
    const historicalSignals = useMemo(() => computeSignals("past"), []);
    const [signalView, setSignalView] = useState<"future" | "past">("future");
    const shownSignals = signalView === "future" ? upcomingSignals : historicalSignals;

    // Composite score
    const compositeScore = useMemo(() => {
        return Math.round(
            turbulence.score * 0.40 +
            lunar.score * 0.35 +
            mercury.score * 0.25
        );
    }, [turbulence, lunar, mercury]);

    // Interpretation
    const interpretation = useMemo(() => {
        if (compositeScore >= 80) return { text: t("interpretationIdeal"), color: "#4ade80", bg: "rgba(74,222,128,0.05)" };
        if (compositeScore >= 60) return { text: t("interpretationFavorable"), color: "#22d3ee", bg: "rgba(34,211,238,0.05)" };
        if (compositeScore >= 40) return { text: t("interpretationNeutral"), color: "#eab308", bg: "rgba(234,179,8,0.05)" };
        if (compositeScore >= 20) return { text: t("interpretationAdverse"), color: "#f97316", bg: "rgba(249,115,22,0.05)" };
        return { text: t("interpretationExtreme"), color: "#ef4444", bg: "rgba(239,68,68,0.05)" };
    }, [compositeScore, t]);

    // Find next entry and exit
    const nextEntry = upcomingSignals.find(s => s.type === "entry");
    const nextExit = upcomingSignals.find(s => s.type === "exit");

    // Current market position suggestion
    const positionAdvice = useMemo(() => {
        if (compositeScore >= 70) return { status: t("positionInMarket"), color: "#4ade80", icon: LogIn, desc: t("positionInMarketDesc") };
        if (compositeScore >= 45) return { status: t("positionHold"), color: "#eab308", icon: Shield, desc: t("positionHoldDesc") };
        return { status: t("positionReduce"), color: "#ef4444", icon: LogOut, desc: t("positionReduceDesc") };
    }, [compositeScore, t]);

    const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    // eslint-disable-next-line react-hooks/purity -- countdown helper reads the clock for display
    const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);

    const SignalCard = ({ title, score, weight, icon: Icon, color, detail, trend, children }: {
        title: string; score: number; weight: string; icon: React.ElementType; color: string; detail: string; trend?: "up" | "down" | "stable"; children?: React.ReactNode;
    }) => {
        const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
        const trendColor = trend === "up" ? "#4ade80" : trend === "down" ? "#ef4444" : "#71717a";
        const trendLabel = trend === "up" ? t("improving") : trend === "down" ? t("declining") : t("stable");

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                            <Icon size={16} style={{ color }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
                            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{weight}</div>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                        {trend && (
                            <div className="flex flex-col items-center gap-0.5">
                                <TrendIcon size={16} style={{ color: trendColor }} />
                                <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: trendColor }}>{trendLabel}</span>
                            </div>
                        )}
                        <div>
                            <div className="text-2xl font-bold font-mono" style={{ color }}>{score}</div>
                            <div className="text-[9px] text-zinc-600">/ 100</div>
                        </div>
                    </div>
                </div>
                {/* Score bar */}
                <div className="h-1.5 rounded-full bg-white/5 mb-2 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
                <div className="text-[10px] text-zinc-500">{detail}</div>
                {children}
            </motion.div>
        );
    };

    const NavCard = ({ title, emoji, sub, stat, statColor, description }: {
        title: string; emoji: string; sub: string; stat: string; statColor: string; description: string;
    }) => (
        <Link href={`/macro/${sub}`}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, y: -2 }}
                className="glass-card p-4 border border-white/5 text-left w-full transition-all hover:border-white/10 group cursor-pointer"
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
                    </div>
                    <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
                <div className="text-xs font-mono font-bold mb-1" style={{ color: statColor }}>{stat}</div>
                <div className="text-[10px] text-zinc-500">{description}</div>
            </motion.div>
        </Link>
    );

    return (
        <div className="min-h-screen">
            <Header />
            <div className="p-6 max-w-[1400px] mx-auto">
                {/* Page header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
                            <Gauge size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">{t("title")}</h1>
                            <p className="text-xs text-zinc-500">{t("subtitle")}</p>
                        </div>
                    </div>
                </motion.div>

                {/* ── Hero: 2/3 Gauge + 1/3 Signal Timing ───────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* LEFT 2/3: Gauge */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                        className="lg:col-span-2 glass-card p-8 border border-white/5 text-center">
                        <div className="text-[10px] uppercase tracking-[4px] text-zinc-600 mb-4 font-semibold">{t("cosmicFluidityScore")}</div>
                        <div className="flex justify-center mb-4">
                            <FluidityGauge score={compositeScore} />
                        </div>
                        <div className="max-w-xl mx-auto p-4 rounded-xl text-sm leading-relaxed" style={{ background: interpretation.bg, color: interpretation.color, border: `1px solid ${interpretation.color}20` }}>
                            {interpretation.text}
                        </div>
                        <div className="text-[9px] text-zinc-600 mt-3">
                            {t("updatedOn")} {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </div>
                    </motion.div>

                    {/* RIGHT 1/3: Signal Timing Panel */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="glass-card border border-white/5 flex flex-col overflow-hidden">
                        {/* Current Position */}
                        <div className="p-5 border-b border-white/5">
                            <div className="text-[9px] uppercase tracking-[3px] text-zinc-600 font-semibold mb-3">{t("currentPosition")}</div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${positionAdvice.color}15`, border: `1px solid ${positionAdvice.color}30` }}>
                                    <positionAdvice.icon size={18} style={{ color: positionAdvice.color }} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold font-mono" style={{ color: positionAdvice.color }}>{positionAdvice.status}</div>
                                    <div className="text-[10px] text-zinc-500">{positionAdvice.desc}</div>
                                </div>
                            </div>
                        </div>

                        {/* Next Entry */}
                        <div className="p-5 border-b border-white/5 flex-1">
                            <div className="text-[9px] uppercase tracking-[3px] text-zinc-600 font-semibold mb-3 flex items-center gap-1.5">
                                <LogIn size={10} className="text-emerald-500" />
                                {t("nextEntrySignal")}
                            </div>
                            {nextEntry ? (
                                <div>
                                    <div className="text-lg font-bold text-emerald-400 font-mono">{formatDate(nextEntry.date)}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs">{nextEntry.icon}</span>
                                        <span className="text-[10px] text-zinc-400">{nextEntry.reason}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock size={10} className="text-zinc-600" />
                                        <span className="text-[10px] text-zinc-500">{daysUntil(nextEntry.date)} {t("daysFromNow")}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${nextEntry.confidence === "high" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                                            {nextEntry.confidence} conf.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[10px] text-zinc-500 italic">{t("noEntrySignals")}</div>
                            )}
                        </div>

                        {/* Next Exit */}
                        <div className="p-5 border-b border-white/5 flex-1">
                            <div className="text-[9px] uppercase tracking-[3px] text-zinc-600 font-semibold mb-3 flex items-center gap-1.5">
                                <LogOut size={10} className="text-red-500" />
                                {t("nextExitSignal")}
                            </div>
                            {nextExit ? (
                                <div>
                                    <div className="text-lg font-bold text-red-400 font-mono">{formatDate(nextExit.date)}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs">{nextExit.icon}</span>
                                        <span className="text-[10px] text-zinc-400">{nextExit.reason}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock size={10} className="text-zinc-600" />
                                        <span className="text-[10px] text-zinc-500">{daysUntil(nextExit.date)} {t("daysFromNow")}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${nextExit.confidence === "high" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                                            {nextExit.confidence} conf.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[10px] text-zinc-500 italic">{t("noExitSignals")}</div>
                            )}
                        </div>

                        {/* Expand Strategy Button */}
                        <button
                            onClick={() => setStrategyExpanded(!strategyExpanded)}
                            className="p-4 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer hover:bg-white/[0.03]"
                            style={{ color: "#7c3aed" }}
                        >
                            <Calendar size={14} />
                            <span>{t("strategyPlanner")}</span>
                            <motion.div animate={{ rotate: strategyExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} />
                            </motion.div>
                        </button>
                    </motion.div>
                </div>

                {/* ── Expandable Strategy Planner ────────────── */}
                <AnimatePresence>
                    {strategyExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className="glass-card p-6 border border-purple-500/10 bg-purple-500/[0.02]">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
                                        <Target size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-zinc-200">{t("signalCalendarTitle")}</h3>
                                        <p className="text-[10px] text-zinc-500">{signalView === "future" ? t("signalCalendarSubtitle") : t("signalHistorySubtitle")}</p>
                                    </div>
                                    {/* Future / History toggle */}
                                    <div className="flex rounded-lg overflow-hidden border border-white/10 text-[10px] font-semibold">
                                        <button
                                            onClick={() => setSignalView("future")}
                                            className="px-3 py-1.5 transition-colors cursor-pointer"
                                            style={{ background: signalView === "future" ? "rgba(124,58,237,0.25)" : "transparent", color: signalView === "future" ? "#c4b5fd" : "#71717a" }}
                                        >
                                            {t("signalsUpcoming")}
                                        </button>
                                        <button
                                            onClick={() => setSignalView("past")}
                                            className="px-3 py-1.5 transition-colors cursor-pointer"
                                            style={{ background: signalView === "past" ? "rgba(124,58,237,0.25)" : "transparent", color: signalView === "past" ? "#c4b5fd" : "#71717a" }}
                                        >
                                            {t("signalsHistory")}
                                        </button>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="space-y-2 mb-6">
                                    {shownSignals.slice(0, 10).map((sig, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                            className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${sig.type === "entry" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                                                {sig.type === "entry" ? <LogIn size={14} className="text-emerald-400" /> : <LogOut size={14} className="text-red-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold font-mono" style={{ color: sig.type === "entry" ? "#4ade80" : "#ef4444" }}>
                                                        {formatDate(sig.date)}
                                                    </span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sig.confidence === "high" ? "bg-emerald-500/10 text-emerald-400" : sig.confidence === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                                                        {sig.confidence}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-0.5">{sig.icon} {sig.reason}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-zinc-600 font-mono">{signalView === "future" ? `${daysUntil(sig.date)}d` : `${Math.abs(daysUntil(sig.date))}d ${t("ago")}`}</div>
                                                <div className="text-[9px] uppercase font-bold" style={{ color: sig.type === "entry" ? "#4ade80" : "#ef4444" }}>
                                                    {sig.type}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {shownSignals.length === 0 && (
                                        <div className="text-center py-8 text-zinc-500 text-xs">{t("noSignals")}</div>
                                    )}
                                </div>

                                {/* Strategy Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10">
                                        <div className="text-[9px] uppercase tracking-widest text-emerald-600 font-semibold mb-2">{t("optimalEntry")}</div>
                                        <div className="text-xs text-zinc-400 leading-relaxed">{t.rich("optimalEntryText", { strong: (c) => <strong className="text-zinc-200">{c}</strong> })}</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-red-500/[0.03] border border-red-500/10">
                                        <div className="text-[9px] uppercase tracking-widest text-red-600 font-semibold mb-2">{t("optimalExit")}</div>
                                        <div className="text-xs text-zinc-400 leading-relaxed">{t.rich("optimalExitText", { strong: (c) => <strong className="text-zinc-200">{c}</strong> })}</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-purple-500/[0.03] border border-purple-500/10">
                                        <div className="text-[9px] uppercase tracking-widest text-purple-600 font-semibold mb-2">{t("positionSizing")}</div>
                                        <div className="text-xs text-zinc-400 leading-relaxed">{t.rich("positionSizingText", { strong: (c) => <strong className="text-zinc-200">{c}</strong> })}</div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-zinc-500 italic">{t("strategyDisclaimer")}</div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Three signal breakdown cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <SignalCard
                        title={t("turbulenceTitle")}
                        score={turbulence.value}
                        weight={t("turbulenceWeight")}
                        icon={Activity}
                        color={turbulence.value <= 30 ? "#4ade80" : turbulence.value <= 60 ? "#eab308" : "#ef4444"}
                        detail={turbulence.detail}
                        trend={turbulence.trend}
                    >
                        <div className="mt-2 text-[10px] text-zinc-400">{turbulence.label} · {t("contributesFluidity", { score: turbulence.score })}</div>
                    </SignalCard>

                    <SignalCard
                        title={t("lunarTitle")}
                        score={lunar.score}
                        weight={t("lunarWeight")}
                        icon={Moon}
                        color={lunar.score >= 60 ? "#a855f7" : lunar.score >= 40 ? "#eab308" : "#f97316"}
                        detail={lunar.detail}
                        trend={lunar.trend}
                    >
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-400">
                            <span className="text-lg">{lunar.emoji}</span>
                            <span>{lunar.label}</span>
                        </div>
                    </SignalCard>

                    <SignalCard
                        title={t("mercuryTitle")}
                        score={mercury.score}
                        weight={t("mercuryWeight")}
                        icon={RotateCcw}
                        color={mercury.score >= 60 ? "#22d3ee" : mercury.score >= 30 ? "#eab308" : "#ef4444"}
                        detail={mercury.detail}
                        trend={mercury.trend}
                    >
                        <div className="mt-2 text-[10px] text-zinc-400">{mercury.label}</div>
                    </SignalCard>
                </div>

                {/* Quick nav to sub-sections */}
                <div className="text-[9px] uppercase tracking-[3px] text-zinc-600 font-semibold mb-3 px-1">{t("exploreModules")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <NavCard title={t("turbulenceTitle")} emoji="⚡" sub="turbulence" stat={`Index: ${turbulence.value.toFixed(1)}`} statColor={turbulence.score >= 60 ? "#4ade80" : "#eab308"} description={t("turbulenceDesc")} />
                    <NavCard title={t("lunarTitle")} emoji="🌑" sub="lunar" stat={`${lunar.emoji} ${lunar.phaseName}`} statColor="#a855f7" description={t("lunarDesc")} />
                    <NavCard title={t("mercuryTitle")} emoji="☿" sub="mercury" stat={mercury.label} statColor={mercury.score >= 60 ? "#22d3ee" : "#ef4444"} description={t("mercuryDesc")} />
                    <NavCard title="Solar Activity" emoji="☀" sub="solar" stat={`SSN ${Math.round(getSunspotNumber(new Date()))}`} statColor="#f59e0b" description={t("solarDesc")} />
                    <NavCard title="Backtester" emoji="🧪" sub="backtest" stat={t("backtesterStat")} statColor="#f59e0b" description={t("backtesterDesc")} />
                </div>

                {/* How it works */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="mt-8 glass-card p-5 border border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">{t("howItWorksTitle")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-400 leading-relaxed">
                        <div>
                            <div className="text-sm mb-1 text-zinc-300 font-semibold">⚡ {t("turbulenceTitle")} (40%)</div>
                            <p>{t("turbulenceExplain")}</p>
                        </div>
                        <div>
                            <div className="text-sm mb-1 text-zinc-300 font-semibold">🌑 {t("lunarTitle")} (35%)</div>
                            <p>{t("lunarExplain")}</p>
                        </div>
                        <div>
                            <div className="text-sm mb-1 text-zinc-300 font-semibold">☿ {t("mercuryTitle")} (25%)</div>
                            <p>{t("mercuryExplain")}</p>
                        </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-zinc-500 italic">{t("disclaimer")}</div>
                </motion.div>
            </div>
        </div>
    );
}

