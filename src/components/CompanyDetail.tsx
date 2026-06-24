// ============================================================
// Company Detail - Expanded study view with interpretation sidebar
// ============================================================

"use client";

import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Company, AlgorithmScore } from "@/lib/types";
import type { QualitativeAnalysis } from "@/lib/api/llm-client";
import { reinforcementLevel } from "./ReinforcementBadge";
import { formatMarketCap, formatPercent, formatCurrency } from "@/lib/utils";
import { PriceChart, MarginChart, ReturnChart, ScoreBreakdownChart } from "./FinancialCharts";
import ScoreRing from "./ScoreRing";
import AiAnalysisSection from "./AiAnalysisSection";
import WatchlistButton from "./WatchlistButton";
import DiscardButton from "./DiscardButton";
import { useTranslations } from "next-intl";
import {
    X, ArrowUpRight, ArrowDownRight,
    Shield, Target, Activity, BarChart3, Globe,
    HelpCircle, CheckCircle2, XCircle, MinusCircle, Info, TrendingUp, Building2,
    ChevronUp, ChevronDown, Sparkles
} from "lucide-react";

interface CompanyDetailProps {
    company: Company;
    score: AlgorithmScore;
    onClose: () => void;
}

/* ── Tooltip ───────────────────────────────────────────────── */
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

/* ── MetricRow ─────────────────────────────────────────────── */
function MetricRow({ label, value, color, tooltip }: { label: string; value: string | React.ReactNode; color?: string; tooltip?: string }) {
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
            <span className="text-xs font-mono font-bold" style={{ color: color || "var(--text-primary)" }}>{value}</span>
        </div>
    );
}

/* ── Money formatter (millions → $X.XB / $XM, signed) ──────── */
function fmtMoneyM(m: number | null | undefined): string {
    if (m === null || m === undefined || !isFinite(m)) return "N/D";
    const sign = m < 0 ? "-" : "";
    const a = Math.abs(m);
    if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}B`;
    return `${sign}$${a.toFixed(0)}M`;
}

/* ── SectionHeader ─────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-3 mt-2">
            <Icon size={14} style={{ color: "var(--accent-cyan)" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                {title}
            </h3>
        </div>
    );
}

/* ── CheckItem — used in the sidebar cards ─────────────────── */
/** Three states: pass (green ✓), fail (red ✗), or `na` = data not available,
 *  rendered NEUTRAL in amber with an "N/D" tag — never as a failure.
 *  `tip` adds a dashed-underline hover tooltip explaining the concept. */
function CheckItem({ pass, label, na, tip, value }: { pass: boolean; label: string; na?: boolean; tip?: string; value?: string }) {
    const Icon = na ? MinusCircle : pass ? CheckCircle2 : XCircle;
    const iconColor = na ? "var(--signal-hold)" : pass ? "var(--signal-strong-buy)" : "var(--signal-avoid)";
    const textColor = na ? "var(--signal-hold)" : pass ? "var(--text-secondary)" : "var(--signal-avoid)";

    const labelNode = (
        <span
            className="text-[11px] leading-snug"
            style={{
                color: textColor,
                ...(tip ? { textDecoration: "underline dashed", textUnderlineOffset: "3px", textDecorationColor: "rgba(255,255,255,0.22)", cursor: "help" } : {}),
            }}
        >
            {label}{na && <span className="italic"> · N/D</span>}
        </span>
    );

    return (
        <div className="flex items-start gap-2 py-1" style={{ opacity: na ? 0.92 : 1 }}>
            <Icon size={14} className="mt-0.5 shrink-0" style={{ color: iconColor }} />
            <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                {tip ? <Tooltip content={tip}>{labelNode}</Tooltip> : labelNode}
                {!na && value !== undefined && (
                    <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: iconColor }}>{value}</span>
                )}
            </div>
        </div>
    );
}

/* ── InsightCard — sidebar interpretation panel ────────────── */
function InsightCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div
            className="rounded-xl p-4 space-y-2"
            style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <Icon size={13} style={{ color: "var(--accent-cyan)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════ */
/* ═  MAIN COMPONENT                                          ═ */
/* ══════════════════════════════════════════════════════════════ */
export default function CompanyDetail({ company, score, onClose }: CompanyDetailProps) {
    const m = company.metrics;
    const t = useTranslations("companyDetail");

    // AI result (lifted up): drives the header arrows + the "about" thesis.
    const [ai, setAi] = useState<QualitativeAnalysis | null>(null);
    const aiLevel = ai ? reinforcementLevel(ai.qualitativeScore) : 0;

    // Smooth-scroll to a heuristic section (legend jump links).
    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    // Data availability — legacy rows without flags are assumed complete.
    const dq = m.dataQuality ?? { deltas: true, roc: true, growth: true };

    const deltaColor = (val: number) =>
        val >= 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)";

    const deltaArrow = (val: number) =>
        val >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />;

    /* ── Computed booleans for sidebar checks ── */
    const passEquity = m.totalEquity > 0;
    const passOperating = m.operatingProfit > 0;
    const passFcfYield = m.fcfYield >= 0.05;
    const passBookToMarket = m.bookToMarket > 0.40;
    const passEbitMargin = m.ebitMargin > 0.10;
    const passGrossMargin = m.grossMargin > 0.30;
    const passRoe = m.roe > 0.10;
    const passRoc = m.roc > 0.10;
    // Aligned with the algorithm: needs real growth data AND positive EBITDA growth
    const passEbitdaEfficiency = dq.growth && m.ebitdaGrowth > 0 && m.ebitdaGrowth >= m.assetGrowth;
    const passEbitDelta = m.ebitMarginDelta > 0;
    const passGrossDelta = m.grossMarginDelta > 0;
    const passRoeDelta = m.roeDelta > 0;
    const passRocDelta = m.rocDelta > 0;
    const pass1M = m.oneMonthReturn > 0;
    const pass3M = m.threeMonthReturn > 0;
    const passNoEuphoria = m.sixMonthReturn <= 0.40;
    const priceNear52Low = m.currentPrice <= m.fiftyTwoWeekLow * 1.15;

    return (
        <AnimatePresence>
            <div
                className="w-full mx-auto"
                style={{
                    maxWidth: "1440px",
                    background: "var(--bg-secondary)",
                }}
            >
                {/* ── Header ── */}
                <div
                    className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
                    style={{
                        background: "var(--bg-secondary)",
                        borderBottom: "1px solid var(--border-subtle)",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div className="relative" title={ai ? t("scoreClarify") : undefined}>
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
                                <span className="font-bold text-base" style={{ color: "var(--accent-cyan)" }}>
                                    {company.ticker}
                                </span>
                                <span className="text-sm font-medium">{company.name}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {company.exchange} · {company.sector}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DiscardButton company={company} assetType="s" />
                        <WatchlistButton company={company} assetType="s" />
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        >
                            <X size={18} style={{ color: "var(--text-muted)" }} />
                        </button>
                    </div>
                </div>

                {/* ── Paired Rows: Section + Insight Card aligned ── */}
                <div className="px-6 py-5 space-y-6">

                    {/* ── Top: About · Score breakdown · Interpretation ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

                        {/* About — heuristic description; richer when AI is present */}
                        <section className="glass-card p-4 flex flex-col" style={{ border: "1px solid var(--border-active)" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 size={15} style={{ color: "var(--accent-cyan)" }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>{t("aboutTitle")}</span>
                                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>· {company.sector}</span>
                            </div>
                            {ai ? (
                                <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 300 }}>
                                    {/* AI thesis */}
                                    {ai.summary && (
                                        <p className="text-[11px] leading-relaxed flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                            <Sparkles size={11} className="mt-0.5 shrink-0" style={{ color: "var(--accent-violet)" }} />
                                            <span>{ai.summary}</span>
                                        </p>
                                    )}
                                    {/* Main products (with figures if known) */}
                                    {ai.products && ai.products.length > 0 && (
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--accent-cyan)" }}>{t("aboutProducts")}</p>
                                            <div className="space-y-1.5">
                                                {ai.products.map((p, i) => (
                                                    <div key={i} className="flex items-start justify-between gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                                                        <div className="min-w-0">
                                                            <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                                                            {p.detail && <span className="text-[10px] block leading-snug" style={{ color: "var(--text-muted)" }}>{p.detail}</span>}
                                                        </div>
                                                        {p.figure && (
                                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(52,211,153,0.12)", color: "var(--signal-strong-buy)" }}>{p.figure}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Upcoming products */}
                                    {ai.upcomingProducts && ai.upcomingProducts.length > 0 && (
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--accent-violet)" }}>{t("aboutUpcoming")}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ai.upcomingProducts.map((p, i) => (
                                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                                                        {p.name}{p.timeframe && <span style={{ color: "var(--text-muted)" }}> · {p.timeframe}</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Fallback to the heuristic text if the (older) analysis has no products */}
                                    {(!ai.products || ai.products.length === 0) && company.description && (
                                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{company.description}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs leading-relaxed overflow-y-auto pr-1" style={{ color: "var(--text-secondary)", maxHeight: 280 }}>
                                    {company.description || t("noDescription")}
                                </p>
                            )}
                        </section>

                        {/* Score breakdown */}
                        <section className="glass-card p-4">
                            <SectionHeader icon={Target} title={t("scoreTitle")} />
                            <ScoreBreakdownChart
                                valuationScore={score.valuationScore}
                                trendScore={score.trendScore}
                                timingScore={score.timingScore}
                            />
                            <div className="space-y-1.5 mt-2">
                                <MetricRow label={t("valuation35")} value={`${score.valuationScore}/100`} color="var(--accent-cyan)" />
                                <MetricRow label={t("trend25")} value={`${score.trendScore}/100`} color="var(--accent-violet)" />
                                <MetricRow label={t("timing20")} value={`${score.timingScore}/100`} color="var(--accent-amber)" />
                                <MetricRow label={t("macroAdj")} value={`×${score.macroAdjustment.toFixed(2)}`} color="var(--text-secondary)" />
                                <MetricRow label={t("totalScore")} value={`${score.totalScore}/100`} color="var(--accent-emerald)" />
                            </div>
                        </section>

                        {/* Interpretation */}
                        <InsightCard title={t("insightScore")} icon={Target}>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                {t("insightScoreDesc")}
                            </p>
                            <CheckItem pass={score.totalScore >= 70} label={t("checkScoreHigh")} tip={t("checkScoreHighTip")} value={`${score.totalScore}`} />
                            <CheckItem pass={score.totalScore >= 40} label={t("checkScoreMid")} tip={t("checkScoreMidTip")} value={`${score.totalScore}`} />
                            <CheckItem pass={score.passesHardFilters} label={t("checkPassesFilters")} tip={t("checkPassesFiltersTip")} />
                            <CheckItem pass={score.valuationScore >= 50} label={t("checkValuationAbove50")} tip={t("checkValuationAbove50Tip")} value={`${score.valuationScore}`} />
                            <CheckItem pass={score.trendScore >= 50} label={t("checkTrendAbove50")} tip={t("checkTrendAbove50Tip")} value={`${score.trendScore}`} />
                            <CheckItem pass={score.timingScore >= 50} label={t("checkTimingAbove50")} tip={t("checkTimingAbove50Tip")} value={`${score.timingScore}`} />
                        </InsightCard>
                    </div>

                    {/* ── AI qualitative layer (reinforces/weakens the score) ── */}
                    <div className="flex">
                        <AiAnalysisSection ticker={company.ticker} onResult={setAi} />
                    </div>

                    {/* ── Legend: jump to the heuristic blocks ── */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--text-muted)" }}>{t("legendLabel")}</span>
                        {([["sec-filters", t("filtersTitle")], ["sec-valuation", t("valuationTitle")], ["sec-trend", t("trendTitle")], ["sec-timing", t("timingTitle")], ["sec-catalysts", t("insightCatalysts")]] as const).map(([id, label]) => (
                            <button key={id} onClick={() => scrollTo(id)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all hover:brightness-125"
                                style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* ── Row 2: Hard Filters + Filters Check ── */}
                    <div id="sec-filters" className="flex flex-col lg:flex-row gap-5 items-stretch scroll-mt-24">
                        <section className="glass-card p-4 flex-1 min-w-0">
                            <SectionHeader icon={Shield} title={t("filtersTitle")} />
                            <div className="space-y-1">
                                <MetricRow
                                    label={t("totalEquity")}
                                    value={formatCurrency(m.totalEquity * 1_000_000, true)}
                                    color={passEquity ? "var(--signal-strong-buy)" : "var(--signal-avoid)"}
                                    tooltip={t("totalEquityTip")}
                                />
                                <MetricRow
                                    label={t("marketCap")}
                                    value={formatMarketCap(m.marketCap)}
                                    color="var(--text-primary)"
                                    tooltip={t("marketCapTip")}
                                />
                                <MetricRow
                                    label={t("operatingProfit")}
                                    value={formatCurrency(m.operatingProfit * 1_000_000, true)}
                                    color={passOperating ? "var(--signal-strong-buy)" : "var(--signal-avoid)"}
                                    tooltip={t("operatingProfitTip")}
                                />
                            </div>
                        </section>
                        <div className="w-full lg:w-[340px] shrink-0">
                            <InsightCard title={t("insightFilters")} icon={Shield}>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {t("insightFiltersDesc")}
                                </p>
                                <CheckItem pass={passEquity} label={t("checkEquityPositive")} tip={t("checkEquityPositiveTip")} value={fmtMoneyM(m.totalEquity)} />
                                <CheckItem pass={passOperating} label={t("checkOperatingPositive")} tip={t("checkOperatingPositiveTip")} value={fmtMoneyM(m.operatingProfit)} />
                                {score.hardFilterReasons.length > 0 && (
                                    <div className="mt-1 px-2 py-1.5 rounded-md text-[10px]" style={{
                                        background: "rgba(251, 113, 133, 0.06)",
                                        border: "1px solid rgba(251, 113, 133, 0.10)",
                                        color: "var(--signal-avoid)",
                                    }}>
                                        {score.hardFilterReasons.join(". ")}
                                    </div>
                                )}
                            </InsightCard>
                        </div>
                    </div>

                    {/* ── Row 3: Valuation & Solvency + Check ── */}
                    <div id="sec-valuation" className="flex flex-col lg:flex-row gap-5 items-stretch scroll-mt-24">
                        <section className="glass-card p-4 flex-1 min-w-0">
                            <SectionHeader icon={BarChart3} title={t("valuationTitle")} />
                            <MetricRow
                                label={t("peRatio")}
                                value={m.peRatio !== undefined ? `${m.peRatio.toFixed(1)}×` : "N/D"}
                                color={m.peRatio === undefined ? "var(--text-muted)"
                                    : m.peRatio > 0 && m.peRatio < 25 ? "var(--signal-strong-buy)"
                                        : m.peRatio < 40 ? "var(--signal-hold)" : "var(--signal-avoid)"}
                                tooltip={t("peRatioTip")}
                            />
                            {dq.solvency && m.evFcfYield !== undefined && (
                                <MetricRow
                                    label={t("evFcfYield")}
                                    value={formatPercent(m.evFcfYield)}
                                    color={m.evFcfYield >= 0.04 ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                                    tooltip={t("evFcfYieldTip")}
                                />
                            )}
                            <MetricRow
                                label={t("fcfYield")}
                                value={formatPercent(m.fcfYield)}
                                color={passFcfYield ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                                tooltip={t("fcfYieldTip")}
                            />
                            <MetricRow
                                label={t("bookToMarket")}
                                value={m.bookToMarket.toFixed(2)}
                                color={passBookToMarket ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                                tooltip={t("bookToMarketTip")}
                            />
                            {m.tangibleBookToMarket !== undefined && (
                                <MetricRow
                                    label={t("tangibleBtm")}
                                    value={m.tangibleBookToMarket.toFixed(2)}
                                    color={m.tangibleBookToMarket > 0.2 ? "var(--signal-strong-buy)" : m.tangibleBookToMarket > 0 ? "var(--signal-hold)" : "var(--signal-avoid)"}
                                    tooltip={t("tangibleBtmTip")}
                                />
                            )}

                            {/financial/i.test(company.sector) && !dq.solvency && (
                                <div className="mt-3 px-3 py-2 rounded-lg text-[11px]" style={{
                                    background: "rgba(34, 211, 238, 0.05)",
                                    border: "1px solid rgba(34, 211, 238, 0.12)",
                                    color: "var(--text-muted)",
                                }}>
                                    ℹ {t("financialSectorNote")}
                                </div>
                            )}
                            {dq.solvency && (
                                <>
                                    <p className="text-[10px] uppercase tracking-wider text-rose-300 mt-4 mb-2 font-semibold">{t("solvencySection")}</p>
                                    {m.netDebtToEbitda !== undefined && (
                                        <MetricRow
                                            label={t("netDebtEbitda")}
                                            value={`${m.netDebtToEbitda.toFixed(1)}×`}
                                            color={m.netDebtToEbitda < 1.5 ? "var(--signal-strong-buy)" : m.netDebtToEbitda < 3 ? "var(--signal-hold)" : "var(--signal-avoid)"}
                                            tooltip={t("netDebtEbitdaTip")}
                                        />
                                    )}
                                    {m.interestCoverage !== undefined && (
                                        <MetricRow
                                            label={t("interestCoverage")}
                                            value={`${m.interestCoverage.toFixed(1)}×`}
                                            color={m.interestCoverage > 4 ? "var(--signal-strong-buy)" : m.interestCoverage > 2 ? "var(--signal-hold)" : "var(--signal-avoid)"}
                                            tooltip={t("interestCoverageTip")}
                                        />
                                    )}
                                </>
                            )}
                        </section>
                        <div className="w-full lg:w-[340px] shrink-0">
                            <InsightCard title={t("insightValuation")} icon={BarChart3}>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {t("insightValuationDesc")}
                                </p>
                                <CheckItem pass={(m.evFcfYield ?? 0) >= 0.04} label={t("checkEvFcf")} na={!dq.solvency || m.evFcfYield === undefined} tip={t("checkEvFcfTip")} value={m.evFcfYield !== undefined ? formatPercent(m.evFcfYield) : undefined} />
                                <CheckItem pass={passFcfYield} label={t("checkFcfAbove5")} tip={t("checkFcfAbove5Tip")} value={formatPercent(m.fcfYield)} />
                                <CheckItem pass={(m.tangibleBookToMarket ?? -1) > 0} label={t("checkTangibleBook")} na={m.tangibleBookToMarket === undefined} tip={t("checkTangibleBookTip")} value={m.tangibleBookToMarket !== undefined ? m.tangibleBookToMarket.toFixed(2) : undefined} />
                                <CheckItem pass={(m.netDebtToEbitda ?? 99) < 3} label={t("checkLeverageOk")} na={!dq.solvency || m.netDebtToEbitda === undefined} tip={t("checkLeverageOkTip")} value={m.netDebtToEbitda !== undefined ? `${m.netDebtToEbitda.toFixed(1)}×` : undefined} />
                                <CheckItem pass={(m.interestCoverage ?? 0) > 2} label={t("checkCoverageOk")} na={!dq.solvency || m.interestCoverage === undefined} tip={t("checkCoverageOkTip")} value={m.interestCoverage !== undefined ? `${m.interestCoverage.toFixed(1)}×` : undefined} />
                                <CheckItem pass={m.fcfYield > 0} label={t("checkFcfPositive")} tip={t("checkFcfPositiveTip")} value={formatPercent(m.fcfYield)} />
                            </InsightCard>
                        </div>
                    </div>

                    {/* ── Row 4: Trend & Quality + Quality & Trend Check ── */}
                    <div id="sec-trend" className="flex flex-col lg:flex-row gap-5 items-start scroll-mt-24">
                        <section className="glass-card p-4 space-y-6 flex-1 min-w-0">
                            <SectionHeader icon={Activity} title={t("trendTitle")} />

                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">{t("marginEvolution")}</p>
                                {dq.deltas ? (
                                    <>
                                        <MarginChart company={company} />
                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div className="flex items-center gap-1" style={{ color: deltaColor(m.ebitMarginDelta) }}>
                                                {deltaArrow(m.ebitMarginDelta)}
                                                <span className="text-xs font-mono">EBIT Δ {formatPercent(m.ebitMarginDelta)}</span>
                                            </div>
                                            <div className="flex items-center gap-1" style={{ color: deltaColor(m.grossMarginDelta) }}>
                                                {deltaArrow(m.grossMarginDelta)}
                                                <span className="text-xs font-mono">Gross Δ {formatPercent(m.grossMarginDelta)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <MetricRow label={t("ebitCurrent")} value={formatPercent(m.ebitMargin)} color={m.ebitMargin > 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)"} />
                                        <MetricRow label={t("grossCurrent")} value={formatPercent(m.grossMargin)} color={m.grossMargin > 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)"} />
                                        <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{
                                            background: "rgba(251, 191, 36, 0.06)",
                                            border: "1px solid rgba(251, 191, 36, 0.12)",
                                            color: "var(--signal-hold)",
                                        }}>
                                            ⚠ {t("yoyNotAvailable")}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">{t("capitalEfficiency")}</p>
                                {dq.deltas ? (
                                    <>
                                        <ReturnChart company={company} />
                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div className="flex items-center gap-1" style={{ color: deltaColor(m.roeDelta) }}>
                                                {deltaArrow(m.roeDelta)}
                                                <span className="text-xs font-mono">ROE Δ {formatPercent(m.roeDelta)}</span>
                                            </div>
                                            <div className="flex items-center gap-1" style={{ color: deltaColor(m.rocDelta) }}>
                                                {deltaArrow(m.rocDelta)}
                                                <span className="text-xs font-mono">ROC Δ {formatPercent(m.rocDelta)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <MetricRow label={t("roeCurrent")} value={formatPercent(m.roe)} color={m.roe > 0.10 ? "var(--signal-strong-buy)" : "var(--signal-hold)"} />
                                        <MetricRow label={t("rocCurrent")} value={formatPercent(m.roc)} color={m.roc > 0.10 ? "var(--signal-strong-buy)" : "var(--signal-hold)"} />
                                        <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{
                                            background: "rgba(251, 191, 36, 0.06)",
                                            border: "1px solid rgba(251, 191, 36, 0.12)",
                                            color: "var(--signal-hold)",
                                        }}>
                                            ⚠ {t("yoyNotAvailable")}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">{t("reinvestmentEfficiency")}</p>
                                {dq.growth ? (
                                    <>
                                        <MetricRow label={t("assetGrowth")} value={formatPercent(m.assetGrowth)} tooltip={t("assetGrowthTip")} />
                                        <MetricRow label={t("ebitdaGrowth")} value={formatPercent(m.ebitdaGrowth)} color={passEbitdaEfficiency ? "var(--signal-strong-buy)" : "var(--signal-avoid)"} tooltip={t("ebitdaGrowthTip")} />
                                        <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{
                                            background: passEbitdaEfficiency ? "rgba(52, 211, 153, 0.06)" : "rgba(251, 113, 133, 0.06)",
                                            border: passEbitdaEfficiency ? "1px solid rgba(52, 211, 153, 0.12)" : "1px solid rgba(251, 113, 133, 0.12)",
                                            color: passEbitdaEfficiency ? "var(--signal-strong-buy)" : "var(--signal-avoid)",
                                        }}>
                                            {passEbitdaEfficiency
                                                ? `✓ ${t("ebitdaPassMsg")}`
                                                : `⚠ ${t("ebitdaFailMsg")}`}
                                        </div>
                                    </>
                                ) : (
                                    <div className="px-3 py-2 rounded-lg text-[11px]" style={{
                                        background: "rgba(251, 191, 36, 0.06)",
                                        border: "1px solid rgba(251, 191, 36, 0.12)",
                                        color: "var(--signal-hold)",
                                    }}>
                                        ⚠ {t("yoyNotAvailable")}
                                    </div>
                                )}
                            </div>

                            {/* Annual revenue & net income history */}
                            {m.annualFinancials && m.annualFinancials.length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">{t("annualTitle")}</p>
                                    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                                        <div className="grid grid-cols-4 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                                            <span>{t("annualYear")}</span>
                                            <span className="text-right">{t("annualRevenue")}</span>
                                            <span className="text-right">{t("annualNetIncome")}</span>
                                            <span className="text-right">{t("annualNetMargin")}</span>
                                        </div>
                                        {[...m.annualFinancials].reverse().map((r) => {
                                            const margin = r.revenue && r.netIncome != null && r.revenue !== 0 ? r.netIncome / r.revenue : null;
                                            return (
                                                <div key={r.year} className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-mono" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                                    <span style={{ color: "var(--text-secondary)" }}>{r.year}</span>
                                                    <span className="text-right" style={{ color: "var(--text-primary)" }}>{fmtMoneyM(r.revenue)}</span>
                                                    <span className="text-right" style={{ color: r.netIncome == null ? "var(--text-muted)" : r.netIncome >= 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)" }}>{fmtMoneyM(r.netIncome)}</span>
                                                    <span className="text-right" style={{ color: "var(--text-muted)" }}>{margin != null ? formatPercent(margin) : "N/D"}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                        <div className="w-full lg:w-[340px] shrink-0">
                            <InsightCard title={t("insightTrend")} icon={TrendingUp}>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {t("insightTrendDesc")}
                                </p>
                                <CheckItem pass={passEbitMargin} label={t("checkEbitAbove10")} tip={t("checkEbitAbove10Tip")} value={formatPercent(m.ebitMargin)} />
                                <CheckItem pass={passGrossMargin} label={t("checkGrossAbove30")} tip={t("checkGrossAbove30Tip")} value={formatPercent(m.grossMargin)} />
                                <CheckItem pass={passRoe} label={t("checkRoeAbove10")} tip={t("checkRoeAbove10Tip")} value={formatPercent(m.roe)} />
                                <CheckItem pass={passRoc} label={t("checkRocAbove10")} na={!dq.roc} tip={t("checkRocAbove10Tip")} value={formatPercent(m.roc)} />
                                <CheckItem pass={passEbitDelta} label={t("checkEbitImproving")} na={!dq.deltas} tip={t("checkEbitImprovingTip")} value={formatPercent(m.ebitMarginDelta)} />
                                <CheckItem pass={passGrossDelta} label={t("checkGrossImproving")} na={!dq.deltas} tip={t("checkGrossImprovingTip")} value={formatPercent(m.grossMarginDelta)} />
                                <CheckItem pass={passRoeDelta} label={t("checkRoeImproving")} na={!dq.deltas} tip={t("checkRoeImprovingTip")} value={formatPercent(m.roeDelta)} />
                                <CheckItem pass={passRocDelta} label={t("checkRocImproving")} na={!dq.deltas} tip={t("checkRocImprovingTip")} value={formatPercent(m.rocDelta)} />
                                <CheckItem pass={passEbitdaEfficiency} label={t("checkEbitdaEfficiency")} na={!dq.growth} tip={t("checkEbitdaEfficiencyTip")} value={formatPercent(m.ebitdaGrowth)} />
                                <CheckItem pass={(m.sharesDilution ?? 1) <= 0.005} label={t("checkNoDilution")} na={!dq.dilution || m.sharesDilution === undefined} tip={t("checkNoDilutionTip")} value={m.sharesDilution !== undefined ? formatPercent(m.sharesDilution) : undefined} />
                                <CheckItem pass={(m.accrualRatio ?? 1) <= 0.03} label={t("checkCleanAccruals")} na={!dq.accruals || m.accrualRatio === undefined} tip={t("checkCleanAccrualsTip")} value={m.accrualRatio !== undefined ? formatPercent(m.accrualRatio) : undefined} />
                            </InsightCard>
                        </div>
                    </div>

                    {/* ── Row 5: Timing & Momentum + Timing Check ── */}
                    <div id="sec-timing" className="flex flex-col lg:flex-row gap-5 items-start scroll-mt-24">
                        <section className="glass-card p-4 space-y-6 flex-1 min-w-0">
                            <SectionHeader icon={Globe} title={t("timingTitle")} />

                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{t("priceHistory")}</p>
                                <PriceChart company={company} />
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{t("momentumIndicators")}</p>
                                <MetricRow label={t("currentPrice")} value={`$${m.currentPrice.toFixed(2)}`} />
                                <MetricRow label={t("week52Low")} value={`$${m.fiftyTwoWeekLow.toFixed(2)}`} tooltip={t("week52LowTip")} />
                                <MetricRow label={t("week52High")} value={`$${m.fiftyTwoWeekHigh.toFixed(2)}`} />
                                <MetricRow label={t("return1M")} value={formatPercent(m.oneMonthReturn)} color={deltaColor(m.oneMonthReturn)} tooltip={t("return1MTip")} />
                                <MetricRow label={t("return3M")} value={formatPercent(m.threeMonthReturn)} color={deltaColor(m.threeMonthReturn)} />
                                <MetricRow label={t("return6M")} value={formatPercent(m.sixMonthReturn)} color={m.sixMonthReturn > 0.40 ? "var(--signal-avoid)" : deltaColor(m.sixMonthReturn)} tooltip={t("return6MTip")} />
                                {m.sixMonthReturn > 0.30 && (
                                    <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{
                                        background: "rgba(251, 191, 36, 0.06)",
                                        border: "1px solid rgba(251, 191, 36, 0.12)",
                                        color: "var(--signal-hold)",
                                    }}>
                                        ⚠ {t("euphoriaWarning")}
                                    </div>
                                )}
                            </div>
                        </section>
                        <div className="w-full lg:w-[340px] shrink-0">
                            <InsightCard title={t("insightTiming")} icon={Activity}>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {t("insightTimingDesc")}
                                </p>
                                <CheckItem pass={pass1M} label={t("check1MPositive")} tip={t("check1MPositiveTip")} value={formatPercent(m.oneMonthReturn)} />
                                <CheckItem pass={pass3M} label={t("check3MPositive")} tip={t("check3MPositiveTip")} value={formatPercent(m.threeMonthReturn)} />
                                <CheckItem pass={passNoEuphoria} label={t("checkNoEuphoria")} tip={t("checkNoEuphoriaTip")} value={formatPercent(m.sixMonthReturn)} />
                                <CheckItem pass={priceNear52Low} label={t("checkNear52Low")} tip={t("checkNear52LowTip")} value={`$${m.currentPrice.toFixed(2)}`} />
                            </InsightCard>
                        </div>
                    </div>

                    {/* ── Row 5.5: Catalysts & Sentiment Signals ── */}
                    <div id="sec-catalysts" className="flex flex-col lg:flex-row gap-5 items-stretch scroll-mt-24">
                        <section className="glass-card p-4 flex-1 min-w-0">
                            <SectionHeader icon={Info} title={t("catalystsTitle")} />
                            {m.nextEarningsDate && (
                                <MetricRow
                                    label={t("nextEarnings")}
                                    // eslint-disable-next-line react-hooks/purity -- "days until" countdown reads the clock for display
                                    value={`${new Date(m.nextEarningsDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })} (${Math.max(0, Math.ceil((new Date(m.nextEarningsDate).getTime() - Date.now()) / 86400000))}d)`}
                                    color="var(--accent-cyan)"
                                    tooltip={t("nextEarningsTip")}
                                />
                            )}
                            {m.exDividendDate && (
                                <MetricRow
                                    label={t("exDividend")}
                                    value={new Date(m.exDividendDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                                    color="var(--text-secondary)"
                                />
                            )}
                            {dq.revisions && (
                                <MetricRow
                                    label={t("epsRevisions")}
                                    value={`↑${m.epsRevisionsUp30d ?? 0} / ↓${m.epsRevisionsDown30d ?? 0}${m.epsTrend30d !== undefined ? ` (${m.epsTrend30d >= 0 ? "+" : ""}${(m.epsTrend30d * 100).toFixed(1)}%)` : ""}`}
                                    color={((m.epsRevisionsUp30d ?? 0) - (m.epsRevisionsDown30d ?? 0)) > 0 ? "var(--signal-strong-buy)" : ((m.epsRevisionsUp30d ?? 0) - (m.epsRevisionsDown30d ?? 0)) < 0 ? "var(--signal-avoid)" : "var(--signal-hold)"}
                                    tooltip={t("epsRevisionsTip")}
                                />
                            )}
                            {dq.insiders && (
                                <MetricRow
                                    label={t("insiderActivity")}
                                    value={`${m.insiderBuyCount6m ?? 0} ${t("buys")} / ${m.insiderSellCount6m ?? 0} ${t("sells")}`}
                                    color={(m.insiderBuyCount6m ?? 0) > (m.insiderSellCount6m ?? 0) ? "var(--signal-strong-buy)" : "var(--text-secondary)"}
                                    tooltip={t("insiderActivityTip")}
                                />
                            )}
                            {m.insiderOwnership !== undefined && (
                                <MetricRow label={t("insiderOwn")} value={formatPercent(m.insiderOwnership)} color={m.insiderOwnership > 0.02 ? "var(--signal-strong-buy)" : "var(--text-secondary)"} tooltip={t("insiderOwnTip")} />
                            )}
                            {m.shortPctFloat !== undefined && (
                                <MetricRow label={t("shortFloat")} value={formatPercent(m.shortPctFloat)} color={m.shortPctFloat > 0.10 ? "var(--signal-avoid)" : "var(--text-secondary)"} tooltip={t("shortFloatTip")} />
                            )}
                        </section>
                        <div className="w-full lg:w-[340px] shrink-0">
                            <InsightCard title={t("insightCatalysts")} icon={Info}>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {t("insightCatalystsDesc")}
                                </p>
                                <CheckItem
                                    pass={((m.epsRevisionsUp30d ?? 0) - (m.epsRevisionsDown30d ?? 0)) > 0}
                                    label={t("checkRevisionsUp")}
                                    na={!dq.revisions}
                                    tip={t("checkRevisionsUpTip")}
                                    value={`↑${m.epsRevisionsUp30d ?? 0} ↓${m.epsRevisionsDown30d ?? 0}`}
                                />
                                <CheckItem
                                    pass={(m.epsTrend30d ?? 0) >= -0.01}
                                    label={t("checkEstimateStable")}
                                    na={!dq.revisions || m.epsTrend30d === undefined}
                                    tip={t("checkEstimateStableTip")}
                                    value={m.epsTrend30d !== undefined ? formatPercent(m.epsTrend30d) : undefined}
                                />
                                <CheckItem
                                    pass={(m.insiderBuyCount6m ?? 0) >= 3 && (m.insiderBuyCount6m ?? 0) > (m.insiderSellCount6m ?? 0)}
                                    label={t("checkClusterBuying")}
                                    na={!dq.insiders}
                                    tip={t("checkClusterBuyingTip")}
                                    value={`${m.insiderBuyCount6m ?? 0}/${m.insiderSellCount6m ?? 0}`}
                                />
                                <CheckItem
                                    pass={(m.shortPctFloat ?? 0) <= 0.10}
                                    label={t("checkLowShort")}
                                    na={m.shortPctFloat === undefined}
                                    tip={t("checkLowShortTip")}
                                    value={m.shortPctFloat !== undefined ? formatPercent(m.shortPctFloat) : undefined}
                                />
                            </InsightCard>
                        </div>
                    </div>

                    {/* ── Row 6: Verdict ── */}
                    <div className="flex">
                        <div className="w-full">
                            <div
                                className="rounded-xl p-4 h-full"
                                style={{
                                    background: score.totalScore >= 70
                                        ? "rgba(52, 211, 153, 0.06)"
                                        : score.totalScore >= 40
                                            ? "rgba(251, 191, 36, 0.06)"
                                            : "rgba(251, 113, 133, 0.06)",
                                    border: score.totalScore >= 70
                                        ? "1px solid rgba(52, 211, 153, 0.15)"
                                        : score.totalScore >= 40
                                            ? "1px solid rgba(251, 191, 36, 0.15)"
                                            : "1px solid rgba(251, 113, 133, 0.15)",
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Info size={13} style={{
                                        color: score.totalScore >= 70 ? "var(--signal-strong-buy)" : score.totalScore >= 40 ? "var(--signal-hold)" : "var(--signal-avoid)"
                                    }} />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{
                                        color: score.totalScore >= 70 ? "var(--signal-strong-buy)" : score.totalScore >= 40 ? "var(--signal-hold)" : "var(--signal-avoid)"
                                    }}>
                                        {t("verdictTitle")}
                                    </span>
                                </div>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {score.totalScore >= 70
                                        ? t("verdictStrong")
                                        : score.totalScore >= 40
                                            ? t("verdictNeutral")
                                            : t("verdictWeak")}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AnimatePresence>
    );
}
