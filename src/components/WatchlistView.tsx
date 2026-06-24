// ============================================================
// WatchlistView — Home screen showing the user's saved tickers
// ============================================================

"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
    Star, Trash2, RefreshCw, Search, TrendingUp, TrendingDown,
    Building2, Bitcoin, AlertCircle, Loader2, Sparkles, BookmarkX, X,
    Ban, RotateCcw, Activity, ChevronUp, ChevronDown,
} from "lucide-react";
import { reinforcementLevel } from "./ReinforcementBadge";
import type { WatchlistItem } from "@/app/api/watchlist/route";
import type { DiscardItem } from "@/app/api/discards/route";
import type { Company, AlgorithmScore } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { evaluateAll } from "@/lib/algorithm";
import { getDefaultMacroContext } from "@/lib/mock-data";
import { formatMarketCap } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

interface WatchlistRow extends WatchlistItem {
    company?: Company;
    score?: AlgorithmScore;
    loading: boolean;
    error?: string;
}

/** A saved AI analysis, flattened for the badge map + aggregate view. */
interface AiAgg {
    key: string;            // lowercased ticker/id (matches watchlist lookup)
    assetType: "s" | "c";
    ticker: string;
    name: string;
    generatedAt: string;
    qualitativeScore: number;
    narrativeScore?: number;
    narrativeShift?: { from: string; to: string } | null;
    summary: string;
    signalCount: number;    // catalysts (stock) or roadmap items (crypto)
}

type Tab = "watchlist" | "discards" | "ai";

/** Open an asset's full detail in the Explorer (serious mode). */
function useOpenDetail() {
    const router = useRouter();
    const setAppMode = useAppStore((s) => s.setAppMode);
    const setAssetClass = useAppStore((s) => s.setAssetClass);
    const addCompanyByTicker = useAppStore((s) => s.addCompanyByTicker);
    return useCallback((assetType: "s" | "c", ticker: string) => {
        setAppMode("serious");
        setAssetClass(assetType === "c" ? "crypto" : "stocks");
        addCompanyByTicker(ticker, assetType);
        router.push("/explorer");
    }, [router, setAppMode, setAssetClass, addCompanyByTicker]);
}

/** Map a raw cached analysis (stock or crypto) into the flat aggregate shape. */
function toAgg(raw: Record<string, unknown>): AiAgg | null {
    const analysis = raw.analysis as Record<string, unknown> | undefined;
    if (!analysis) return null;
    const isCrypto = typeof raw.id === "string" && raw.ticker === undefined;
    const id = (raw.ticker ?? raw.id) as string | undefined;
    if (!id) return null;
    const cats = (analysis.catalysts ?? analysis.roadmap) as unknown[] | undefined;
    return {
        key: id.toLowerCase(),
        assetType: isCrypto ? "c" : "s",
        ticker: (raw.symbol as string) ?? id,
        name: (raw.name as string) ?? id,
        generatedAt: (raw.generatedAt as string) ?? "",
        qualitativeScore: Number(analysis.qualitativeScore) || 0,
        narrativeScore: analysis.narrativeScore !== undefined ? Number(analysis.narrativeScore) : undefined,
        narrativeShift: (analysis.narrativeShift as { from: string; to: string } | null) ?? null,
        summary: (analysis.summary as string) ?? "",
        signalCount: Array.isArray(cats) ? cats.length : 0,
    };
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

// ── Component ─────────────────────────────────────────────────

export default function WatchlistView() {
    const t = useTranslations("watchlist");

    const [rows, setRows] = useState<WatchlistRow[]>([]);
    const [loadingAll, setLoadingAll] = useState(true);

    // Local filter query — filters your SAVED rows (not a global search).
    // Discovering/analysing a new asset happens in the Explorer; you save it
    // to the watchlist from its detail card.
    const [query, setQuery] = useState("");

    // Filters
    const [typeFilter, setTypeFilter] = useState<"all" | "s" | "c">("all");
    const [sectorFilter, setSectorFilter] = useState<string>("all");

    // Tabs + cross-tab data
    const [tab, setTab] = useState<Tab>("watchlist");
    const [discards, setDiscards] = useState<DiscardItem[]>([]);
    const [aiItems, setAiItems] = useState<AiAgg[]>([]);
    const openDetail = useOpenDetail();

    // Saved AI analyses → badge map keyed by lowercased ticker/id
    const aiByKey = useMemo(() => {
        const map = new Map<string, AiAgg>();
        for (const a of aiItems) map.set(a.key, a);
        return map;
    }, [aiItems]);

    // Load discards + saved analyses once
    useEffect(() => {
        let active = true;
        fetch("/api/discards").then((r) => r.json())
            .then((d: { items?: DiscardItem[] }) => { if (active) setDiscards(d.items ?? []); })
            .catch(() => { });
        Promise.all([
            fetch("/api/ai-analysis").then((r) => r.json()).catch(() => ({ items: [] })),
            fetch("/api/crypto-analysis").then((r) => r.json()).catch(() => ({ items: [] })),
        ]).then(([s, c]: [{ items?: Record<string, unknown>[] }, { items?: Record<string, unknown>[] }]) => {
            if (!active) return;
            const all = [...(s.items ?? []), ...(c.items ?? [])].map(toAgg).filter((x): x is AiAgg => x !== null);
            all.sort((a, b) => (b.generatedAt > a.generatedAt ? 1 : -1));
            setAiItems(all);
        }).catch(() => { });
        return () => { active = false; };
    }, []);

    const restoreDiscard = useCallback(async (ticker: string) => {
        await fetch(`/api/discards?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
        setDiscards((prev) => prev.filter((d) => d.ticker !== ticker));
    }, []);
    const inputRef = useRef<HTMLInputElement>(null);
    const coldFilledRef = useRef(false);

    // ── Load watchlist from disk, hydrating saved score snapshots ──
    const loadWatchlist = useCallback(async () => {
        setLoadingAll(true);
        try {
            const [wData, cData] = await Promise.all([
                fetch("/api/watchlist").then((r) => r.json()),
                fetch("/api/watchlist-cache").then((r) => (r.ok ? r.json() : { items: {} })).catch(() => ({ items: {} })),
            ]);
            const items = (wData.items ?? []) as WatchlistItem[];
            const cache = (cData.items ?? {}) as Record<string, { company: Company; score: AlgorithmScore }>;
            setRows(items.map((item) => {
                const snap = cache[item.ticker.toLowerCase()];
                return {
                    ...item,
                    symbol: item.symbol ?? item.ticker, // back-compat for old entries
                    loading: false,
                    company: snap?.company,             // instant from disk; refresh on demand
                    score: snap?.score,
                };
            }));
        } catch {
            setRows([]);
        } finally {
            setLoadingAll(false);
        }
    }, []);

    // Persist a row's freshly-computed score so next load is instant.
    const saveSnapshot = useCallback((ticker: string, company: Company, score: AlgorithmScore) => {
        fetch("/api/watchlist-cache", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, company, score }),
        }).catch(() => { });
    }, []);

    useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

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
                // Manual refresh → force a fresh Yahoo fetch (bypass the 24h cache).
                const res = await fetch(`/api/company/${encodeURIComponent(ticker)}?refresh=1`);
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
            saveSnapshot(ticker, company, score); // persist → instant next load
        } catch (e) {
            setRows((prev) =>
                prev.map((r) =>
                    r.ticker === ticker
                        ? { ...r, loading: false, error: e instanceof Error ? e.message : "Error" }
                        : r
                )
            );
        }
    }, [saveSnapshot]);

    // ── Refresh all (on demand) ───────────────────────────────
    const refreshAll = useCallback(async () => {
        const snapshot = rows;
        await Promise.allSettled(snapshot.map((r) => refreshRow(r.ticker, r.assetType)));
    }, [rows, refreshRow]);

    // Scores load from the saved snapshot on disk and are NOT recomputed on
    // every visit. Only rows WITHOUT a snapshot (first time / newly added) are
    // computed once and then persisted. Manual refresh is always explicit.
    useEffect(() => {
        if (loadingAll || coldFilledRef.current || rows.length === 0) return;
        coldFilledRef.current = true;
        rows.forEach((r) => { if (!r.score && !r.loading) refreshRow(r.ticker, r.assetType); });
    }, [loadingAll, rows, refreshRow]);

    // ── Remove from watchlist ─────────────────────────────────
    const removeItem = useCallback(async (ticker: string) => {
        fetch(`/api/watchlist-cache?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" }).catch(() => { });
        await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
        setRows((prev) => prev.filter((r) => r.ticker !== ticker));
    }, []);

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

    const visibleRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) => {
            if (typeFilter !== "all" && r.assetType !== typeFilter) return false;
            if (sectorFilter !== "all" && r.company?.sector !== sectorFilter) return false;
            if (q && !(`${r.symbol} ${r.name} ${r.ticker}`.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [rows, typeFilter, sectorFilter, query]);

    // Switch asset type and drop any sector filter that no longer applies.
    const selectType = (tf: "all" | "s" | "c") => { setTypeFilter(tf); setSectorFilter("all"); };

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

                    {tab === "watchlist" && rows.length > 0 && (
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

                {/* Tab bar */}
                <div className="flex items-center gap-2 mb-6">
                    {([
                        ["watchlist", Star, t("tabWatchlist"), rows.length],
                        ["discards", Ban, t("tabDiscards"), discards.length],
                        ["ai", Sparkles, t("tabAi"), aiItems.length],
                    ] as const).map(([id, Icon, label, count]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                            style={{
                                background: tab === id ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                                color: tab === id ? "white" : "var(--text-muted)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <Icon size={14} /> {label}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* Discards tab */}
                {tab === "discards" && (
                    <DiscardsTab discards={discards} onOpen={openDetail} onRestore={restoreDiscard} />
                )}

                {/* AI analyses tab */}
                {tab === "ai" && (
                    <AiAnalysesTab items={aiItems} onOpen={openDetail} />
                )}

                {/* ── Watchlist tab ── */}
                {tab === "watchlist" && (<>

                {/* Local filter — searches only your saved assets */}
                {!loadingAll && rows.length > 0 && (
                    <div className="relative mb-6 z-30">
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
                        >
                            <Search size={18} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t("filterPlaceholder")}
                                className="flex-1 bg-transparent text-sm outline-none"
                                style={{ color: "var(--text-primary)", caretColor: "var(--accent-cyan)" }}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {query.length > 0 && (
                                <button
                                    onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                                    className="p-1 rounded-full transition-colors cursor-pointer"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

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
                            aiDate={aiByKey.get(row.ticker.toLowerCase())?.generatedAt ?? null}
                            aiScore={aiByKey.get(row.ticker.toLowerCase())?.qualitativeScore ?? null}
                            onOpen={() => openDetail(row.assetType, row.ticker)}
                            onRefresh={() => refreshRow(row.ticker, row.assetType)}
                            onRemove={() => removeItem(row.ticker)}
                        />
                    ))}
                </AnimatePresence>

                </>)}
            </div>
        </div>
    );
}

// ── Individual row ────────────────────────────────────────────

function WatchlistRowItem({
    row,
    aiDate,
    aiScore,
    onOpen,
    onRefresh,
    onRemove,
}: {
    row: WatchlistRow;
    aiDate: string | null;
    aiScore: number | null;
    onOpen: () => void;
    onRefresh: () => void;
    onRemove: () => void;
}) {
    const t = useTranslations("watchlist");
    const isCrypto = row.assetType === "c";
    const score = row.score;
    const company = row.company;
    const aiLevel = aiScore !== null ? reinforcementLevel(aiScore) : 0;
    const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={onOpen}
            title={t("openDetail")}
            className="mb-3 p-4 rounded-2xl flex items-center gap-4 group cursor-pointer transition-colors hover:brightness-110"
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
                {aiDate && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(167,139,250,0.12)", color: "var(--accent-violet)" }}
                        title={t("aiSavedOn", { date: new Date(aiDate).toLocaleDateString("es-ES") })}>
                        <Sparkles size={9} /> {t("aiSaved")} · {new Date(aiDate).toLocaleDateString("es-ES")}
                    </span>
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
                        {/* AI reinforcement arrows */}
                        {aiScore !== null && aiLevel !== 0 && (
                            <div className="absolute -top-1 -right-1 flex flex-col items-center -space-y-1.5"
                                title={t("aiSaved")}>
                                {Array.from({ length: Math.abs(aiLevel) }).map((_, i) => (
                                    aiLevel > 0
                                        ? <ChevronUp key={i} size={11} strokeWidth={3.5} style={{ color: "var(--signal-strong-buy)" }} />
                                        : <ChevronDown key={i} size={11} strokeWidth={3.5} style={{ color: "var(--signal-avoid)" }} />
                                ))}
                            </div>
                        )}
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
                    onClick={stop(onRefresh)}
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
                    onClick={stop(onRefresh)}
                    title={t("refresh")}
                    className="p-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                >
                    <RefreshCw size={13} />
                </button>
                <button
                    onClick={stop(onRemove)}
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

// ── Discards tab ──────────────────────────────────────────────

function DiscardsTab({ discards, onOpen, onRestore }: {
    discards: DiscardItem[];
    onOpen: (assetType: "s" | "c", ticker: string) => void;
    onRestore: (ticker: string) => void;
}) {
    const t = useTranslations("watchlist");
    if (discards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <Ban size={28} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("discardsEmpty")}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("discardsEmptySub")}</p>
            </div>
        );
    }
    return (
        <div>
            {discards.map((d) => {
                const isCrypto = d.assetType === "c";
                const date = new Date(d.discardedAt);
                // eslint-disable-next-line react-hooks/purity -- staleness countdown for display only
                const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
                return (
                    <motion.div
                        key={d.ticker}
                        layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => onOpen(d.assetType, d.ticker)}
                        title={t("openDetail")}
                        className="mb-3 p-4 rounded-2xl flex items-center gap-4 group cursor-pointer transition-colors hover:brightness-110"
                        style={{ background: "var(--bg-card)", border: "1px solid rgba(251,113,133,0.18)" }}
                    >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isCrypto ? "rgba(251,191,36,0.1)" : "rgba(34,211,238,0.1)" }}>
                            {isCrypto ? <Bitcoin size={16} style={{ color: "var(--accent-amber)" }} /> : <Building2 size={16} style={{ color: "var(--accent-cyan)" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold font-mono text-sm" style={{ color: "var(--text-primary)" }}>{d.symbol}</span>
                                <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{d.name}</span>
                            </div>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--signal-avoid)" }}>
                                {t("discardedLabel", { date: date.toLocaleDateString("es-ES"), days })}
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRestore(d.ticker); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex-shrink-0"
                            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                        >
                            <RotateCcw size={12} /> {t("restore")}
                        </button>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ── AI analyses tab ───────────────────────────────────────────

function AiAnalysesTab({ items, onOpen }: {
    items: AiAgg[];
    onOpen: (assetType: "s" | "c", ticker: string) => void;
}) {
    const t = useTranslations("watchlist");
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <Sparkles size={28} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("aiEmpty")}</p>
                <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>{t("aiEmptySub")}</p>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((a) => (
                <motion.div
                    key={a.key}
                    layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => onOpen(a.assetType, a.key)}
                    title={t("openDetail")}
                    className="p-4 rounded-2xl cursor-pointer transition-colors hover:brightness-110"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {a.assetType === "c" ? <Bitcoin size={14} style={{ color: "var(--accent-amber)" }} /> : <Building2 size={14} style={{ color: "var(--accent-cyan)" }} />}
                            <span className="font-bold font-mono text-sm" style={{ color: "var(--text-primary)" }}>{a.ticker.toUpperCase()}</span>
                            <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{a.name}</span>
                        </div>
                        <span className="text-lg font-bold font-mono shrink-0" style={{ color: scoreRingColor(a.qualitativeScore) }}>{a.qualitativeScore}</span>
                    </div>
                    {a.narrativeShift && (
                        <div className="flex items-center gap-1.5 mb-2 text-[10px]" style={{ color: "var(--accent-violet)" }}>
                            <Activity size={11} /> {a.narrativeShift.from} → {a.narrativeShift.to}
                            {a.narrativeScore !== undefined && <span style={{ color: "var(--text-muted)" }}>· {a.narrativeScore}/100</span>}
                        </div>
                    )}
                    <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>{a.summary}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span>{t("aiSignals", { n: a.signalCount })}</span>
                        {a.generatedAt && <span>{t("aiGeneratedOn", { date: new Date(a.generatedAt).toLocaleDateString("es-ES") })}</span>}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
