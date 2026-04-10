// ============================================================
// Company Detail - Expanded 8-section study view
// ============================================================

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Company, AlgorithmScore } from "@/lib/types";
import { formatMarketCap, formatPercent, formatCurrency } from "@/lib/utils";
import { PriceChart, MarginChart, ReturnChart, ScoreBreakdownChart } from "./FinancialCharts";
import ScoreRing from "./ScoreRing";
import { X, ArrowUpRight, ArrowDownRight, Shield, Target, Activity, BarChart3, Gauge, Globe, HelpCircle } from "lucide-react";

interface CompanyDetailProps {
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
            <Icon size={14} style={{ color: "var(--accent-cyan)" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                {title}
            </h3>
        </div>
    );
}

export default function CompanyDetail({ company, score, onClose }: CompanyDetailProps) {
    const m = company.metrics;

    const deltaColor = (val: number) =>
        val >= 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)";

    const deltaArrow = (val: number) =>
        val >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />;

    return (
        <AnimatePresence>
            <motion.div
                key="company-detail"
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <ScoreBreakdownChart
                                    valuationScore={score.valuationScore}
                                    trendScore={score.trendScore}
                                    timingScore={score.timingScore}
                                />
                            </div>
                            <div className="flex flex-col justify-center space-y-2">
                                <MetricRow label="Valuation (40%)" value={`${score.valuationScore}/100`} color="var(--accent-cyan)" />
                                <MetricRow label="Trend (30%)" value={`${score.trendScore}/100`} color="var(--accent-violet)" />
                                <MetricRow label="Timing (20%)" value={`${score.timingScore}/100`} color="var(--accent-amber)" />
                                <MetricRow label="Macro Adj." value={`×${score.macroAdjustment.toFixed(2)}`} color="var(--text-secondary)" />
                                <MetricRow label="Total Score" value={`${score.totalScore}/100`} color="var(--accent-emerald)" />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Hard Filters */}
                    <section className="glass-card p-4">
                        <SectionHeader icon={Shield} title="2 · Hard Filters (Mandatory Passes)" />
                        <div className="space-y-1">
                            <MetricRow
                                label="Total Equity"
                                value={formatCurrency(m.totalEquity * 1_000_000, true)}
                                color={m.totalEquity > 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)"}
                                tooltip="Total Equity = Total Assets minus Total Liabilities. A negative value can be a red flag, though acceptable for large-caps undergoing massive buybacks."
                            />
                            <MetricRow
                                label="Market Cap"
                                value={formatMarketCap(m.marketCap)}
                                color="var(--text-primary)"
                                tooltip="Total market value of the company's outstanding shares. Used to determine the algorithm's Tier (Large, Mid, Small)."
                            />
                            <MetricRow
                                label="Operating Profit"
                                value={formatCurrency(m.operatingProfit * 1_000_000, true)}
                                color={m.operatingProfit > 0 ? "var(--signal-strong-buy)" : "var(--signal-avoid)"}
                                tooltip="Profit from core business operations. Must be positive as a baseline health indicator."
                            />
                        </div>
                    </section>

                    {/* Section 3: Valuation */}
                    <section className="glass-card p-4">
                        <SectionHeader icon={BarChart3} title="3 · Valuation Breakdown (40%)" />
                        <MetricRow
                            label="FCF Yield"
                            value={formatPercent(m.fcfYield)}
                            color={m.fcfYield >= 0.05 ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                            tooltip="Free Cash Flow Yield: How much free cash the company generates relative to its market value. Higher is better."
                        />
                        <MetricRow
                            label="Book-to-Market"
                            value={m.bookToMarket.toFixed(2)}
                            color={m.bookToMarket > 0.40 ? "var(--signal-strong-buy)" : "var(--signal-hold)"}
                            tooltip="Equity divided by Market Cap. Value > 1.0 means it trades below liquidation value. Higher indicates a potential 'classic value' bargain."
                        />
                    </section>

                    {/* Section 4: Trend & Quality */}
                    <section className="glass-card p-4 space-y-6">
                        <SectionHeader icon={Activity} title="4 · Trend & Quality Breakdown (30%)" />

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Margin Evolution</p>
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
                        </div>

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Capital Efficiency (ROC & ROE)</p>
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
                        </div>

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Reinvestment Efficiency</p>
                            <MetricRow label="Asset Growth" value={formatPercent(m.assetGrowth)} tooltip="How fast the company is expanding its asset base (investing)." />
                            <MetricRow label="EBITDA Growth" value={formatPercent(m.ebitdaGrowth)} color={m.ebitdaGrowth >= m.assetGrowth ? "var(--signal-strong-buy)" : "var(--signal-avoid)"} tooltip="How fast core independent earnings are growing." />
                            <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{
                                background: m.ebitdaGrowth >= m.assetGrowth ? "rgba(52, 211, 153, 0.06)" : "rgba(251, 113, 133, 0.06)",
                                border: m.ebitdaGrowth >= m.assetGrowth ? "1px solid rgba(52, 211, 153, 0.12)" : "1px solid rgba(251, 113, 133, 0.12)",
                                color: m.ebitdaGrowth >= m.assetGrowth ? "var(--signal-strong-buy)" : "var(--signal-avoid)",
                            }}>
                                {m.ebitdaGrowth >= m.assetGrowth
                                    ? "✓ EBITDA growth outpaces asset growth — efficient capital allocation"
                                    : "⚠ Asset growth exceeds EBITDA growth — potential inefficiency"}
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Timing & Momentum */}
                    <section className="glass-card p-4 space-y-6">
                        <SectionHeader icon={Globe} title="5 · Timing & Momentum Breakdown (20%)" />

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">Price History (12M)</p>
                            <PriceChart company={company} />
                        </div>

                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">Momentum Indicators</p>
                            <MetricRow label="Current Price" value={`$${m.currentPrice.toFixed(2)}`} />
                            <MetricRow label="52-Week Low" value={`$${m.fiftyTwoWeekLow.toFixed(2)}`} tooltip="The lowest price in the last year. The algorithm rewards trading closer to the bottom." />
                            <MetricRow label="52-Week High" value={`$${m.fiftyTwoWeekHigh.toFixed(2)}`} />
                            <MetricRow label="1-Month Return" value={formatPercent(m.oneMonthReturn)} color={deltaColor(m.oneMonthReturn)} tooltip="Short-term momentum. Slightly positive returns are rewarded." />
                            <MetricRow label="3-Month Return" value={formatPercent(m.threeMonthReturn)} color={deltaColor(m.threeMonthReturn)} />
                            <MetricRow label="6-Month Return" value={formatPercent(m.sixMonthReturn)} color={m.sixMonthReturn > 0.40 ? "var(--signal-avoid)" : deltaColor(m.sixMonthReturn)} tooltip="Medium-term momentum. Very high returns are penalized as 'euphoria'." />
                            {m.sixMonthReturn > 0.30 && (
                                <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{
                                    background: "rgba(251, 191, 36, 0.06)",
                                    border: "1px solid rgba(251, 191, 36, 0.12)",
                                    color: "var(--signal-hold)",
                                }}>
                                    ⚠ High 6M returns suggest possible euphoria — mean reversion risk
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Description */}
                    <section className="glass-card p-4">
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {company.description}
                        </p>
                    </section>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
