// ============================================================
// Crypto Detail - Specialized view for Tokenomics & Momentum
// ============================================================

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Company, AlgorithmScore } from "@/lib/types";
import { formatMarketCap, formatPercent, formatCurrency } from "@/lib/utils";
import ScoreRing from "./ScoreRing";
import { X, ArrowUpRight, ArrowDownRight, Shield, Target, Globe, HelpCircle, Coins, ActivitySquare } from "lucide-react";

interface CryptoDetailProps {
    company: Company;
    score: AlgorithmScore;
    onClose: () => void;
}

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

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-3 mt-2">
            <Icon size={14} style={{ color: "var(--accent-orange, #f59e0b)" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                {title}
            </h3>
        </div>
    );
}

export default function CryptoDetail({ company, score, onClose }: CryptoDetailProps) {
    const m = company.metrics;

    const deltaColor = (val: number) =>
        val >= 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)";

    const deltaArrow = (val: number) =>
        val >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />;

    return (
        <AnimatePresence>
            <motion.div
                key="crypto-detail"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 h-full overflow-y-auto z-40"
                style={{
                    width: "min(600px, 100vw - 72px)",
                    background: "var(--bg-secondary)",
                    borderLeft: "1px solid var(--border-subtle)",
                    boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.5)",
                }}
            >
                {/* Header */}
                <div
                    className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
                    style={{
                        background: "var(--bg-secondary)",
                        borderBottom: "1px solid var(--border-subtle)",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <div className="flex items-center gap-4">
                        <ScoreRing score={score.totalScore} size={48} strokeWidth={3} recommendation={score.recommendation.replace("_", " ")} />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-base" style={{ color: "var(--accent-orange, #f59e0b)" }}>
                                    {company.ticker}
                                </span>
                                <span className="text-sm font-medium">{company.name}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {company.exchange} · {company.sector}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    >
                        <X size={18} style={{ color: "var(--text-muted)" }} />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-6">
                    {/* Section 1: Score Breakdown */}
                    <section className="glass-card p-4">
                        <SectionHeader icon={Target} title="1 · Score Breakdown" />
                        <div className="flex flex-col justify-center space-y-2">
                            <MetricRow label="Tokenomics (50%)" value={`${score.valuationScore}/50`} color="var(--accent-orange, #f59e0b)" />
                            <MetricRow label="Momentum (50%)" value={`${score.timingScore}/50`} color="var(--accent-emerald)" />
                            <MetricRow label="Total Score" value={`${score.totalScore}/100`} color="var(--accent-cyan)" />
                        </div>
                    </section>

                    {/* Section 2: Hard Filters */}
                    <section className="glass-card p-4">
                        <SectionHeader icon={Shield} title="2 · Hard Filters (Mandatory Passes)" />
                        <div className="space-y-1">
                            <MetricRow
                                label="24h Volume"
                                value={formatCurrency(m.fcfYield * m.marketCap * 1_000_000, true)}
                                color={(m.fcfYield * m.marketCap) > 1 ? "var(--signal-strong-buy)" : "var(--signal-avoid)"}
                                tooltip="Total 24h trading volume. Must be > $1M to pass the liquidity (dead coin) filter."
                            />
                            <MetricRow
                                label="Market Cap"
                                value={formatMarketCap(m.marketCap)}
                                color={m.marketCap > 10 ? "var(--signal-strong-buy)" : "var(--signal-avoid)"}
                                tooltip="Total market value. Must be > $10M to pass the micro-cap scam filter."
                            />
                        </div>
                    </section>

                    {/* Section 3: Tokenomics */}
                    <section className="glass-card p-4">
                        <SectionHeader icon={Coins} title="3 · Tokenomics Breakdown (50%)" />
                        <MetricRow
                            label="Supply Diluted"
                            value={formatPercent(m.bookToMarket)}
                            color={m.bookToMarket >= 0.8 ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                            tooltip="Circulating Supply / Max Supply. Coins with 100% circulating supply have no future unlock dumps. Lower is worse."
                        />
                        <MetricRow
                            label="Liquidity / Interest Ratio"
                            value={formatPercent(m.fcfYield)}
                            color={m.fcfYield > 0.05 ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                            tooltip="24h Volume / Market Cap. Measures real market interest vs ghost-chain manipulation. >10% is excellent."
                        />
                    </section>

                    {/* Section 4: Momentum */}
                    <section className="glass-card p-4 space-y-6">
                        <SectionHeader icon={ActivitySquare} title="4 · Momentum Breakdown (50%)" />

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Price Context</p>
                            <MetricRow label="Current Price" value={`$${m.currentPrice.toFixed(4)}`} />
                            <MetricRow label="Distance to ATH" value={`${formatPercent((m.currentPrice - m.fiftyTwoWeekHigh) / (m.fiftyTwoWeekHigh || 1))} from Peak`} tooltip="Distance from All-Time High. Rewards buying strong assets during heavy drawdowns." />
                            <MetricRow label="Distance from ATL" value={`+${formatPercent((m.currentPrice - m.fiftyTwoWeekLow) / (m.fiftyTwoWeekLow || 1))} from Low`} tooltip="Distance from All-Time Low. Secures against buying assets breaking into new lows." />
                        </div>

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Momentum Indicators</p>
                            <MetricRow label="24H Change" value={formatPercent(m.ebitMargin)} color={deltaColor(m.ebitMargin)} tooltip="Short-term momentum. Rewards controlled uptrends, penalizes euphoric pumps >50%." />
                            <MetricRow label="7D Change" value={formatPercent(m.grossMargin)} color={deltaColor(m.grossMargin)} tooltip="Weekly momentum. Confirms trend direction." />
                            <MetricRow label="1M Return" value={formatPercent(m.oneMonthReturn)} color={deltaColor(m.oneMonthReturn)} />
                        </div>
                    </section>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
