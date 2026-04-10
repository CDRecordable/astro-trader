// ============================================================
// Dashboard - Main Explorer Mode layout
// ============================================================

"use client";

import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { MARKET_GROUPS, CRYPTO_GROUPS, type MarketGroupId, type CryptoGroupId, type MarketGroup } from "@/lib/market-groups";
import ExplorerFilters from "./ExplorerFilters";
import CompanyCard from "./CompanyCard";
import CompanyDetail from "./CompanyDetail";
import CryptoDetail from "./CryptoDetail";
import Header from "./Header";
import { Search, Loader2, Plus, ArrowLeft, Globe2, TrendingUp } from "lucide-react";

// ── Market Selector Card ─────────────────────────────────────

const MARKET_ORDER: MarketGroupId[] = [
    "us_large", "us_mid", "us_small", "sp500_top", "eu_major", "ibex_mc",
];

const CRYPTO_ORDER: CryptoGroupId[] = [
    "all", "layer-1", "decentralized-finance-defi", "artificial-intelligence", "gaming", "meme-token"
];

function MarketSelectorCard({
    market,
    onSelect,
}: {
    market: MarketGroup;
    onSelect: (id: string) => void;
}) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(market.id)}
            className="text-left rounded-2xl p-5 transition-all duration-300 group cursor-pointer"
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{market.flag}</span>
                {market.tickers.length > 0 && (
                    <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                    >
                        {market.tickers.length} tickers
                    </span>
                )}
            </div>
            <h3
                className="text-sm font-semibold mb-1 group-hover:text-white transition-colors"
                style={{ color: "var(--text-primary)" }}
            >
                {market.label}
            </h3>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {market.description}
            </p>
            <div
                className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ color: "var(--accent-cyan)" }}
            >
                <TrendingUp size={12} />
                Scan Market
            </div>
        </motion.button>
    );
}

// ── Market Selector Landing ──────────────────────────────────

function MarketSelector({
    assetClass,
    onSelect,
}: {
    assetClass: "stocks" | "crypto";
    onSelect: (id: string) => void;
}) {
    const isCrypto = assetClass === "crypto";
    const order = isCrypto ? CRYPTO_ORDER : MARKET_ORDER;
    const groups = isCrypto ? CRYPTO_GROUPS : MARKET_GROUPS;

    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <div className="max-w-3xl w-full">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Globe2 size={28} style={{ color: "var(--accent-cyan)" }} />
                        <h2
                            className="text-xl font-bold"
                            style={{ color: "var(--text-primary)" }}
                        >
                            Select a Market
                        </h2>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Choose a market universe to scan. The algorithm will analyze each company and rank them.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.map((id, i) => (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <MarketSelectorCard
                                market={(groups as Record<string, MarketGroup>)[id]}
                                onSelect={onSelect}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Dashboard ────────────────────────────────────────────────

export default function Dashboard() {
    const {
        companies,
        scores,
        filters,
        selectedCompanyId,
        isDetailOpen,
        isLoading,

        selectedMarket,
        assetClass,
        selectCompany,
        addCompanyByTicker,
        setSelectedMarket,
    } = useAppStore();

    const [searchQuery, setSearchQuery] = React.useState("");


    const filteredScores = useMemo(() => {
        let result = scores;

        // Apply hard-filter toggle
        if (filters.showOnlyPassing) {
            result = result.filter((s) => s.passesHardFilters);
        }

        // Unified slider filters for both mock and live
        result = result.filter((s) => {
            const company = companies.find((c) => c.id === s.companyId);
            if (!company) return false;
            const m = company.metrics;

            // Market cap filter (always apply)
            if (m.marketCap > filters.maxMarketCap) return false;

            // FCF Yield filter (only if slider is above 0)
            if (filters.minFcfYield > 0 && m.fcfYield < filters.minFcfYield) return false;

            // Book-to-Market filter (only if slider is above 0)
            if (filters.minBookToMarket > 0 && m.bookToMarket < filters.minBookToMarket) return false;

            return true;
        });

        // Apply search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (s) =>
                    s.ticker.toLowerCase().includes(q) ||
                    s.name.toLowerCase().includes(q)
            );
        }

        return result;
    }, [scores, filters, searchQuery, companies]);

    const selectedCompany = useMemo(
        () => companies.find((c) => c.id === selectedCompanyId) ?? null,
        [companies, selectedCompanyId]
    );

    const selectedScore = useMemo(
        () => scores.find((s) => s.companyId === selectedCompanyId) ?? null,
        [scores, selectedCompanyId]
    );

    // Dynamic search: can we try to add this ticker?
    const canAddTicker = searchQuery.trim().length >= 1 &&
        filteredScores.length === 0 &&
        !isLoading;

    const handleAddTicker = () => {
        if (canAddTicker) {
            addCompanyByTicker(searchQuery.trim());
            setSearchQuery("");
        }
    };

    const showMarketSelector = !selectedMarket && !isLoading;

    return (
        <div className="min-h-screen" style={{ marginLeft: 72 }}>
            <Header />

            {showMarketSelector ? (
                <div className="px-5 py-4">
                    <MarketSelector assetClass={assetClass} onSelect={setSelectedMarket} />
                </div>
            ) : (
                <div className="flex gap-5 p-5">
                    {/* Left: Filters */}
                    <div className="w-[280px] shrink-0 space-y-4">
                        <ExplorerFilters />

                        {/* Stats Summary */}
                        <div className="glass-card p-4">
                            <div className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                                Results
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center">
                                    <div className="text-2xl font-bold font-mono" style={{ color: "var(--accent-cyan)" }}>
                                        {filteredScores.length}
                                    </div>
                                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Matches</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold font-mono" style={{ color: "var(--signal-strong-buy)" }}>
                                        {filteredScores.filter((s) => s.recommendation === "STRONG_BUY").length}
                                    </div>
                                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Strong Buys</div>
                                </div>
                            </div>
                        </div>

                        {/* Data Source Info */}
                        <div className="glass-card p-4">
                            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                                Data Source
                            </div>
                            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                <span style={{ color: "var(--signal-strong-buy)" }}>● Live</span> — Yahoo Finance + FMP.
                                {companies.length} companies loaded.
                            </div>
                            {selectedMarket && (
                                <div className="mt-3">
                                    <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                                        Active Market
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{((assetClass === "crypto" ? CRYPTO_GROUPS : MARKET_GROUPS) as Record<string, MarketGroup>)[selectedMarket].flag}</span>
                                        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                                            {((assetClass === "crypto" ? CRYPTO_GROUPS : MARKET_GROUPS) as Record<string, MarketGroup>)[selectedMarket].label}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMarket(null)}
                                        className="mt-2 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                                        style={{ color: "var(--accent-cyan)" }}
                                    >
                                        <ArrowLeft size={12} />
                                        Change Market
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Company List */}
                    <div className="flex-1 min-w-0 relative">
                        {/* Search Bar */}
                        <div
                            className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl"
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <Search size={16} style={{ color: "var(--text-muted)" }} />
                            <input
                                type="text"
                                placeholder="Search by ticker or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && canAddTicker && handleAddTicker()}
                                className="bg-transparent outline-none text-sm flex-1"
                                style={{ color: "var(--text-primary)" }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{ color: "var(--text-muted)", background: "var(--bg-tertiary)" }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Loading Overlay */}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-20 flex items-center justify-center rounded-xl"
                                style={{ background: "rgba(9, 9, 11, 0.7)", backdropFilter: "blur(4px)" }}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                        {`Scanning ${selectedMarket ? ((assetClass === "crypto" ? CRYPTO_GROUPS : MARKET_GROUPS) as Record<string, MarketGroup>)[selectedMarket].label : "market"}...`}
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* Company Cards grouped by Tier */}
                        {(["large", "mid", "small"] as const).map((tier) => {
                            const tierScores = filteredScores.filter((s) => s.tier === tier);
                            if (tierScores.length === 0) return null;

                            const tierLabels = { large: "Large-Cap", mid: "Mid-Cap", small: "Small-Cap" };
                            const tierColors = {
                                large: "var(--accent-violet)",
                                mid: "var(--accent-cyan)",
                                small: "var(--accent-emerald)",
                            };

                            return (
                                <div key={tier} className="mb-6">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ background: tierColors[tier] }}
                                        />
                                        <span
                                            className="text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: tierColors[tier] }}
                                        >
                                            {tierLabels[tier]}
                                        </span>
                                        <span
                                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                            style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                                        >
                                            {tierScores.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <AnimatePresence mode="popLayout">
                                            {tierScores.map((score) => {
                                                const company = companies.find((c) => c.id === score.companyId);
                                                if (!company) return null;
                                                return (
                                                    <CompanyCard
                                                        key={company.id}
                                                        company={company}
                                                        score={score}
                                                        isSelected={company.id === selectedCompanyId}
                                                        onSelect={selectCompany}
                                                    />
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}

                        {/* No Results + Dynamic Add */}
                        {filteredScores.length === 0 && !isLoading && (
                            <div className="text-center py-16">
                                {canAddTicker ? (
                                    <>
                                        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                                            &quot;{searchQuery.toUpperCase()}&quot; is not in the scanned list.
                                        </p>
                                        <button
                                            onClick={handleAddTicker}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                                            style={{
                                                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                                                color: "white",
                                                boxShadow: "var(--shadow-glow-cyan)",
                                            }}
                                        >
                                            <Plus size={16} />
                                            Analyze {searchQuery.toUpperCase()}
                                        </button>
                                        <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>
                                            Fetches data from Yahoo Finance and applies the algorithm
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                            No companies match the current filters.
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                            Try widening the Market Cap or reducing the FCF Yield threshold.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Detail Panel (overlay) */}
            <AnimatePresence>
                {isDetailOpen && selectedCompany && selectedScore && (
                    assetClass === "crypto" ? (
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
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
