// ============================================================
// ScreenerView — universe screener
// ============================================================
// Pick a universe (market group), scan it with the fundamental algorithm,
// then rank/filter the whole list by score and criteria. Turns "analyze what
// I already know" into "let the algorithm surface candidates".

"use client";

import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAppStore } from "@/lib/store";
import CompanyDetail from "./CompanyDetail";
import { MARKET_GROUPS, type MarketGroupId } from "@/lib/market-groups";
import type { Company, AlgorithmScore } from "@/lib/types";
import {
    Telescope, Loader2, ArrowLeft, ArrowUp, ArrowDown, Filter,
    ShieldCheck, Sparkles, AlertTriangle,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────
function recLabel(rec: AlgorithmScore["recommendation"]) {
    return ({ STRONG_BUY: "Strong Buy", BUY: "Buy", HOLD: "Hold", AVOID: "Avoid" } as const)[rec] ?? rec;
}
function recColor(rec: AlgorithmScore["recommendation"]) {
    return ({
        STRONG_BUY: "var(--signal-strong-buy)", BUY: "var(--signal-buy)",
        HOLD: "var(--signal-hold)", AVOID: "var(--signal-avoid)",
    } as const)[rec] ?? "var(--text-muted)";
}
function scoreColor(s: number) {
    if (s >= 70) return "var(--signal-strong-buy)";
    if (s >= 55) return "var(--signal-buy)";
    if (s >= 40) return "var(--signal-hold)";
    return "var(--signal-avoid)";
}

type SortKey = "total" | "valuation" | "trend" | "timing";
type RecFilter = "all" | "buy" | "strongbuy";

interface Row { company: Company; score: AlgorithmScore }

function SortHeader({ label, k, right, sortKey, sortDir, onSort }: {
    label: string; k: SortKey; right?: boolean;
    sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void;
}) {
    return (
        <button
            onClick={() => onSort(k)}
            className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold cursor-pointer hover:text-zinc-200 transition-colors ${right ? "justify-end w-full" : ""}`}
            style={{ color: sortKey === k ? "var(--accent-cyan)" : "var(--text-muted)" }}
        >
            {label}
            {sortKey === k && (sortDir === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
        </button>
    );
}

export default function ScreenerView() {
    const t = useTranslations("screener");
    const { companies, scores, fetchLiveData, isLoading, error, assetClass, setAssetClass } = useAppStore();

    const [universe, setUniverse] = useState<MarketGroupId | null>(null);
    const [minScore, setMinScore] = useState(0);
    const [recFilter, setRecFilter] = useState<RecFilter>("all");
    const [onlyPassing, setOnlyPassing] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>("total");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [detailId, setDetailId] = useState<string | null>(null);

    // ── Scan a universe ──
    const scan = useCallback(async (id: MarketGroupId) => {
        setUniverse(id);
        setDetailId(null);
        if (assetClass !== "stocks") setAssetClass("stocks");
        await fetchLiveData(id);
    }, [assetClass, setAssetClass, fetchLiveData]);

    // ── Join companies + scores ──
    const rows: Row[] = useMemo(() => {
        return companies
            .map((c) => {
                const score = scores.find((s) => s.companyId === c.id);
                return score ? { company: c, score } : null;
            })
            .filter((r): r is Row => r !== null);
    }, [companies, scores]);

    // ── Filter + sort ──
    const filtered = useMemo(() => {
        const f = rows.filter((r) => {
            if (r.score.totalScore < minScore) return false;
            if (onlyPassing && !r.score.passesHardFilters) return false;
            if (recFilter === "buy" && !["BUY", "STRONG_BUY"].includes(r.score.recommendation)) return false;
            if (recFilter === "strongbuy" && r.score.recommendation !== "STRONG_BUY") return false;
            return true;
        });
        const key = sortKey === "valuation" ? "valuationScore"
            : sortKey === "trend" ? "trendScore"
                : sortKey === "timing" ? "timingScore" : "totalScore";
        f.sort((a, b) => {
            const d = (b.score[key] as number) - (a.score[key] as number);
            return sortDir === "desc" ? d : -d;
        });
        return f;
    }, [rows, minScore, onlyPassing, recFilter, sortKey, sortDir]);

    // ── Summary stats ──
    const stats = useMemo(() => {
        if (rows.length === 0) return null;
        const avg = Math.round(rows.reduce((s, r) => s + r.score.totalScore, 0) / rows.length);
        const opps = rows.filter((r) => ["BUY", "STRONG_BUY"].includes(r.score.recommendation)).length;
        return { avg, opps };
    }, [rows]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else { setSortKey(key); setSortDir("desc"); }
    };

    // ── Detail view ──
    const detail = detailId ? rows.find((r) => r.company.id === detailId) : null;
    if (detail) {
        return (
            <div className="min-h-screen">
                <div className="px-6 pt-4">
                    <button
                        onClick={() => setDetailId(null)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                        style={{ color: "var(--accent-cyan)" }}
                    >
                        <ArrowLeft size={14} /> {t("back")}
                    </button>
                </div>
                <CompanyDetail company={detail.company} score={detail.score} onClose={() => setDetailId(null)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))" }}>
                    <Telescope size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
                </div>
            </div>

            {/* Universe picker */}
            <div className="mb-5">
                <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>{t("universe")}</p>
                <div className="flex flex-wrap gap-2">
                    {Object.values(MARKET_GROUPS).map((g) => {
                        const active = universe === g.id;
                        return (
                            <button
                                key={g.id}
                                onClick={() => scan(g.id as MarketGroupId)}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                                style={{
                                    background: active ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                                    color: active ? "white" : "var(--text-secondary)",
                                    border: `1px solid ${active ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                                }}
                                title={g.description}
                            >
                                <span>{g.flag}</span>{g.label}
                                <span className="opacity-60">· {g.tickers.length}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("scanning")}</p>
                    <p className="text-[10px] max-w-sm text-center" style={{ color: "var(--text-muted)" }}>{t("firstScanNote")}</p>
                </div>
            )}

            {error && !isLoading && (
                <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4"
                    style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.2)", color: "var(--signal-avoid)" }}>
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && rows.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                    <Telescope size={32} style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("emptyTitle")}</p>
                    <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>{t("emptyDesc")}</p>
                </div>
            )}

            {/* Results */}
            {!isLoading && rows.length > 0 && (
                <>
                    {/* Stats + filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                            <span>{t("count", { shown: filtered.length, total: rows.length })}</span>
                            {stats && <span>· {t("avgScore")} <strong style={{ color: scoreColor(stats.avg) }}>{stats.avg}</strong></span>}
                            {stats && <span>· {t("opportunities")} <strong style={{ color: "var(--signal-buy)" }}>{stats.opps}</strong></span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Filter size={13} style={{ color: "var(--text-muted)" }} />
                            {/* Recommendation filter */}
                            {(["all", "buy", "strongbuy"] as RecFilter[]).map((r) => (
                                <button key={r} onClick={() => setRecFilter(r)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                                    style={{
                                        background: recFilter === r ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                                        color: recFilter === r ? "white" : "var(--text-muted)",
                                        border: "1px solid var(--border-subtle)",
                                    }}>
                                    {r === "all" ? t("recAll") : r === "buy" ? t("recBuyPlus") : t("recStrong")}
                                </button>
                            ))}
                            {/* Only passing hard filters */}
                            <button onClick={() => setOnlyPassing((v) => !v)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                                style={{
                                    background: onlyPassing ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                                    color: onlyPassing ? "white" : "var(--text-muted)",
                                    border: "1px solid var(--border-subtle)",
                                }}>
                                <ShieldCheck size={12} /> {t("onlyPassing")}
                            </button>
                            {/* Min score */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("minScore")}</span>
                                <input type="range" min={0} max={80} step={5} value={minScore}
                                    onChange={(e) => setMinScore(Number(e.target.value))}
                                    className="w-24 accent-cyan-400" style={{ accentColor: "var(--accent-cyan)" }} />
                                <span className="text-[11px] font-mono font-bold w-5" style={{ color: "var(--accent-cyan)" }}>{minScore}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                        {/* Head */}
                        <div className="grid items-center gap-2 px-4 py-2.5"
                            style={{ gridTemplateColumns: "minmax(160px,2fr) 80px 70px 70px 70px 90px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                            <SortHeader label={t("colCompany")} k="total" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                            <div className="flex justify-end"><SortHeader label={t("colScore")} k="total" right sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></div>
                            <div className="flex justify-end"><SortHeader label={t("colVal")} k="valuation" right sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></div>
                            <div className="flex justify-end"><SortHeader label={t("colQual")} k="trend" right sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></div>
                            <div className="flex justify-end"><SortHeader label={t("colTiming")} k="timing" right sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-right" style={{ color: "var(--text-muted)" }}>{t("colRec")}</span>
                        </div>
                        {/* Rows */}
                        <AnimatePresence>
                            {filtered.map((r, i) => (
                                <motion.button
                                    key={r.company.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    transition={{ delay: Math.min(i * 0.01, 0.3) }}
                                    onClick={() => setDetailId(r.company.id)}
                                    className="grid items-center gap-2 px-4 py-3 w-full text-left cursor-pointer transition-colors hover:bg-white/[0.03]"
                                    style={{ gridTemplateColumns: "minmax(160px,2fr) 80px 70px 70px 70px 90px", borderBottom: "1px solid var(--border-subtle)" }}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold font-mono text-sm" style={{ color: "var(--accent-cyan)" }}>{r.company.ticker}</span>
                                            <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{r.company.name}</span>
                                        </div>
                                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.company.sector}</span>
                                    </div>
                                    <span className="text-right text-lg font-bold font-mono" style={{ color: scoreColor(r.score.totalScore) }}>{r.score.totalScore}</span>
                                    <span className="text-right text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{r.score.valuationScore}</span>
                                    <span className="text-right text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{r.score.trendScore}</span>
                                    <span className="text-right text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{r.score.timingScore}</span>
                                    <span className="text-right">
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                            style={{ background: `${recColor(r.score.recommendation)}18`, color: recColor(r.score.recommendation) }}>
                                            {recLabel(r.score.recommendation)}
                                        </span>
                                    </span>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                        {filtered.length === 0 && (
                            <div className="flex items-center justify-center gap-2 py-10 text-xs" style={{ color: "var(--text-muted)" }}>
                                <Sparkles size={14} /> {t("noResults")}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
