// ============================================================
// Crypto Detail — fundamental analyzer (tokenomics, on-chain, momentum)
// ============================================================
// Fetches /api/crypto/[id] for the rich fundamentals + V2 score, then
// renders three renormalized pillars with N/D-neutral metrics, unlock /
// centralization warnings, and the AI qualitative layer.

"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Company, AlgorithmScore } from "@/lib/types";
import type { CryptoFundamentals } from "@/lib/crypto-fundamentals";
import type { CryptoQualitative } from "@/lib/api/llm-client";
import { useTranslations } from "next-intl";
import ScoreRing from "./ScoreRing";
import WatchlistButton from "./WatchlistButton";
import DiscardButton from "./DiscardButton";
import CryptoAiSection from "./CryptoAiSection";
import { reinforcementLevel } from "./ReinforcementBadge";
import {
    X, Coins, Network, ActivitySquare, Calendar,
    AlertTriangle, Loader2, HelpCircle, Gauge, ChevronUp, ChevronDown,
} from "lucide-react";

interface CryptoDetailProps {
    company: Company;
    score: AlgorithmScore;
    onClose: () => void;
}

// ── Formatters ───────────────────────────────────────────────
function usd(v: number | null | undefined): string {
    if (v === null || v === undefined || !isFinite(v)) return "N/D";
    const a = Math.abs(v);
    if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
}
function pctStr(v: number | null | undefined, sign = false): string {
    if (v === null || v === undefined || !isFinite(v)) return "N/D";
    const s = sign && v > 0 ? "+" : "";
    return `${s}${v.toFixed(1)}%`;
}
function ratio(v: number | null | undefined, suffix = "×"): string {
    if (v === null || v === undefined || !isFinite(v)) return "N/D";
    return `${v.toFixed(2)}${suffix}`;
}
function intStr(v: number | null | undefined): string {
    if (v === null || v === undefined || !isFinite(v)) return "N/D";
    return Math.round(v).toLocaleString("es-ES");
}

type Tone = "good" | "warn" | "bad" | "na" | "neutral";
const TONE_COLOR: Record<Tone, string> = {
    good: "var(--signal-strong-buy)",
    warn: "var(--signal-hold)",
    bad: "var(--signal-avoid)",
    na: "var(--signal-hold)",   // amber — data not available (neutral), like the stock ficha
    neutral: "var(--text-primary)",
};

// ── Tooltip + metric row ─────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────
export default function CryptoDetail({ company, score: initialScore, onClose }: CryptoDetailProps) {
    const t = useTranslations("cryptoDetail");
    const geckoId = company.id.replace(/^cg_/, "");

    const [fundamentals, setFundamentals] = useState<CryptoFundamentals | null>(null);
    const [score, setScore] = useState<AlgorithmScore>(initialScore);
    const [description, setDescription] = useState<string>(company.description ?? "");
    const [loading, setLoading] = useState(true);
    const [ai, setAi] = useState<CryptoQualitative | null>(null);
    const aiLevel = ai ? reinforcementLevel(ai.qualitativeScore) : 0;

    useEffect(() => {
        let active = true;
        // Reset to loading when the selected coin changes (intentional sync set).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        fetch(`/api/crypto/${encodeURIComponent(geckoId)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { fundamentals: CryptoFundamentals; score: AlgorithmScore; company: Company } | null) => {
                if (!active || !d) return;
                setFundamentals(d.fundamentals);
                setScore(d.score);
                setDescription(d.company?.description ?? "");
            })
            .catch(() => { })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [geckoId]);

    const f = fundamentals;

    return (
        <AnimatePresence>
            <div className="w-full max-w-4xl mx-auto" style={{ background: "var(--bg-secondary)" }}>
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
                                <span className="font-bold text-base" style={{ color: "var(--accent-amber)" }}>{company.ticker}</span>
                                <span className="text-sm font-medium">{company.name}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {company.exchange} · {company.sector}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DiscardButton company={company} assetType="c" />
                        <WatchlistButton company={company} assetType="c" />
                        <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
                            <X size={18} style={{ color: "var(--text-muted)" }} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 space-y-5">
                    {/* Intro: what the project is / does (highlighted) */}
                    {description && (
                        <div className="rounded-2xl p-5" style={{
                            background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(167,139,250,0.05))",
                            border: "1px solid var(--border-active)",
                        }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Coins size={15} style={{ color: "var(--accent-amber)" }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-amber)" }}>
                                    {t("aboutTitle")}
                                </span>
                                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>· {company.sector}</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                {description}
                            </p>
                        </div>
                    )}

                    {/* AI qualitative layer (reinforces/weakens the score) */}
                    {f && <CryptoAiSection fundamentals={f} description={description} onResult={setAi} />}

                    {/* Disclaimer */}
                    <p className="text-[11px] leading-relaxed px-3 py-2 rounded-lg" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", color: "var(--text-muted)" }}>
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
                        <Row label={t("pillarValue")} value={`${score.valuationScore}/100`} tone="neutral" />
                        <Row label={t("pillarNetwork")} value={`${score.trendScore}/100`} tone="neutral" />
                        <Row label={t("pillarMomentum")} value={`${score.timingScore}/100`} tone="neutral" />
                        {f?.fearGreed != null && (
                            <Row label={t("fearGreed")} value={`${f.fearGreed} · ${f.fearGreedLabel ?? ""}`} tone={f.fearGreed <= 45 ? "good" : f.fearGreed >= 75 ? "warn" : "neutral"} tooltip={t("fearGreedTip")} />
                        )}
                    </section>

                    {loading && !f && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-amber)" }} />
                        </div>
                    )}

                    {f && (
                        <>
                            {/* Unlock warning */}
                            {f.nextUnlockDays !== null && f.nextUnlockDays >= 0 && f.nextUnlockDays <= 45 && (
                                <div className="px-3 py-2 rounded-lg text-[11px] flex items-center gap-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "var(--signal-hold)" }}>
                                    <AlertTriangle size={13} /> {t("unlockWarn", { days: f.nextUnlockDays })}
                                </div>
                            )}

                            {/* Pillar 1 — Tokenomics & Value */}
                            <section className="glass-card p-4">
                                <PillarHeader icon={Coins} title={t("pillarValue")} score={score.valuationScore} color="var(--accent-amber)" />
                                <Row label={t("price")} value={`$${f.price}`} tone="neutral" />
                                <Row label={t("marketCap")} value={usd(f.marketCap)} tone="neutral" />
                                <Row label={t("supplyDiluted")} value={f.circulatingSupply && f.maxSupply ? pctStr((f.circulatingSupply / f.maxSupply) * 100) : "N/D"}
                                    tone={f.circulatingSupply && f.maxSupply ? ((f.circulatingSupply / f.maxSupply) >= 0.8 ? "good" : "warn") : "na"} tooltip={t("supplyDilutedTip")} />
                                <Row label={t("fdvMc")} value={f.fdv && f.marketCap ? ratio(f.fdv / f.marketCap) : "N/D"}
                                    tone={f.fdv && f.marketCap ? ((f.fdv / f.marketCap) <= 1.5 ? "good" : (f.fdv / f.marketCap) <= 2.5 ? "warn" : "bad") : "na"} tooltip={t("fdvMcTip")} />
                                <Row label={t("cryptoPS")} value={ratio(f.psRatio)} tone={f.psRatio == null ? "na" : f.psRatio < 20 ? "good" : f.psRatio < 80 ? "warn" : "bad"} tooltip={t("cryptoPSTip")} />
                                <Row label={t("mcTvl")} value={ratio(f.mcapToTvl)} tone={f.mcapToTvl == null ? "na" : f.mcapToTvl < 3 ? "good" : f.mcapToTvl < 8 ? "warn" : "bad"} tooltip={t("mcTvlTip")} />
                                <Row label={t("tvl")} value={usd(f.tvl)} tone="neutral" tooltip={t("tvlTip")} />
                                <Row label={t("annualFees")} value={usd(f.annualizedFees)} tone="neutral" tooltip={t("annualFeesTip")} />
                            </section>

                            {/* Pillar 2 — Network / On-chain */}
                            <section className="glass-card p-4">
                                <PillarHeader icon={Network} title={t("pillarNetwork")} score={score.trendScore} color="var(--accent-cyan)" />
                                <Row label={t("devCommits")} value={intStr(f.devCommits4w)} tone={f.devCommits4w == null ? "na" : f.devCommits4w >= 40 ? "good" : f.devCommits4w >= 3 ? "warn" : "bad"} tooltip={t("devCommitsTip")} />
                                <Row label={t("devContributors")} value={intStr(f.devContributors)} tone={f.devContributors == null ? "na" : f.devContributors >= 8 ? "good" : "warn"} />
                                <Row label={t("tvlTrend")} value={pctStr(f.tvlChange7d, true)} tone={f.tvlChange7d == null ? "na" : f.tvlChange7d > 0 ? "good" : f.tvlChange7d > -10 ? "warn" : "bad"} tooltip={t("tvlTrendTip")} />
                                <Row label={t("holders")} value={intStr(f.holderCount)} tone={f.holderCount == null ? "na" : f.holderCount >= 20000 ? "good" : f.holderCount >= 1000 ? "warn" : "bad"} tooltip={t("holdersTip")} />
                                <Row label={t("concentration")} value={pctStr(f.top10ConcentrationPct)} tone={f.top10ConcentrationPct == null ? "na" : f.top10ConcentrationPct < 40 ? "good" : f.top10ConcentrationPct < 70 ? "warn" : "bad"} tooltip={t("concentrationTip")} />
                                <Row
                                    label={t("whaleAccum")}
                                    value={f.whaleAccumulationPct === null ? "N/D" : `${pctStr(f.whaleAccumulationPct, true)}${f.whaleWindowDays ? ` · ${f.whaleWindowDays}d` : ""}`}
                                    tone={f.whaleAccumulationPct == null ? "na" : f.whaleAccumulationPct > 1 ? "good" : f.whaleAccumulationPct > -1 ? "neutral" : "bad"}
                                    tooltip={t("whaleAccumTip")}
                                />
                                {f.dataQuality.onchain && f.whaleAccumulationPct === null && f.whaleHistoryPoints > 0 && (
                                    <p className="text-[10px] italic mt-1.5" style={{ color: "var(--text-muted)" }}>
                                        {t("whaleHistoryBuilding", { n: f.whaleHistoryPoints })}
                                    </p>
                                )}
                            </section>

                            {/* Chain-specific network stats (Hedera Mirror Node) */}
                            {f.networkStats && (
                                <section className="glass-card p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Gauge size={14} style={{ color: "var(--accent-violet)" }} />
                                        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{t("networkStatsTitle")}</h3>
                                    </div>
                                    {f.networkStats.tpsEstimate !== null && (
                                        <div className="flex items-end gap-2 mb-3">
                                            <span className="text-3xl font-bold font-mono" style={{ color: "var(--accent-violet)" }}>{f.networkStats.tpsEstimate.toFixed(1)}</span>
                                            <span className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                                                {t("tps")}{f.networkStats.tpsSampleSize ? ` · ${t("tpsSample", { n: f.networkStats.tpsSampleSize })}` : ""}
                                            </span>
                                        </div>
                                    )}
                                    <Row label={t("newAccounts")} value={f.networkStats.newAccountsPerDay !== null ? `~${Math.round(f.networkStats.newAccountsPerDay).toLocaleString("es-ES")}/día` : "N/D"} tone="good" tooltip={t("newAccountsTip")} />
                                    <Row label={t("onchainCirculating")} value={f.networkStats.circulatingSupply !== null ? `${(f.networkStats.circulatingSupply / 1e9).toFixed(2)}B HBAR` : "N/D"} tone="neutral" tooltip={t("onchainSupplyTip")} />
                                    <Row label={t("onchainTotal")} value={f.networkStats.totalSupply !== null ? `${(f.networkStats.totalSupply / 1e9).toFixed(2)}B HBAR` : "N/D"} tone="neutral" />
                                    {f.networkStats.txTypeBreakdown.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("txMix")}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {f.networkStats.txTypeBreakdown.map((tx) => (
                                                    <span key={tx.name} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                                                        {tx.name} · {tx.count}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Pillar 3 — Momentum */}
                            <section className="glass-card p-4">
                                <PillarHeader icon={ActivitySquare} title={t("pillarMomentum")} score={score.timingScore} color="var(--accent-emerald)" />
                                <Row label={t("athDiscount")} value={pctStr(f.athChangePct)} tone={f.athChangePct <= -60 ? "good" : f.athChangePct <= -20 ? "warn" : "neutral"} tooltip={t("athDiscountTip")} />
                                <Row label={t("atlDistance")} value={pctStr(f.atlChangePct, true)} tone={f.atlChangePct > 100 ? "good" : f.atlChangePct > 50 ? "warn" : "bad"} tooltip={t("atlDistanceTip")} />
                                <Row label={t("change30d")} value={pctStr(f.change30d, true)} tone={f.change30d == null ? "na" : f.change30d > 0 ? "good" : "warn"} />
                                <Row label={t("change1y")} value={pctStr(f.change1y, true)} tone={f.change1y == null ? "na" : f.change1y > 0 ? "good" : "warn"} />
                            </section>

                            {/* On-chain catalysts */}
                            {f.catalysts.length > 0 && (
                                <section className="glass-card p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar size={14} style={{ color: "var(--accent-violet)" }} />
                                        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{t("catalystsTitle")}</h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {f.catalysts.map((c, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                                                <span className="flex-1" style={{ color: "var(--text-secondary)" }}>{c.title}</span>
                                                {c.category && <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{c.category}</span>}
                                                {c.daysUntil !== null && <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--text-muted)" }}>{c.daysUntil >= 0 ? `${c.daysUntil}d` : t("recent")}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AnimatePresence>
    );
}
