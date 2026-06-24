// ============================================================
// PortfolioConfig — set the simulated portfolio to a % allocation
// ============================================================
// Lets you mirror the positions you actually hold: search assets, assign each
// a % of the portfolio, and apply. Applying RESETS the simulated portfolio to
// starting cash and buys each position at its current price.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Trash2, Loader2, Building2, Bitcoin, AlertCircle, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { searchTickers, searchTickersLive, mergeTickerResults, type TickerEntry } from "@/lib/ticker-registry";
import type { Company } from "@/lib/types";

interface Row { entry: TickerEntry; pct: string }

export default function PortfolioConfig({ startingCash, onClose, onApplied }: { startingCash: number; onClose: () => void; onApplied: () => void }) {
    const t = useTranslations("portfolio");
    const [rows, setRows] = useState<Row[]>([]);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TickerEntry[]>([]);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Search registry (+ live) for assets to add.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (query.trim().length < 1) { setResults([]); return; }
        const local = searchTickers(query, "all", 8);
        setResults(local);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            const live = await searchTickersLive(query, controller.signal);
            if (live.length) setResults(mergeTickerResults(local, live, 10));
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const addRow = (entry: TickerEntry) => {
        if (!rows.some((r) => r.entry.t.toLowerCase() === entry.t.toLowerCase() && r.entry.y === entry.y)) {
            setRows((p) => [...p, { entry, pct: "" }]);
        }
        setQuery(""); setResults([]); inputRef.current?.focus();
    };
    const setPct = (i: number, pct: string) => setRows((p) => p.map((r, j) => (j === i ? { ...r, pct } : r)));
    const removeRow = (i: number) => setRows((p) => p.filter((_, j) => j !== i));

    const totalPct = rows.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);
    const remaining = 100 - totalPct;
    const valid = rows.length > 0 && rows.every((r) => (parseFloat(r.pct) || 0) > 0) && totalPct <= 100.001;

    const apply = async () => {
        setBusy(true); setErrors([]);
        const errs: string[] = [];
        try {
            // 1) Reset the simulated portfolio + equity curve.
            setProgress(t("cfgResetting"));
            await fetch("/api/portfolio", { method: "DELETE" });
            await fetch("/api/portfolio/equity", { method: "DELETE" }).catch(() => { });

            // 2) Buy each position at its current price.
            for (const r of rows) {
                const pct = parseFloat(r.pct) || 0;
                const amount = (pct / 100) * startingCash;
                if (amount <= 0) continue;
                setProgress(t("cfgBuying", { symbol: r.entry.t.toUpperCase() }));
                try {
                    const url = r.entry.y === "c"
                        ? `/api/crypto/${encodeURIComponent(r.entry.t)}`
                        : `/api/company/${encodeURIComponent(r.entry.t)}`;
                    const data = await fetch(url).then((res) => res.json()) as { company?: Company; error?: string };
                    const price = data.company?.metrics.currentPrice;
                    if (!data.company || !price || price <= 0) { errs.push(`${r.entry.t}: ${t("cfgNoPrice")}`); continue; }
                    await fetch("/api/portfolio", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ticker: r.entry.t, symbol: data.company.ticker, name: data.company.name,
                            assetType: r.entry.y, type: "buy", amount, price,
                        }),
                    });
                } catch { errs.push(`${r.entry.t}: ${t("cfgNoPrice")}`); }
            }
            if (errs.length) { setErrors(errs); setBusy(false); setProgress(null); return; }
            onApplied(); onClose();
        } catch {
            setErrors([t("cfgError")]);
            setBusy(false); setProgress(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => !busy && onClose()}>
            <div className="w-full max-w-lg rounded-2xl p-5 max-h-[88vh] overflow-y-auto" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("cfgTitle")}</h3>
                    <button onClick={() => !busy && onClose()} className="p-1 rounded cursor-pointer"><X size={16} style={{ color: "var(--text-muted)" }} /></button>
                </div>
                <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>{t("cfgHint")}</p>

                {/* Search */}
                <div className="relative mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                        <Search size={15} style={{ color: "var(--text-muted)" }} />
                        <input
                            ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
                            placeholder={t("cfgSearch")} className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-primary)" }}
                        />
                    </div>
                    {results.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-56 overflow-y-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                            {results.map((e) => (
                                <button key={`${e.t}-${e.y}`} onClick={() => addRow(e)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors hover:bg-white/5">
                                    {e.y === "c" ? <Bitcoin size={14} style={{ color: "var(--accent-orange, #f59e0b)" }} /> : <Building2 size={14} style={{ color: "var(--accent-cyan)" }} />}
                                    <span className="font-bold text-xs" style={{ color: "var(--accent-cyan)" }}>{e.y === "c" ? e.n : e.t}</span>
                                    <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{e.y === "c" ? e.t : e.n}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rows */}
                <div className="space-y-2 mb-3">
                    {rows.map((r, i) => (
                        <div key={`${r.entry.t}-${r.entry.y}`} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                            {r.entry.y === "c" ? <Bitcoin size={14} className="flex-shrink-0" style={{ color: "var(--accent-orange, #f59e0b)" }} /> : <Building2 size={14} className="flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{r.entry.y === "c" ? r.entry.n : r.entry.t}</p>
                                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{r.entry.y === "c" ? r.entry.t : r.entry.n}</p>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                                <input type="number" min={0} max={100} value={r.pct} onChange={(e) => setPct(i, e.target.value)} placeholder="0"
                                    className="w-12 bg-transparent text-sm font-mono text-right outline-none" style={{ color: "var(--text-primary)" }} />
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>%</span>
                            </div>
                            <button onClick={() => removeRow(i)} className="p-1 rounded cursor-pointer"><Trash2 size={13} style={{ color: "var(--signal-avoid)" }} /></button>
                        </div>
                    ))}
                    {rows.length === 0 && <p className="text-[11px] text-center py-3" style={{ color: "var(--text-muted)" }}>{t("cfgEmpty")}</p>}
                </div>

                {/* Allocation summary */}
                {rows.length > 0 && (
                    <div className="flex items-center justify-between text-[11px] mb-3 px-1">
                        <span style={{ color: totalPct > 100 ? "var(--signal-avoid)" : "var(--text-muted)" }}>{t("cfgAllocated")}: <b className="font-mono">{totalPct.toFixed(1)}%</b></span>
                        <span style={{ color: "var(--text-muted)" }}>{t("cfgCash")}: <b className="font-mono" style={{ color: remaining < 0 ? "var(--signal-avoid)" : "var(--text-secondary)" }}>{remaining.toFixed(1)}%</b></span>
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="mb-3 space-y-1">
                        {errors.map((e, i) => <p key={i} className="text-[11px] flex items-center gap-1" style={{ color: "var(--signal-avoid)" }}><AlertCircle size={11} /> {e}</p>)}
                    </div>
                )}

                <p className="text-[10px] mb-2 flex items-center gap-1" style={{ color: "var(--accent-amber)" }}><AlertCircle size={10} /> {t("cfgWarn")}</p>

                <button onClick={apply} disabled={!valid || busy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
                    style={{ background: "var(--accent-cyan)", color: "var(--bg-primary)" }}>
                    {busy ? <><Loader2 size={15} className="animate-spin" /> {progress ?? t("cfgApplying")}</> : <><Check size={15} /> {t("cfgApply")}</>}
                </button>
            </div>
        </div>
    );
}
