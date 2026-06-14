// ============================================================
// HomeView — welcome screen + watchlist summary
// ============================================================
// The landing page (also reachable by clicking the Astro logo).
// Greets the user, lets them jump into either app mode, and
// surfaces a live-scored summary of their watchlist.

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAppStore } from "@/lib/store";
import {
    Rocket, Moon, LineChart, Star, TrendingUp, TrendingDown,
    Building2, Bitcoin, Loader2, ArrowRight, Sparkles, BookmarkX,
} from "lucide-react";
import type { WatchlistItem } from "@/app/api/watchlist/route";
import type { Company, AlgorithmScore } from "@/lib/types";
import { evaluateAll } from "@/lib/algorithm";
import { getDefaultMacroContext } from "@/lib/mock-data";
import { computeCosmicFluidity, type CosmicFluidityResult } from "@/lib/cosmic-fluidity";
import { PLANETARY_TRANSITS, type PlanetaryTransit } from "@/lib/macro-algorithm";
import { Zap } from "lucide-react";

interface Row extends WatchlistItem {
    company?: Company;
    score?: AlgorithmScore;
    loading: boolean;
}

function recLabel(rec: AlgorithmScore["recommendation"]) {
    return ({ STRONG_BUY: "Strong Buy", BUY: "Buy", HOLD: "Hold", AVOID: "Avoid" } as const)[rec] ?? rec;
}
function recColor(rec: AlgorithmScore["recommendation"]) {
    return ({ STRONG_BUY: "var(--signal-strong-buy)", BUY: "var(--signal-buy)", HOLD: "var(--signal-hold)", AVOID: "var(--signal-avoid)" } as const)[rec] ?? "var(--text-muted)";
}
function scoreColor(s: number) {
    if (s >= 70) return "var(--signal-strong-buy)";
    if (s >= 55) return "var(--signal-buy)";
    if (s >= 40) return "var(--signal-hold)";
    return "var(--signal-avoid)";
}

export default function HomeView() {
    const t = useTranslations("home");
    const router = useRouter();
    const setAppMode = useAppStore((s) => s.setAppMode);
    const setAssetClass = useAppStore((s) => s.setAssetClass);
    const addCompanyByTicker = useAppStore((s) => s.addCompanyByTicker);

    // Open a watchlist asset's full detail in the Explorer (serious mode).
    const openDetail = (row: Row) => {
        setAppMode("serious");
        setAssetClass(row.assetType === "c" ? "crypto" : "stocks");
        addCompanyByTicker(row.ticker, row.assetType);
        router.push("/explorer");
    };

    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [cosmic, setCosmic] = useState<CosmicFluidityResult | null>(null);
    const [nextTransit, setNextTransit] = useState<PlanetaryTransit | null>(null);

    // Macro snapshot (ephemeris reads the clock → compute after mount, not in render)
    useEffect(() => {
        setCosmic(computeCosmicFluidity());
        const now = Date.now();
        setNextTransit(PLANETARY_TRANSITS.find((tr) => new Date(tr.date).getTime() > now) ?? null);
    }, []);

    // Load watchlist, then score each item live (in parallel)
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/watchlist");
                const data = await res.json() as { items: WatchlistItem[] };
                if (!active) return;
                const base: Row[] = data.items.map((i) => ({ ...i, symbol: i.symbol ?? i.ticker, loading: true }));
                setRows(base);
                setLoading(false);

                const macro = getDefaultMacroContext();
                await Promise.allSettled(base.map(async (item) => {
                    try {
                        let company: Company;
                        let score: Row["score"];
                        if (item.assetType === "c") {
                            const r = await fetch(`/api/crypto/${encodeURIComponent(item.ticker)}`);
                            if (!r.ok) throw new Error();
                            const d = await r.json() as { company: Company; score: Row["score"] };
                            company = d.company;
                            score = d.score;
                        } else {
                            const r = await fetch(`/api/company/${encodeURIComponent(item.ticker)}`);
                            if (!r.ok) throw new Error();
                            const d = await r.json() as { company: Company };
                            company = d.company;
                            score = evaluateAll([company], macro, 5_000_000)[0];
                        }
                        if (active) setRows((prev) => prev.map((x) => x.ticker === item.ticker ? { ...x, company, score, loading: false } : x));
                    } catch {
                        if (active) setRows((prev) => prev.map((x) => x.ticker === item.ticker ? { ...x, loading: false } : x));
                    }
                }));
            } catch {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const scored = rows.filter((r) => r.score).sort((a, b) => (b.score!.totalScore) - (a.score!.totalScore));
    const best = scored[0];
    const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.score!.totalScore, 0) / scored.length) : 0;
    const strongBuys = scored.filter((r) => r.score!.recommendation === "STRONG_BUY" || r.score!.recommendation === "BUY").length;

    const hour = new Date().getHours();
    const greeting = hour < 6 ? t("greetNight") : hour < 12 ? t("greetMorning") : hour < 20 ? t("greetAfternoon") : t("greetEvening");

    return (
        <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
            <div className="max-w-5xl mx-auto px-6 py-10">

                {/* ── Hero ─────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))", boxShadow: "var(--shadow-glow-cyan)" }}>
                            <Rocket size={26} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{greeting}</p>
                            <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                                Astro <span style={{ color: "var(--accent-cyan)" }}>Trader</span> Insights
                            </h1>
                        </div>
                    </div>
                    <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>{t("subtitle")}</p>
                </motion.div>

                {/* ── Two-mode entry ───────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                    <Link href="/explorer" onClick={() => setAppMode("serious")}>
                        <motion.div whileHover={{ scale: 1.015 }} className="rounded-2xl p-6 h-full cursor-pointer group" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(34,211,238,0.04))", border: "1px solid rgba(52,211,153,0.18)" }}>
                            <div className="flex items-center justify-between mb-3">
                                <LineChart size={24} style={{ color: "var(--accent-emerald)" }} />
                                <ArrowRight size={18} style={{ color: "var(--text-muted)" }} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("seriousTitle")}</h3>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("seriousDesc")}</p>
                        </motion.div>
                    </Link>
                    <Link href="/macro" onClick={() => setAppMode("esoteric")}>
                        <motion.div whileHover={{ scale: 1.015 }} className="rounded-2xl p-6 h-full cursor-pointer group" style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(34,211,238,0.04))", border: "1px solid rgba(167,139,250,0.18)" }}>
                            <div className="flex items-center justify-between mb-3">
                                <Moon size={24} style={{ color: "var(--accent-violet)" }} />
                                <ArrowRight size={18} style={{ color: "var(--text-muted)" }} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("esotericTitle")}</h3>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("esotericDesc")}</p>
                        </motion.div>
                    </Link>
                </div>

                {/* ── Macro snapshot (the esoteric soul, at a glance) ── */}
                {cosmic && (() => {
                    const comp = cosmic.compositeScore;
                    const cc = comp >= 60 ? "var(--signal-strong-buy)" : comp >= 40 ? "var(--signal-hold)" : "var(--signal-avoid)";
                    const turb = cosmic.turbulence;
                    const turbColor = turb.score >= 60 ? "var(--signal-strong-buy)" : turb.score >= 40 ? "var(--signal-hold)" : "var(--signal-avoid)";
                    const days = nextTransit ? Math.max(0, Math.ceil((new Date(nextTransit.date).getTime() - Date.now()) / 86400000)) : null;
                    return (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.06), rgba(34,211,238,0.03))", border: "1px solid rgba(167,139,250,0.15)" }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Moon size={15} style={{ color: "var(--accent-violet)" }} />
                                    <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>{t("macroTitle")}</h2>
                                </div>
                                <Link href="/macro" onClick={() => setAppMode("esoteric")} className="text-xs flex items-center gap-1" style={{ color: "var(--accent-violet)" }}>
                                    {t("viewMacro")} <ArrowRight size={12} />
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold font-mono" style={{ color: cc }}>{comp}</span>
                                    <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{t("macroComposite")}</span>
                                </div>
                                <MacroMini icon={<Zap size={13} style={{ color: turbColor }} />} label={t("macroTurb")} value={`${Math.round(turb.score)}`} valueColor={turbColor} />
                                <MacroMini icon={<Moon size={13} style={{ color: "var(--accent-violet)" }} />} label={t("macroLunar")} value={`${Math.round(cosmic.lunar.score)}`} />
                                <MacroMini icon={<Sparkles size={13} style={{ color: cosmic.mercury.score >= 80 ? "var(--accent-cyan)" : "var(--signal-hold)" }} />} label={t("macroMercury")} value={cosmic.mercury.score >= 80 ? "✦" : cosmic.mercury.score === 0 ? "℞" : "·"} />
                            </div>
                            {nextTransit && (
                                <div className="mt-4 pt-3 flex items-center justify-between text-[11px]" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                    <span style={{ color: "var(--text-muted)" }}>{t("macroNextTransit")}</span>
                                    <span style={{ color: "var(--text-secondary)" }}>
                                        <span className="font-semibold" style={{ color: nextTransit.type === "tension" ? "var(--signal-avoid)" : "var(--signal-strong-buy)" }}>{nextTransit.name}</span>
                                        {" · "}{nextTransit.date}{days !== null && ` (${days}d)`}
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    );
                })()}

                {/* ── Watchlist summary ────────────────────────────── */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Star size={16} style={{ color: "var(--accent-amber)" }} />
                        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>{t("watchlistTitle")}</h2>
                    </div>
                    {rows.length > 0 && (
                        <Link href="/watchlist" onClick={() => setAppMode("serious")} className="text-xs flex items-center gap-1 transition-colors" style={{ color: "var(--accent-cyan)" }}>
                            {t("viewAll")} <ArrowRight size={12} />
                        </Link>
                    )}
                </div>

                {/* Stats strip */}
                {scored.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <StatCard label={t("statAssets")} value={String(rows.length)} />
                        <StatCard label={t("statAvgScore")} value={`${avgScore}`} color={scoreColor(avgScore)} />
                        <StatCard label={t("statBuys")} value={`${strongBuys}`} color={strongBuys > 0 ? "var(--signal-strong-buy)" : "var(--text-muted)"} />
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin" style={{ color: "var(--accent-cyan)" }} /></div>
                )}

                {!loading && rows.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
                            <BookmarkX size={26} style={{ color: "var(--text-muted)" }} />
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("emptyTitle")}</p>
                        <Link href="/watchlist" onClick={() => setAppMode("serious")} className="text-xs px-4 py-2 rounded-lg font-semibold" style={{ background: "var(--accent-cyan-dim)", color: "white" }}>
                            {t("emptyCta")}
                        </Link>
                    </div>
                )}

                {/* Best pick highlight */}
                {best?.score && best.company && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 rounded-2xl p-5 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${scoreColor(best.score.totalScore)}14, transparent)`, border: `1px solid ${scoreColor(best.score.totalScore)}33` }}>
                        <Sparkles size={20} style={{ color: scoreColor(best.score.totalScore) }} />
                        <div className="flex-1">
                            <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{t("topPick")}</div>
                            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{best.symbol} · {best.name}</div>
                        </div>
                        <div className="text-2xl font-bold font-mono" style={{ color: scoreColor(best.score.totalScore) }}>{Math.round(best.score.totalScore)}</div>
                    </motion.div>
                )}

                {/* Cards grid */}
                {rows.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(scored.length ? scored : rows).map((row) => (
                            <button
                                key={row.ticker}
                                onClick={() => openDetail(row)}
                                className="text-left rounded-xl p-4 flex items-center gap-3 transition-all cursor-pointer hover:brightness-125"
                                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                                title={t("openDetail", { symbol: row.symbol })}
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: row.assetType === "c" ? "rgba(251,191,36,0.1)" : "rgba(34,211,238,0.1)" }}>
                                    {row.assetType === "c" ? <Bitcoin size={15} style={{ color: "var(--accent-amber)" }} /> : <Building2 size={15} style={{ color: "var(--accent-cyan)" }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>{row.symbol}</div>
                                    <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{row.name}</div>
                                    {row.company && row.score && (
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: `${recColor(row.score.recommendation)}18`, color: recColor(row.score.recommendation) }}>
                                            {recLabel(row.score.recommendation)}
                                        </span>
                                    )}
                                </div>
                                {row.loading ? (
                                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                                ) : row.score ? (
                                    <div className="text-right">
                                        <div className="text-lg font-bold font-mono" style={{ color: scoreColor(row.score.totalScore) }}>{Math.round(row.score.totalScore)}</div>
                                        {row.company && (
                                            <div className="text-[10px] flex items-center justify-end gap-0.5" style={{ color: row.company.metrics.oneMonthReturn >= 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)" }}>
                                                {row.company.metrics.oneMonthReturn >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                                {(row.company.metrics.oneMonthReturn * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>—</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function MacroMini({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-base font-bold font-mono" style={{ color: valueColor ?? "var(--text-primary)" }}>{value}</span>
            </div>
            <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</span>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-xl font-bold font-mono" style={{ color: color ?? "var(--text-primary)" }}>{value}</div>
            <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
        </div>
    );
}
