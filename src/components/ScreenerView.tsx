// ============================================================
// ScreenerView - On-demand single ticker analysis
// ============================================================

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import CompanyDetail from "./CompanyDetail";
import { evaluateCompany } from "@/lib/algorithm";
import type { Company, AlgorithmScore } from "@/lib/types";
import { getDefaultMacroContext } from "@/lib/mock-data";
import {
    Telescope,
    Search,
    Loader2,
    TrendingUp,
    AlertTriangle,
    Clock,
    Trash2,
} from "lucide-react";

interface ScreenerResult {
    company: Company;
    score: AlgorithmScore;
    analyzedAt: Date;
}

export default function ScreenerView() {
    const { apiCallCount, error: globalError } = useAppStore();
    const [ticker, setTicker] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<ScreenerResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<ScreenerResult | null>(null);

    const handleAnalyze = useCallback(async () => {
        const clean = ticker.toUpperCase().trim();
        if (!clean) return;

        // Check if already analyzed
        const existing = results.find((r) => r.company.ticker === clean);
        if (existing) {
            setSelectedResult(existing);
            setTicker("");
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const res = await fetch(`/api/company/${clean}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || `Ticker "${clean}" not found`);
            }

            const data = await res.json();
            const company: Company = data.company;
            const macro = getDefaultMacroContext();
            const score = evaluateCompany(company, macro, 5_000_000);

            const result: ScreenerResult = {
                company,
                score,
                analyzedAt: new Date(),
            };

            setResults((prev) => [result, ...prev]);
            setSelectedResult(result);
            setTicker("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    }, [ticker, results]);

    const removeResult = (tickerToRemove: string) => {
        setResults((prev) => prev.filter((r) => r.company.ticker !== tickerToRemove));
        if (selectedResult?.company.ticker === tickerToRemove) {
            setSelectedResult(null);
        }
    };

    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case "STRONG_BUY": return "var(--signal-strong-buy)";
            case "BUY": return "var(--signal-buy)";
            case "HOLD": return "var(--signal-hold)";
            default: return "var(--signal-avoid)";
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ marginLeft: 72 }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
                        boxShadow: "var(--shadow-glow-violet)",
                    }}
                >
                    <Telescope size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        Ticker Screener
                    </h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Enter any ticker to run the full algorithmic analysis
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mb-8">
                <div
                    className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                    }}
                >
                    <Search size={20} style={{ color: "var(--text-muted)" }} />
                    <input
                        type="text"
                        placeholder="Enter ticker (e.g. AAPL, TSLA, GOOGL)..."
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && !isAnalyzing && handleAnalyze()}
                        className="bg-transparent outline-none text-base flex-1 font-mono"
                        style={{ color: "var(--text-primary)" }}
                        disabled={isAnalyzing}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !ticker.trim()}
                        className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        style={{
                            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                            color: "white",
                            boxShadow: !isAnalyzing && ticker.trim() ? "var(--shadow-glow-cyan)" : "none",
                        }}
                    >
                        {isAnalyzing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            "Analyze"
                        )}
                    </button>
                </div>

                {/* Error */}
                {(error || globalError) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mt-3 px-4 py-2 rounded-lg"
                        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                    >
                        <AlertTriangle size={14} style={{ color: "var(--signal-avoid)" }} />
                        <span className="text-xs" style={{ color: "var(--signal-avoid)" }}>
                            {error || globalError}
                        </span>
                    </motion.div>
                )}

                {/* Usage */}
                <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <span>Each analysis uses ~2 Yahoo Finance calls (free)</span>
                    <span>•</span>
                    <span>API calls this session: {apiCallCount}</span>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
                <AnimatePresence mode="popLayout">
                    {results.map((result) => (
                        <motion.div
                            key={result.company.ticker}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                            style={{
                                border: selectedResult?.company.ticker === result.company.ticker
                                    ? "1px solid var(--accent-cyan)"
                                    : "1px solid var(--border-subtle)",
                            }}
                            onClick={() => setSelectedResult(result)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {/* Score Circle */}
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold font-mono shrink-0"
                                        style={{
                                            background: `conic-gradient(${getRecommendationColor(result.score.recommendation)} ${result.score.totalScore}%, transparent ${result.score.totalScore}%)`,
                                            boxShadow: `0 0 12px ${getRecommendationColor(result.score.recommendation)}33`,
                                        }}
                                    >
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center"
                                            style={{ background: "var(--bg-primary)" }}
                                        >
                                            <span style={{ color: getRecommendationColor(result.score.recommendation) }}>
                                                {result.score.totalScore}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm" style={{ color: "var(--accent-cyan)" }}>
                                                {result.company.ticker}
                                            </span>
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{
                                                    color: "white",
                                                    background: getRecommendationColor(result.score.recommendation),
                                                }}
                                            >
                                                {result.score.recommendation.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="text-xs truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>
                                            {result.company.name}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); removeResult(result.company.ticker); }}
                                    className="p-1 rounded hover:bg-white/5 transition-colors"
                                >
                                    <Trash2 size={12} style={{ color: "var(--text-muted)" }} />
                                </button>
                            </div>

                            {/* Mini Metrics */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: "MCap", value: result.company.metrics.marketCap >= 1000 ? `$${(result.company.metrics.marketCap / 1000).toFixed(0)}B` : `$${result.company.metrics.marketCap.toFixed(0)}M` },
                                    { label: "FCF Yield", value: `${(result.company.metrics.fcfYield * 100).toFixed(1)}%` },
                                    { label: "B/M", value: result.company.metrics.bookToMarket.toFixed(2) },
                                ].map((m) => (
                                    <div key={m.label} className="text-center py-1 rounded" style={{ background: "var(--bg-tertiary)" }}>
                                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</div>
                                        <div className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Analyzed time */}
                            <div className="flex items-center gap-1 mt-2">
                                <Clock size={10} style={{ color: "var(--text-muted)" }} />
                                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {result.analyzedAt.toLocaleTimeString()}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {results.length === 0 && (
                <div className="text-center py-20 max-w-md mx-auto">
                    <TrendingUp size={48} style={{ color: "var(--border-subtle)" }} className="mx-auto mb-4" />
                    <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                        No tickers analyzed yet
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Type a ticker symbol above and press Analyze to run the full algorithmic scoring.
                        Try AAPL, TSLA, NVDA, or any US stock.
                    </p>
                </div>
            )}

            {/* Detail Panel */}
            <AnimatePresence>
                {selectedResult && (
                    <CompanyDetail
                        company={selectedResult.company}
                        score={selectedResult.score}
                        onClose={() => setSelectedResult(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
