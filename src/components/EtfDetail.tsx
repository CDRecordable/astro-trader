// ============================================================
// ETF Detail — vehicle, portfolio & momentum analyzer
// ============================================================
// Fetches /api/etf/[symbol] for the rich fundamentals + score, then renders
// three renormalized pillars with N/D-neutral metrics, the holdings table,
// sector weights, a price chart with timeframes and the AI qualitative layer.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import ReactECharts from "echarts-for-react";
import type { Company, AlgorithmScore } from "@/lib/types";
import type { EtfFundamentals } from "@/lib/etf-fundamentals";
import type { EtfQualitative } from "@/lib/api/llm-client";
import { ETF_CATEGORY_META } from "@/lib/etf-registry";
import { useTranslations } from "next-intl";
import ScoreRing from "./ScoreRing";
import WatchlistButton from "./WatchlistButton";
import DiscardButton from "./DiscardButton";
import TradeButtons from "./TradeButtons";
import { PrintButton, PrintHeader } from "./PrintReport";
import EtfAiSection from "./EtfAiSection";
import { reinforcementLevel } from "./ReinforcementBadge";
import {
    X, Landmark, PieChart, ActivitySquare, AlertTriangle, Loader2,
    HelpCircle, ChevronUp, ChevronDown, ArrowLeftRight, LineChart as LineChartIcon,
} from "lucide-react";

interface EtfDetailProps {
    company: Company;
    score: AlgorithmScore;
    onClose: () => void;
}

// ── Formatters ───────────────────────────────────────────────
function pctStr(v: number | null | undefined, sign = false, digits = 1): string {
    if (v === null || v === undefined || !isFinite(v)) return "N/D";
    const s = sign && v > 0 ? "+" : "";
    return `${s}${v.toFixed(digits)}%`;
}
function terStr(v: number | null): string {
    return v === null ? "N/D" : `${(v * 100).toFixed(2)}%`;
}
function aumStr(v: number | null, currency: string): string {
    if (v === null || !isFinite(v)) return "N/D";
    const sym = currency === "EUR" ? "€" : currency === "GBP" || currency === "GBp" ? "£" : "$";
    if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${sym}${(v / 1e6).toFixed(0)}M`;
    return `${sym}${v.toFixed(0)}`;
}
function num(v: number | null | undefined, digits = 1): string {
    return v === null || v === undefined || !isFinite(v) ? "N/D" : v.toFixed(digits);
}

type Tone = "good" | "warn" | "bad" | "na" | "neutral";
const TONE_COLOR: Record<Tone, string> = {
    good: "var(--signal-strong-buy)",
    warn: "var(--signal-hold)",
    bad: "var(--signal-avoid)",
    na: "var(--signal-hold)",
    neutral: "var(--text-primary)",
};

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
    return (
        <div className="group relative flex items-center">
            {children}
            <div className="absolute bottom-full left-0 mb-2 w-max max-w-xs p-2.5 bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-left">
                {content}
                <div className="absolute top-full left-6 border-4 border-transparent border-t-zinc-800" />
            </div>
        </div>
    );
}

function Row({ label, value, tone = "neutral", tooltip }: {
    label: string; value: string; tone?: Tone; tooltip?: string;
}) {
    const isNa = value === "N/D";
    const color = isNa ? TONE_COLOR.na : TONE_COLOR[tone];
    const labelNode = tooltip ? (
        <Tooltip content={tooltip}>
            <span className="text-xs flex items-center gap-1 cursor-help border-b border-dashed border-zinc-600 pb-0.5" style={{ color: "var(--text-muted)" }}>
                {label}
                <HelpCircle size={12} className="opacity-50" />
            </span>
        </Tooltip>
    ) : (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
    );
    return (
        <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {labelNode}
            <span className="text-xs font-mono font-bold" style={{ color }}>
                {value}{isNa && <span className="italic font-normal"> ·</span>}
            </span>
        </div>
    );
}

function PillarHeader({ icon: Icon, title, score, color }: {
    icon: React.ElementType; title: string; score: number; color: string;
}) {
    return (
        <div className="flex items-center justify-between mb-3 mt-1">
            <div className="flex items-center gap-2">
                <Icon size={14} style={{ color }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{title}</h3>
            </div>
            <span className="text-xs font-mono font-bold" style={{ color }}>{score}/100</span>
        </div>
    );
}

const TIMEFRAMES = [
    { key: "6M", weeks: 26 },
    { key: "1Y", weeks: 52 },
    { key: "3Y", weeks: 156 },
    { key: "5Y", weeks: 260 },
    { key: "Max", weeks: Infinity },
] as const;

// ── Component ────────────────────────────────────────────────
export default function EtfDetail({ company, score: initialScore, onClose }: EtfDetailProps) {
    const t = useTranslations("etfDetail");
    const symbol = company.id.replace(/^etf_/i, "").toUpperCase();

    const [fundamentals, setFundamentals] = useState<EtfFundamentals | null>(null);
    const [score, setScore] = useState<AlgorithmScore>(initialScore);
    const [loading, setLoading] = useState(true);
    const [ai, setAi] = useState<EtfQualitative | null>(null);
    const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]["key"]>("1Y");
    const aiLevel = ai ? reinforcementLevel(ai.qualitativeScore) : 0;

    useEffect(() => {
        let active = true;
        // Reset to loading when the selected ETF changes (intentional sync set).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        fetch(`/api/etf/${encodeURIComponent(symbol)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { fundamentals: EtfFundamentals; score: AlgorithmScore } | null) => {
                if (!active || !d) return;
                setFundamentals(d.fundamentals);
                setScore(d.score);
            })
            .catch(() => { })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [symbol]);

    const f = fundamentals;
    const catMeta = f?.category ? ETF_CATEGORY_META[f.category] : null;

    // ── Price chart option ──
    const chartOption = useMemo(() => {
        if (!f || f.historicalPrices.length < 2) return null;
        const weeks = TIMEFRAMES.find((x) => x.key === tf)?.weeks ?? 52;
        const pts = weeks === Infinity ? f.historicalPrices : f.historicalPrices.slice(-weeks);
        const first = pts[0]?.price ?? 1;
        const last = pts[pts.length - 1]?.price ?? 1;
        const up = last >= first;
        const color = up ? "#34d399" : "#fb7185";
        return {
            grid: { left: 52, right: 12, top: 12, bottom: 24 },
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(20,22,30,0.95)", borderColor: "rgba(255,255,255,0.1)",
                textStyle: { color: "#e5e7eb", fontSize: 11 },
                valueFormatter: (v: number) => `${v?.toFixed(2)} ${f.currency}`,
            },
            xAxis: {
                type: "category", boundaryGap: false,
                data: pts.map((p) => p.date),
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
                axisLabel: { color: "#6b7280", fontSize: 9 },
            },
            yAxis: {
                type: "value", scale: true,
                axisLabel: { color: "#6b7280", fontSize: 9 },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
            },
            series: [{
                type: "line", data: pts.map((p) => Number(p.price.toFixed(3))), smooth: true, showSymbol: false,
                lineStyle: { color, width: 2 },
                areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: up ? "rgba(52,211,153,0.22)" : "rgba(251,113,133,0.22)" }, { offset: 1, color: "rgba(0,0,0,0)" }] } },
            }],
        };
    }, [f, tf]);

    return (
        <AnimatePresence>
            <div className="w-full max-w-4xl mx-auto" style={{ background: "var(--bg-secondary)" }}>
                {/* Report identity — printed page only */}
                <PrintHeader ticker={company.ticker} name={company.name} subtitle={company.sector} />

                {/* Header */}
                <div
                    className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
                    style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)", backdropFilter: "blur(12px)" }}
                >
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <ScoreRing score={score.totalScore} size={48} strokeWidth={3} recommendation={score.recommendation.replace("_", " ")} />
                            {ai && aiLevel !== 0 && (
                                <div className="absolute -top-1.5 -right-1.5 flex flex-col items-center -space-y-1.5">
                                    {Array.from({ length: Math.abs(aiLevel) }).map((_, i) => (
                                        aiLevel > 0
                                            ? <ChevronUp key={i} size={12} strokeWidth={3.5} style={{ color: "var(--signal-strong-buy)" }} />
                                            : <ChevronDown key={i} size={12} strokeWidth={3.5} style={{ color: "var(--signal-avoid)" }} />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-base" style={{ color: "var(--accent-cyan)" }}>{company.ticker}</span>
                                <span className="text-sm font-medium">{company.name}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {catMeta ? `${catMeta.emoji} ${catMeta.label}` : "ETF"}{f?.region ? ` · ${f.region}` : ""} · {symbol}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PrintButton />
                        <TradeButtons company={company} assetType="e" />
                        <DiscardButton company={company} assetType="e" />
                        <WatchlistButton company={company} assetType="e" />
                        <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
                            <X size={18} style={{ color: "var(--text-muted)" }} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 space-y-5">
                    {/* Intro: what this ETF is (highlighted) */}
                    <div className="rounded-2xl p-5" style={{
                        background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.05))",
                        border: "1px solid var(--border-active)",
                    }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Landmark size={15} style={{ color: "var(--accent-cyan)" }} />
                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                                {t("aboutTitle")}
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {f?.index ? t("aboutReplicates", { index: f.index }) : company.description || t("aboutGeneric")}
                            {f?.fundFamily ? ` ${t("aboutFamily", { family: f.fundFamily })}` : ""}
                            {f?.accumulating !== null && f?.accumulating !== undefined
                                ? ` ${f.accumulating ? t("aboutAcc") : t("aboutDist")}` : ""}
                        </p>
                        {f?.proxySymbol && (
                            <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                                <ArrowLeftRight size={11} style={{ color: "var(--accent-amber)" }} />
                                {t("proxyNote", { proxy: f.proxySymbol })}
                            </p>
                        )}
                    </div>

                    {/* AI qualitative layer (reinforces/weakens the score) */}
                    {f && <EtfAiSection fundamentals={f} onResult={setAi} />}

                    {/* Disclaimer */}
                    <p className="text-[11px] leading-relaxed px-3 py-2 rounded-lg" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.12)", color: "var(--text-muted)" }}>
                        {t("disclaimer")}
                    </p>

                    {/* Hard-filter failures */}
                    {!score.passesHardFilters && score.hardFilterReasons.length > 0 && (
                        <div className="px-3 py-2.5 rounded-lg text-[11px]" style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.2)", color: "var(--signal-avoid)" }}>
                            <span className="font-semibold flex items-center gap-1.5 mb-1"><AlertTriangle size={12} /> {t("hardFilterFail")}</span>
                            <ul className="list-disc ml-5 space-y-0.5">
                                {score.hardFilterReasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Score breakdown */}
                    <section className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{t("scoreTitle")}</h3>
                            <span className="text-sm font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>{score.totalScore}/100</span>
                        </div>
                        <Row label={t("pillarVehicle")} value={`${score.valuationScore}/100`} tone="neutral" />
                        <Row label={t("pillarPortfolio")} value={`${score.trendScore}/100`} tone="neutral" />
                        <Row label={t("pillarMomentum")} value={`${score.timingScore}/100`} tone="neutral" />
                    </section>

                    {loading && !f && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                        </div>
                    )}

                    {f && (
                        <>
                            {/* Price chart with timeframes */}
                            {chartOption && (
                                <section className="glass-card p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <LineChartIcon size={14} style={{ color: "var(--accent-cyan)" }} />
                                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{t("priceTitle")}</h3>
                                            <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                                                {f.price.toFixed(2)} {f.currency}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {TIMEFRAMES.map(({ key }) => (
                                                <button key={key} onClick={() => setTf(key)}
                                                    className="px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-all"
                                                    style={{
                                                        background: tf === key ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                                                        color: tf === key ? "white" : "var(--text-muted)",
                                                    }}>
                                                    {key}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <ReactECharts option={chartOption} style={{ height: 220 }} notMerge lazyUpdate />
                                </section>
                            )}

                            {/* Pillar 1 — Cost & Vehicle */}
                            <section className="glass-card p-4">
                                <PillarHeader icon={Landmark} title={t("pillarVehicle")} score={score.valuationScore} color="var(--accent-cyan)" />
                                <Row label={t("ter")} value={terStr(f.ter)} tone={f.ter === null ? "na" : f.ter <= 0.002 ? "good" : f.ter <= 0.0045 ? "warn" : "bad"} tooltip={t("terTip")} />
                                <Row label={t("aum")} value={aumStr(f.totalAssets, f.currency)} tone={f.totalAssets === null ? "na" : f.totalAssets >= 5e8 ? "good" : f.totalAssets >= 1e8 ? "warn" : "bad"} tooltip={t("aumTip")} />
                                <Row label={t("age")} value={f.ageYears !== null ? `${f.ageYears.toFixed(1)} ${t("years")}` : "N/D"} tone={f.ageYears === null ? "na" : f.ageYears >= 5 ? "good" : f.ageYears >= 2 ? "warn" : "bad"} />
                                <Row label={t("turnover")} value={f.turnover !== null ? pctStr(f.turnover * 100, false, 0) : "N/D"} tone={f.turnover === null ? "na" : f.turnover <= 0.3 ? "good" : "warn"} tooltip={t("turnoverTip")} />
                                <Row label={t("policy")} value={f.accumulating === null ? "N/D" : f.accumulating ? t("policyAcc") : t("policyDist")} tone={f.accumulating === null ? "na" : f.accumulating ? "good" : "neutral"} tooltip={t("policyTip")} />
                                <Row label={t("beta")} value={num(f.beta3y, 2)} tone="neutral" tooltip={t("betaTip")} />
                            </section>

                            {/* Pillar 2 — Portfolio & Value */}
                            <section className="glass-card p-4">
                                <PillarHeader icon={PieChart} title={t("pillarPortfolio")} score={score.trendScore} color="var(--accent-violet)" />
                                <Row label={t("top10")} value={pctStr(f.top10Pct)} tone={f.top10Pct === null ? "na" : f.top10Pct <= 25 ? "good" : f.top10Pct <= 50 ? "warn" : "bad"} tooltip={t("top10Tip")} />
                                <Row label={t("underlyingPE")} value={num(f.underlyingPE)} tone={f.underlyingPE === null ? "na" : f.underlyingPE <= 18 ? "good" : f.underlyingPE <= 26 ? "warn" : "bad"} tooltip={t("underlyingPETip")} />
                                <Row label={t("underlyingPB")} value={num(f.underlyingPB)} tone={f.underlyingPB === null ? "na" : f.underlyingPB <= 2.5 ? "good" : f.underlyingPB <= 5 ? "warn" : "bad"} />
                                <Row label={t("maxSector")} value={f.sectorWeights.length ? `${f.sectorWeights[0].sector} · ${pctStr(f.maxSectorPct)}` : "N/D"} tone={f.maxSectorPct === null ? "na" : f.maxSectorPct <= 30 ? "good" : f.maxSectorPct <= 50 ? "warn" : "bad"} tooltip={t("maxSectorTip")} />
                                <Row label={t("yield")} value={f.dividendYield !== null ? pctStr(f.dividendYield * 100) : "N/D"} tone="neutral" />

                                {/* Top holdings table */}
                                {f.topHoldings.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("holdingsTitle")}</p>
                                        <div className="space-y-1">
                                            {f.topHoldings.slice(0, 10).map((h, i) => (
                                                <div key={i} className="flex items-center gap-2 text-[11px]">
                                                    <span className="w-10 font-mono font-bold shrink-0" style={{ color: "var(--accent-cyan)" }}>{h.symbol}</span>
                                                    <span className="flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{h.name}</span>
                                                    <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                                                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.pct * 8)}%`, background: "var(--accent-violet)" }} />
                                                    </div>
                                                    <span className="w-12 text-right font-mono shrink-0" style={{ color: "var(--text-primary)" }}>{h.pct.toFixed(1)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sector weights */}
                                {f.sectorWeights.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("sectorsTitle")}</p>
                                        <div className="space-y-1">
                                            {f.sectorWeights.slice(0, 8).map((s, i) => (
                                                <div key={i} className="flex items-center gap-2 text-[11px]">
                                                    <span className="w-40 truncate shrink-0" style={{ color: "var(--text-secondary)" }}>{s.sector}</span>
                                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                                                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.pct)}%`, background: "var(--accent-cyan)" }} />
                                                    </div>
                                                    <span className="w-12 text-right font-mono shrink-0" style={{ color: "var(--text-primary)" }}>{s.pct.toFixed(1)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Pillar 3 — Momentum & Timing */}
                            <section className="glass-card p-4">
                                <PillarHeader icon={ActivitySquare} title={t("pillarMomentum")} score={score.timingScore} color="var(--accent-emerald)" />
                                <Row label={t("vsSma200")} value={pctStr(f.vsSma200Pct, true)} tone={f.vsSma200Pct === null ? "na" : f.vsSma200Pct >= 0 && f.vsSma200Pct <= 15 ? "good" : f.vsSma200Pct > 15 ? "warn" : f.vsSma200Pct >= -10 ? "warn" : "bad"} tooltip={t("vsSma200Tip")} />
                                <Row label={t("ret1m")} value={pctStr(f.ret1mPct, true)} tone="neutral" />
                                <Row label={t("ret3m")} value={pctStr(f.ret3mPct, true)} tone="neutral" />
                                <Row label={t("ret12m")} value={pctStr(f.ret12mPct, true)} tone={f.ret12mPct === null ? "na" : f.ret12mPct > 0 ? "good" : "warn"} />
                                <Row label={t("drawdown")} value={pctStr(f.drawdownPct)} tone={f.drawdownPct === null ? "na" : Math.abs(f.drawdownPct) <= 15 ? "good" : Math.abs(f.drawdownPct) <= 25 ? "warn" : "bad"} tooltip={t("drawdownTip")} />
                                <Row label={t("vol")} value={pctStr(f.volAnnPct)} tone={f.volAnnPct === null ? "na" : f.volAnnPct <= 18 ? "good" : f.volAnnPct <= 25 ? "warn" : "bad"} tooltip={t("volTip")} />
                                <Row label={t("range52")} value={f.low52 !== null && f.high52 !== null ? `${f.low52.toFixed(2)} – ${f.high52.toFixed(2)}` : "N/D"} tone="neutral" />
                            </section>
                        </>
                    )}
                </div>
            </div>
        </AnimatePresence>
    );
}
