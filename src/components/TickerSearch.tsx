// ============================================================
// Ticker Search - Autocomplete search component for Explorer
// ============================================================

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, X } from "lucide-react";
import { searchTickers, searchTickersLive, mergeTickerResults, type TickerEntry } from "@/lib/ticker-registry";
import { useAppStore } from "@/lib/store";
import { useTranslations } from "next-intl";

interface TickerSearchProps {
    assetType: "s" | "c" | "all";
    /** Compact mode: smaller padding, no shadow glow — used in inline bar */
    compact?: boolean;
}

function getMarketIcon(entry: TickerEntry): string {
    if (entry.y === "c") return "₿";
    if (entry.m.includes("IBEX")) return "🇪🇸";
    if (entry.m.includes("Russell")) return "🇺🇸";
    if (entry.m.includes("S&P")) return "🇺🇸";
    return "🌍";
}

function getMarketColor(entry: TickerEntry): string {
    if (entry.y === "c") return "var(--accent-amber)";
    if (entry.m.includes("S&P")) return "var(--accent-cyan)";
    if (entry.m.includes("IBEX")) return "var(--accent-emerald)";
    if (entry.m.includes("Russell")) return "var(--accent-violet)";
    return "var(--text-muted)";
}

export default function TickerSearch({ assetType, compact = false }: TickerSearchProps) {
    const t = useTranslations("tickerSearch");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TickerEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { isLoading, addCompanyByTicker, error } = useAppStore();

    // Search on query change — instant registry results, then merge live Yahoo
    // results (any small-cap) for stock searches.
    useEffect(() => {
        /* eslint-disable react-hooks/set-state-in-effect -- syncing derived search-result UI state from the query */
        if (query.trim().length === 0) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        const local = searchTickers(query, assetType, 10);
        setResults(local);
        setIsOpen(local.length > 0);
        setHighlightIndex(-1);
        /* eslint-enable react-hooks/set-state-in-effect */

        if (assetType === "c") return; // crypto stays registry-only
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            const live = await searchTickersLive(query, controller.signal);
            if (live.length === 0) return;
            setResults(mergeTickerResults(local, live, 10));
            setIsOpen(true);
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, assetType]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = useCallback(
        async (entry: TickerEntry) => {
            setQuery("");
            setIsOpen(false);
            setResults([]);
            // Pass asset type so the store routes crypto → CoinGecko, stocks → Yahoo
            await addCompanyByTicker(entry.t, entry.y);
        },
        [addCompanyByTicker]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === "Enter" && highlightIndex >= 0) {
            e.preventDefault();
            handleSelect(results[highlightIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const placeholderText = assetType === "c"
        ? t("placeholderCrypto")
        : assetType === "s"
            ? t("placeholderStocks")
            : t("placeholderAll");

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* === Search Input === */}
            <div
                className="relative group"
                style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: compact ? 12 : 16,
                    transition: "all 0.3s ease",
                    boxShadow: compact
                        ? "none"
                        : isOpen
                            ? "0 0 30px rgba(34, 211, 238, 0.15), 0 8px 32px rgba(0,0,0,0.3)"
                            : "0 4px 20px rgba(0,0,0,0.2)",
                }}
            >
                <div className={`flex items-center ${compact ? "px-4 py-2.5" : "px-5 py-4"}`}>
                    {isLoading ? (
                        <Loader2
                            size={compact ? 18 : 22}
                            className="animate-spin mr-3 flex-shrink-0"
                            style={{ color: "var(--accent-cyan)" }}
                        />
                    ) : (
                        <Search
                            size={compact ? 18 : 22}
                            className="mr-3 flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                        />
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => results.length > 0 && setIsOpen(true)}
                        placeholder={placeholderText}
                        disabled={isLoading}
                        className={`flex-1 bg-transparent outline-none font-medium ${compact ? "text-sm" : "text-base"}`}
                        style={{
                            color: "var(--text-primary)",
                            caretColor: "var(--accent-cyan)",
                        }}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {query.length > 0 && (
                        <button
                            onClick={() => {
                                setQuery("");
                                setIsOpen(false);
                                inputRef.current?.focus();
                            }}
                            className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={16} style={{ color: "var(--text-muted)" }} />
                        </button>
                    )}
                </div>
            </div>

            {/* === Error display === */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-3 px-4 py-3 rounded-xl text-sm"
                        style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            color: "var(--signal-sell)",
                        }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === Autocomplete Dropdown === */}
            <AnimatePresence>
                {isOpen && results.length > 0 && (
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 overflow-hidden"
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: 14,
                            border: "1px solid var(--border-subtle)",
                            boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(34, 211, 238, 0.08)",
                            transformOrigin: "top",
                        }}
                    >
                        {results.map((entry, i) => (
                            <button
                                key={`${entry.t}-${entry.y}`}
                                onClick={() => handleSelect(entry)}
                                onMouseEnter={() => setHighlightIndex(i)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 cursor-pointer"
                                style={{
                                    background:
                                        highlightIndex === i
                                            ? "rgba(34, 211, 238, 0.08)"
                                            : "transparent",
                                    borderBottom:
                                        i < results.length - 1
                                            ? "1px solid var(--border-subtle)"
                                            : "none",
                                }}
                            >
                                {/* Market Icon */}
                                <span className="text-lg flex-shrink-0 w-7 text-center">
                                    {getMarketIcon(entry)}
                                </span>

                                {/* Ticker + Name */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="font-bold text-sm tracking-wide"
                                            style={{ color: "var(--accent-cyan)" }}
                                        >
                                            {entry.t}
                                        </span>
                                        <span
                                            className="text-xs truncate"
                                            style={{ color: "var(--text-secondary)" }}
                                        >
                                            {entry.n}
                                        </span>
                                    </div>
                                </div>

                                {/* Market Badge */}
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
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
