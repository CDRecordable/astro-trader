// ============================================================
// Dashboard - Main Explorer Mode layout (Search-first)
// ============================================================

"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import CompanyDetail from "./CompanyDetail";
import CryptoDetail from "./CryptoDetail";
import Header from "./Header";
import TickerSearch from "./TickerSearch";
import { Search, Sparkles, TrendingUp, Zap, Globe2 } from "lucide-react";
import { useTranslations } from "next-intl";

// ── Explorer: Search-first interface ────────────────────────

function ExplorerLanding({ assetClass }: { assetClass: "stocks" | "crypto" }) {
    const t = useTranslations("explorerLanding");
    const isCrypto = assetClass === "crypto";
    const assetType = isCrypto ? "c" as const : "s" as const;

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] px-5">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-center mb-10"
            >
                { /* Animated icon */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
                    style={{
                        background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))",
                        border: "1px solid rgba(34,211,238,0.2)",
                        boxShadow: "0 0 40px rgba(34,211,238,0.1)",
                    }}
                >
                    <Search size={36} style={{ color: "var(--accent-cyan)" }} />
                </motion.div>

                <h1
                    className="text-3xl font-bold mb-3"
                    style={{
                        background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    {isCrypto ? t("cryptoTitle") : t("stocksTitle")}
                </h1>
                <p
                    className="text-sm max-w-md mx-auto leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                >
                    {isCrypto ? t("cryptoSubtitle") : t("stocksSubtitle")}
                </p>
            </motion.div>

            {/* Search Component */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                <TickerSearch assetType={assetType} />
            </motion.div>

            {/* Feature Pills */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-3 mt-10"
            >
                {[
                    { icon: Zap, label: t("pillZeroCost"), color: "var(--accent-amber)" },
                    { icon: Globe2, label: isCrypto ? t("pillCryptoCount") : t("pillStockCount"), color: "var(--accent-cyan)" },
                    { icon: Sparkles, label: t("pillAnalysis"), color: "var(--accent-violet)" },
                    { icon: TrendingUp, label: t("pillRealtime"), color: "var(--accent-emerald)" },
                ].map(({ icon: Icon, label, color }, i) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium"
                        style={{
                            background: `${color}10`,
                            border: `1px solid ${color}25`,
                            color: color,
                        }}
                    >
                        <Icon size={13} />
                        {label}
                    </motion.div>
                ))}
            </motion.div>

            {/* Market Badges */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-2 mt-8"
            >
                {isCrypto ? (
                    <>
                        {["Bitcoin", "Ethereum", "Solana", "XRP", "DOGE", "+490 more"].map((name) => (
                            <span
                                key={name}
                                className="text-[10px] px-2.5 py-1 rounded-full"
                                style={{
                                    background: "var(--bg-tertiary)",
                                    color: "var(--text-muted)",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                {name}
                            </span>
                        ))}
                    </>
                ) : (
                    <>
                        {["S&P 500", "Russell 2000", "IBEX 35", "Mercado Continuo"].map((name) => (
                            <span
                                key={name}
                                className="text-[10px] px-2.5 py-1 rounded-full"
                                style={{
                                    background: "var(--bg-tertiary)",
                                    color: "var(--text-muted)",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                {name}
                            </span>
                        ))}
                    </>
                )}
            </motion.div>
        </div>
    );
}

// ── Inline Search Bar (shown above the detail view) ──────────

function InlineSearchBar({ assetClass }: { assetClass: "stocks" | "crypto" }) {
    const isCrypto = assetClass === "crypto";
    const assetType = isCrypto ? "c" as const : "s" as const;

    return (
        <div
            className="px-6 py-3"
            style={{
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-subtle)",
            }}
        >
            <div className="max-w-2xl mx-auto">
                <TickerSearch assetType={assetType} compact />
            </div>
        </div>
    );
}

// ── Dashboard ────────────────────────────────────────────────

export default function Dashboard() {
    const {
        companies,
        scores,
        selectedCompanyId,
        isDetailOpen,
        assetClass,
        selectCompany,
    } = useAppStore();

    const selectedCompany = useMemo(
        () => companies.find((c) => c.id === selectedCompanyId) ?? null,
        [companies, selectedCompanyId]
    );

    const selectedScore = useMemo(
        () => scores.find((s) => s.companyId === selectedCompanyId) ?? null,
        [scores, selectedCompanyId]
    );

    return (
        <div className="min-h-screen" style={{ marginLeft: 72 }}>
            {/* Header is ALWAYS visible */}
            <Header />

            {/* Explorer Landing (only when no detail is open) */}
            {!isDetailOpen && (
                <ExplorerLanding assetClass={assetClass} />
            )}

            {/* Full-width Detail View (below header, no overlay) */}
            <AnimatePresence>
                {isDetailOpen && selectedCompany && selectedScore && (
                    <motion.div
                        key="detail-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Inline search bar above the detail */}
                        <InlineSearchBar assetClass={assetClass} />

                        {/* Detail content */}
                        <div className="w-full">
                            {assetClass === "crypto" ? (
                                <CryptoDetail
                                    company={selectedCompany}
                                    score={selectedScore}
                                    onClose={() => selectCompany(null)}
                                />
                            ) : (
                                <CompanyDetail
                                    company={selectedCompany}
                                    score={selectedScore}
                                    onClose={() => selectCompany(null)}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
