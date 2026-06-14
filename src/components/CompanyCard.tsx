// ============================================================
// Company Card - Expandable card with Framer Motion
// ============================================================

"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { Company, AlgorithmScore } from "@/lib/types";
import { formatMarketCap, formatPercent } from "@/lib/utils";
import { tierLabel } from "@/lib/algorithm";
import ScoreRing from "./ScoreRing";
import { ChevronRight, TrendingUp, TrendingDown, Star, Loader2 } from "lucide-react";

interface CompanyCardProps {
    company: Company;
    score: AlgorithmScore;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

function getBadgeClass(rec: AlgorithmScore["recommendation"]): string {
    const map: Record<string, string> = {
        STRONG_BUY: "badge-strong-buy",
        BUY: "badge-buy",
        HOLD: "badge-hold",
        AVOID: "badge-avoid",
    };
    return map[rec] || "badge-hold";
}

function getRecLabel(rec: AlgorithmScore["recommendation"]): string {
    const map: Record<string, string> = {
        STRONG_BUY: "Strong Buy",
        BUY: "Buy",
        HOLD: "Hold",
        AVOID: "Avoid",
    };
    return map[rec] || rec;
}

export default function CompanyCard({ company, score, isSelected, onSelect }: CompanyCardProps) {
    const m = company.metrics;
    const isPositiveReturn = m.oneMonthReturn >= 0;

    // ── Watchlist state ────────────────────────────────────────
    const [starred, setStarred] = useState(false);
    const [starLoading, setStarLoading] = useState(false);

    const handleStar = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation(); // don't open detail panel
        if (starLoading) return;
        setStarLoading(true);
        try {
            const isCrypto = company.exchange === "Crypto";
            // Lookup key: CoinGecko ID for crypto (from company.id "cg_<id>"), symbol for stocks
            const lookupKey = isCrypto ? company.id.replace(/^cg_/, "") : company.ticker;
            const res = await fetch("/api/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker: lookupKey,
                    symbol: company.ticker,
                    name: company.name,
                    assetType: isCrypto ? "c" : "s",
                }),
            });
            if (res.ok || res.status === 409) setStarred(true); // 409 = already exists → still show filled
        } catch {
            // silent fail
        } finally {
            setStarLoading(false);
        }
    }, [company, starLoading]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => onSelect(company.id)}
            className="cursor-pointer group"
            style={{
                background: isSelected ? "var(--bg-card-hover)" : "var(--bg-card)",
                border: isSelected
                    ? "1px solid var(--border-active)"
                    : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                transition: "background 0.2s ease, border-color 0.2s ease",
            }}
        >
            <div className="flex items-center gap-4">
                {/* Score Ring */}
                <ScoreRing score={score.totalScore} size={56} strokeWidth={3.5} />

                {/* Company Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm tracking-wide" style={{ color: "var(--accent-cyan)" }}>
                            {company.ticker}
                        </span>
                        <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${getBadgeClass(score.recommendation)}`}
                        >
                            {getRecLabel(score.recommendation)}
                        </span>
                        <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                                background: "var(--bg-tertiary)",
                                color: "var(--text-muted)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            {tierLabel(score.tier)}
                        </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {company.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                            MCap {formatMarketCap(m.marketCap)}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                            {company.exchange === "Crypto" ? "Vol/MCap" : "FCF"} {formatPercent(m.fcfYield)}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                            {company.exchange === "Crypto" ? "Circ/Max" : "B/M"} {company.exchange === "Crypto" ? formatPercent(m.bookToMarket) : m.bookToMarket.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Return & Arrow */}
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                        {isPositiveReturn ? (
                            <TrendingUp size={14} style={{ color: "var(--signal-strong-buy)" }} />
                        ) : (
                            <TrendingDown size={14} style={{ color: "var(--signal-avoid)" }} />
                        )}
                        <span
                            className="text-xs font-mono font-bold"
                            style={{
                                color: isPositiveReturn ? "var(--signal-strong-buy)" : "var(--signal-avoid)",
                            }}
                        >
                            {formatPercent(m.oneMonthReturn)}
                        </span>
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        1M Return
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {/* Watchlist star button */}
                        <button
                            onClick={handleStar}
                            title={starred ? "En watchlist" : "Añadir a watchlist"}
                            className="p-1 rounded-lg transition-all cursor-pointer"
                            style={{ color: starred ? "var(--accent-amber)" : "var(--text-muted)" }}
                        >
                            {starLoading
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Star size={13} fill={starred ? "var(--accent-amber)" : "none"} />
                            }
                        </button>
                        <ChevronRight
                            size={16}
                            style={{ color: "var(--text-muted)" }}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </div>
                </div>
            </div>

            {/* Hard filter failure reasons */}
            {!score.passesHardFilters && score.hardFilterReasons.length > 0 && (
                <div
                    className="mt-3 px-3 py-2 rounded-lg text-[11px]"
                    style={{
                        background: "rgba(251, 113, 133, 0.06)",
                        border: "1px solid rgba(251, 113, 133, 0.12)",
                        color: "var(--signal-avoid)",
                    }}
                >
                    ⚠ {score.hardFilterReasons.join(" · ")}
                </div>
            )}
        </motion.div>
    );
}
