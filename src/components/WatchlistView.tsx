// ============================================================
// WatchlistView — Home screen showing the user's saved tickers
// ============================================================

"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    Star, Trash2, RefreshCw, Search, TrendingUp, TrendingDown,
    Building2, Bitcoin, AlertCircle, Loader2, Sparkles, BookmarkX, X,
} from "lucide-react";
import type { WatchlistItem } from "@/app/api/watchlist/route";
import type { Company, AlgorithmScore } from "@/lib/types";
import { evaluateAll } from "@/lib/algorithm";
import { getDefaultMacroContext } from "@/lib/mock-data";
import { formatMarketCap } from "@/lib/utils";
import { searchTickers, searchTickersLive, mergeTickerResults, type TickerEntry } from "@/lib/ticker-registry";

// ── Types ─────────────────────────────────────────────────────

interface WatchlistRow extends WatchlistItem {
    company?: Company;
    score?: AlgorithmScore;
    loading: boolean;
    error?: string;
}

// ── Helpers ───────────────────────────────────────────────────

function recLabel(rec: AlgorithmScore["recommendation"]) {
    const map = { STRONG_BUY: "Strong Buy", BUY: "Buy", HOLD: "Hold", AVOID: "Avoid" };
    return map[rec] ?? rec;
}

function recColor(rec: AlgorithmScore["recommendation"]) {
    const map = {
        STRONG_BUY: "var(--signal-strong-buy)",
        BUY: "var(--signal-buy)",
        HOLD: "var(--signal-hold)",
        AVOID: "var(--signal-avoid)",
    };
    return map[rec] ?? "var(--text-muted)";
}

function scoreRingColor(score: number) {
    if (score >= 70) return "var(--signal-strong-buy)";
    if (score >= 55) return "var(--signal-buy)";
    if (score >= 40) return "var(--signal-hold)";
    return "var(--signal-avoid)";
}

function getMarketIcon(entry: TickerEntry): string {
    if (entry.y === "c") return "₿";
    if (entry.m.includes("IBEX")) return "🇪🇸";
    if (entry.m.includes("Russell") || entry.m.includes("S&P")) return "🇺🇸";
    return "🌍";
}

function getMarketColor(entry: TickerEntry): string {
    if (entry.y === "c") return "var(--accent-amber)";
    if (entry.m.includes("S&P")) return "var(--accent-cyan)";
    if (entry.m.includes("IBEX")) return "var(--accent-emerald)";
    if (entry.m.includes("Russell")) return "var(--accent-violet)";
    return "var(--text-muted)";
}

// ── Component ─────────────────────────────────────────────────

export default function WatchlistView() {
    const t = useTranslations("watchlist");

    const [rows, setRows] = useState<WatchlistRow[]>([]);
    const [loadingAll, setLoadingAll] = useState(true);

    // Autocomplete state
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TickerEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [addError, setAddError] = useState<string | null>(null);
    const [addingKey, setAddingKey] = useState<string | null>(null);

    // Filters
    const [typeFilter, setTypeFilter] = useState<"all" | "s" | "c">("all");
    const [sectorFilter, setSectorFilter] = useState<string>("all");
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const autoAnalyzedRef = useRef(false);

    // ── Load watchlist from disk ───────────────────────────────
    const loadWatchlist = useCallback(async () => {
        setLoadingAll(true);
        try {
            const res = await fetch("/api/watchlist");
            const data = await res.json() as { items: WatchlistItem[] };
            setRows(data.items.map((item) => ({
                ...item,
                symbol: item.symbol ?? item.ticker, // back-compat for old entries
                loading: false,
            })));
        } catch {
            setRows([]);
        } finally {
            setLoadingAll(false);
        }
    }, []);

    useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

    // ── Search registry on query change ────────────────────────
    useEffect(() => {
        if (query.trim().length === 0) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        const local = searchTickers(query, "all", 8);
        setResults(local);
        setIsOpen(local.length > 0);
        setHighlightIndex(-1);

        // Merge live Yahoo results so any small-cap is addable.
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            const live = await searchTickersLive(query, controller.signal);
            if (live.length === 0) return;
            setResults(mergeTickerResults(local, live, 10));
            setIsOpen(true);
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query]);

    // ── Close dropdown on outside click ────────────────────────
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    // ── Refresh live data for a single row ────────────────────
    const refreshRow = useCallback(async (ticker: string, assetType: "s" | "c") => {
        setRows((prev) =>
            prev.map((r) => r.ticker === ticker ? { ...r, loading: true, error: undefined } : r)
        );

        try {
            let company: Company;
            let score: AlgorithmScore;
            if (assetType === "c") {
                // Crypto → dedicated fundamentals engine (tokenomics, on-chain…)
                const res = await fetch(`/api/crypto/${encodeURIComponent(ticker)}`);
                if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed to fetch"); }
                const data = await res.json() as { company: Company; score: AlgorithmScore };
                company = data.company;
                score = data.score;
            } else {
                const res = await fetch(`/api/company/${encodeURIComponent(ticker)}`);
                if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed to fetch"); }
                const data = await res.json() as { company: Company };
                company = data.company;
                score = evaluateAll([company], getDefaultMacroContext(), 5_000_000)[0];
            }

            setRows((prev) =>
                prev.map((r) =>
                    r.ticker === ticker ? { ...r, company, score, loading: false } : r
                )
            );
        } catch (e) {
            setRows((prev) =>
                prev.map((r) =>
                    r.ticker === ticker
                        ? { ...r, loading: false, error: e instanceof Error ? e.message : "Error" }
                        : r
                )
            );
        }
    }, []);

    // ── Refresh all ───────────────────────────────────────────
    const refreshAll = useCallback(async () => {
        const snapshot = rows;
        await Promise.allSettled(snapshot.map((r) => refreshRow(r.ticker, r.assetType)));
    }, [rows, refreshRow]);

    // ── Auto-analyze rows once after first load ───────────────
    useEffect(() => {
        if (loadingAll || autoAnalyzedRef.current || rows.length === 0) return;
        autoAnalyzedRef.current = true;
        rows.forEach((r) => { if (!r.score && !r.loading) refreshRow(r.ticker, r.assetType); });
    }, [loadingAll, rows, refreshRow]);

    // ── Remove from watchlist ─────────────────────────────────
    const removeItem = useCallback(async (ticker: string) => {
        await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
        setRows((prev) => prev.filter((r) => r.ticker !== ticker));
    }, []);

    // ── Add a registry entry to the watchlist ─────────────────
    const addEntry = useCallback(async (entry: TickerEntry) => {
        const lookupKey = entry.t;       // CoinGecko ID for crypto, symbol for stocks
        const assetType = entry.y;
        setAddError(null);
        setQuery("");
        setIsOpen(false);
        setResults([]);

        // Already present?
        if (rows.some((r) => r.ticker.toLowerCase() === lookupKey.toLowerCase())) {
            setAddError(t("alreadyAdded", { symbol: entry.t.toUpperCase() }));
            return;
        }

        setAddingKey(lookupKey);
        try {
            let company: Company;
            let score: AlgorithmScore;
            if (assetType === "c") {
                const res = await fetch(`/api/crypto/${encodeURIComponent(lookupKey)}`);
                if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? `"${entry.n}" no encontrado`); }
                const data = await res.json() as { company: Company; score: AlgorithmScore };
                company = data.company;
                score = data.score;
            } else {
                const res = await fetch(`/api/company/${encodeURIComponent(lookupKey)}`);
                if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? `"${entry.n}" no encontrado`); }
                const data = await res.json() as { company: Company };
                company = data.company;
                score = evaluateAll([company], getDefaultMacroContext(), 5_000_000)[0];
            }

            const symbol = company.ticker; // "HBAR" / "AAPL"
            const newItem: WatchlistItem = {
                ticker: lookupKey,
                symbol,
                name: entry.n,
                assetType,
                addedAt: new Date().toISOString(),
                note: "",
            };

            const saveRes = await fetch("/api/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newItem),
            });
            if (!saveRes.ok && saveRes.status !== 409) {
                const err = await saveRes.json();
                throw new Error(err.error ?? "Error guardando");
            }

            setRows((prev) => [{ ...newItem, company, score, loading: false }, ...prev]);
            inputRef.current?.focus();
        } catch (e) {
            setAddError(e instanceof Error ? e.message : "Error desconocido");
        } finally {
            setAddingKey(null);
        }
    }, [rows, t]);

    // ── Filters: available sectors + visible rows ──────────────
    const sectors = useMemo(() => {
        const set = new Set<string>();
        for (const r of rows) {
            if ((typeFilter === "all" || r.assetType === typeFilter) && r.company?.sector) {
                set.add(r.company.sector);
            }
        }
        return Array.from(set).sort();
    }, [rows, typeFilter]);

    const visibleRows = useMemo(() => rows.filter((r) => {
        if (typeFilter !== "all" && r.assetType !== typeFilter) return false;
        if (sectorFilter !== "all" && r.company?.sector !== sectorFilter) return false;
        return true;
    }), [rows, typeFilter, sectorFilter]);

    // Switch asset type and drop any sector filter that no longer applies.
    const selectType = (tf: "all" | "s" | "c") => { setTypeFilter(tf); setSectorFilter("all"); };

    // ── Keyboard navigation ───────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((p) => (p < results.length - 1 ? p + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((p) => (p > 0 ? p - 1 : results.length - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const target = highlightIndex >= 0 ? results[highlightIndex] : results[0];
            if (target) addEntry(target);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    // ── Render ────────────────────────────────────────────────

    return (
        <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
            <div className="max-w-5xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, var(--accent-amber), var(--accent-violet))",
                                boxShadow: "0 0 20px rgba(251,191,36,0.2)",
                            }}
                        >
                            <Star size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                                {t("title")}
                            </h1>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                {t("subtitle")}
                            </p>
                        </div>
                    </div>

                    {rows.length > 0 && (
                        <button
                            onClick={refreshAll}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                            style={{
                                background: "var(--bg-tertiary)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            <RefreshCw size={14} />
                            {t("refreshAll")}
                        </button>
                    )}
                </div>

                {/* Add ticker — autocomplete search */}
                <div className="relative mb-8 z-30">
                    <div
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{
                            background: "var(--bg-secondary)",
                            border: isOpen
                                ? "1px solid var(--border-active)"
                                : "1px solid var(--border-subtle)",
                            boxShadow: isOpen ? "0 0 30px rgba(34,211,238,0.12)" : "none",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <Search size={18} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setAddError(null); }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => results.length > 0 && setIsOpen(true)}
                            placeholder={t("addPlaceholder")}
                            className="flex-1 bg-transparent text-sm outline-none"
                            style={{ color: "var(--text-primary)", caretColor: "var(--accent-cyan)" }}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {query.length > 0 && (
                            <button
                                onClick={() => { setQuery(""); setIsOpen(false); inputRef.current?.focus(); }}
                                className="p-1 rounded-full transition-colors cursor-pointer"
                                style={{ color: "var(--text-muted)" }}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {addError && (
                        <p className="text-xs mt-2 ml-1 flex items-center gap-1" style={{ color: "var(--signal-avoid)" }}>
                            <AlertCircle size={11} /> {addError}
                        </p>
                    )}

                    {/* Autocomplete dropdown */}
                    <AnimatePresence>
                        {isOpen && results.length > 0 && (
                            <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
                                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
                                transition={{ duration: 0.14 }}
                                className="absolute z-50 w-full mt-2 overflow-hidden"
                                style={{
                                    background: "var(--bg-card)",
                                    borderRadius: 14,
                                    border: "1px solid var(--border-subtle)",
                                    boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(34,211,238,0.08)",
                                    transformOrigin: "top",
                                }}
                            >
                                {results.map((entry, i) => {
                                    const isAdding = addingKey === entry.t;
                                    return (
                                        <button
                                            key={`${entry.t}-${entry.y}`}
                                            onClick={() => addEntry(entry)}
                                            onMouseEnter={() => setHighlightIndex(i)}
                                            disabled={isAdding}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 cursor-pointer"
                                            style={{
                                                background: highlightIndex === i ? "rgba(34,211,238,0.08)" : "transparent",
                                                borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none",
                                            }}
                                        >
                                            <span className="text-lg flex-shrink-0 w-7 text-center">
                                                {getMarketIcon(entry)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm tracking-wide" style={{ color: "var(--accent-cyan)" }}>
                                                        {entry.y === "c" ? entry.n : entry.t}
                                                    </span>
                                                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                                                        {entry.y === "c" ? entry.t : entry.n}
                                                    </span>
                                                </div>
                                            </div>
                                            {isAdding ? (
                                                <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />
                                            ) : (
                                                <span
                                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider"
                                                    style={{
                                                        background: `${getMarketColor(entry)}20`,
                                                        color: getMarketColor(entry),
                                                        border: `1px solid ${getMarketColor(entry)}30`,
                                                    }}
                                                >
                                                    {entry.m}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Filters: asset type + sector */}
                {!loadingAll && rows.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        {([["all", t("filterAll")], ["s", t("filterStocks")], ["c", t("filterCrypto")]] as const).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => selectType(val)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                                style={{
                                    background: typeFilter === val ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                                    color: typeFilter === val ? "white" : "var(--text-muted)",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                {label}
                            </button>
                        ))}

                        {sectors.length > 0 && (
                            <>
                                <span className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />
                                <button
                                    onClick={() => setSectorFilter("all")}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                                    style={{
                                        background: sectorFilter === "all" ? "var(--accent-violet-dim)" : "var(--bg-tertiary)",
                                        color: sectorFilter === "all" ? "white" : "var(--text-muted)",
                                        border: "1px solid var(--border-subtle)",
                                    }}
                                >
                                    {t("filterAllSectors")}
                                </button>
                                {sectors.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSectorFilter(s)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                                        style={{
                                            background: sectorFilter === s ? "var(--accent-violet-dim)" : "var(--bg-tertiary)",
                                            color: sectorFilter === s ? "white" : "var(--text-muted)",
                                            border: "1px solid var(--border-subtle)",
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* Loading state */}
                {loadingAll && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                    </div>
                )}

                {/* Empty state */}
                {!loadingAll && rows.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24 gap-4"
                    >
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: "var(--bg-tertiary)" }}
                        >
                            <BookmarkX size={28} style={{ color: "var(--text-muted)" }} />
                        </div>
                        <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
                            {t("emptyTitle")}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {t("emptySubtitle")}
                        </p>
                    </motion.div>
                )}

                {/* No rows match the active filter */}
                {!loadingAll && rows.length > 0 && visibleRows.length === 0 && (
                    <p className="text-center text-xs py-10" style={{ color: "var(--text-muted)" }}>{t("noFilterMatch")}</p>
                )}

                {/* Watchlist rows */}
                <AnimatePresence>
                    {visibleRows.map((row) => (
                        <WatchlistRowItem
                            key={row.ticker}
                            row={row}
                            onRefresh={() => refreshRow(row.ticker, row.assetType)}
                            onRemove={() => removeItem(row.ticker)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Individual row ────────────────────────────────────────────

function WatchlistRowItem({
    row,
    onRefresh,
    onRemove,
}: {
    row: WatchlistRow;
    onRefresh: () => void;
    onRemove: () => void;
}) {
    const t = useTranslations("watchlist");
    const isCrypto = row.assetType === "c";
    const score = row.score;
    const company = row.company;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="mb-3 p-4 rounded-2xl flex items-center gap-4 group"
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
            }}
        >
            {/* Asset type icon */}
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isCrypto ? "rgba(251,191,36,0.1)" : "rgba(34,211,238,0.1)" }}
            >
                {isCrypto
                    ? <Bitcoin size={16} style={{ color: "var(--accent-amber)" }} />
                    : <Building2 size={16} style={{ color: "var(--accent-cyan)" }} />
                }
            </div>

            {/* Ticker & Name */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className="font-bold font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                        {row.symbol}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {row.name}
                    </span>
                </div>
                {company && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {company.sector} · {formatMarketCap(company.metrics.marketCap)}
                    </p>
                )}
            </div>

            {/* Score & recommendation */}
            {row.loading && (
                <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />
            )}

            {!row.loading && score && (
                <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Score ring (mini) */}
                    <div className="relative flex items-center justify-center">
                        <svg width="44" height="44" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                            <circle
                                cx="22" cy="22" r="18"
                                fill="none"
                                stroke={scoreRingColor(score.totalScore)}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${(score.totalScore / 100) * 113} 113`}
                                transform="rotate(-90 22 22)"
                                style={{ filter: `drop-shadow(0 0 4px ${scoreRingColor(score.totalScore)})` }}
                            />
                        </svg>
                        <span
                            className="absolute text-[11px] font-bold"
                            style={{ color: scoreRingColor(score.totalScore) }}
                        >
                            {Math.round(score.totalScore)}
                        </span>
                    </div>

                    {/* Recommendation badge */}
                    <span
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                        style={{
                            background: `${recColor(score.recommendation)}18`,
                            color: recColor(score.recommendation),
                            border: `1px solid ${recColor(score.recommendation)}33`,
                        }}
                    >
                        {recLabel(score.recommendation)}
                    </span>

                    {/* Price & 1M return */}
                    {company && (
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                                ${company.metrics.currentPrice.toFixed(2)}
                            </p>
                            <p
                                className="text-xs flex items-center justify-end gap-0.5"
                                style={{
                                    color: company.metrics.oneMonthReturn >= 0
                                        ? "var(--signal-strong-buy)"
                                        : "var(--signal-avoid)",
                                }}
                            >
                                {company.metrics.oneMonthReturn >= 0
                                    ? <TrendingUp size={10} />
                                    : <TrendingDown size={10} />
                                }
                                {(company.metrics.oneMonthReturn * 100).toFixed(1)}% {t("oneMonth")}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!row.loading && row.error && (
                <p className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: "var(--signal-avoid)" }}>
                    <AlertCircle size={12} /> {row.error}
                </p>
            )}

            {!row.loading && !score && !row.error && (
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--accent-cyan)",
                        border: "1px solid var(--border-subtle)",
                    }}
                >
                    <Sparkles size={11} />
                    {t("analyze")}
                </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onRefresh}
                    title={t("refresh")}
                    className="p-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                >
                    <RefreshCw size={13} />
                </button>
                <button
                    onClick={onRemove}
                    title={t("remove")}
                    className="p-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ color: "var(--signal-avoid)" }}
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </motion.div>
    );
}
