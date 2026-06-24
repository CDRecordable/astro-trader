// ============================================================
// PortfolioView — simulated paper-trading portfolio
// ============================================================
// Shows total value, cash, P&L, open positions (with live unrealized P&L) and
// the transaction history. Holdings are priced live (server-cached) on load.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    Wallet, TrendingUp, TrendingDown, RotateCcw, Building2, Bitcoin,
    Loader2, ArrowUpRight, ArrowDownRight, Coins,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Company } from "@/lib/types";
import type { Portfolio, Holding } from "@/app/api/portfolio/route";

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

interface Position extends Holding {
    price: number;       // current price (0 = unknown)
    marketValue: number;
    costBasis: number;
    pnl: number;
    pnlPct: number;
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function PortfolioView() {
    const t = useTranslations("portfolio");
    const openDetail = useOpenDetail();
    const [pf, setPf] = useState<Portfolio | null>(null);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [confirmReset, setConfirmReset] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p = await fetch("/api/portfolio").then((r) => r.json()) as Portfolio;
            setPf(p);
            // Price each holding live (server-cached → fast).
            const entries = Object.values(p.holdings ?? {});
            const priced = await Promise.all(entries.map(async (h) => {
                try {
                    const url = h.assetType === "c"
                        ? `/api/crypto/${encodeURIComponent(h.ticker)}`
                        : `/api/company/${encodeURIComponent(h.ticker)}`;
                    const data = await fetch(url).then((r) => r.json()) as { company?: Company };
                    return [h.ticker.toLowerCase(), data.company?.metrics.currentPrice ?? 0] as const;
                } catch { return [h.ticker.toLowerCase(), 0] as const; }
            }));
            setPrices(Object.fromEntries(priced));
        } catch { setPf(null); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const reset = async () => {
        await fetch("/api/portfolio", { method: "DELETE" }).catch(() => { });
        setConfirmReset(false);
        load();
    };

    const positions: Position[] = useMemo(() => {
        if (!pf) return [];
        return Object.values(pf.holdings).map((h) => {
            const price = prices[h.ticker.toLowerCase()] ?? 0;
            const marketValue = price * h.qty;
            const costBasis = h.avgCost * h.qty;
            const pnl = marketValue - costBasis;
            const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
            return { ...h, price, marketValue, costBasis, pnl, pnlPct };
        }).sort((a, b) => b.marketValue - a.marketValue);
    }, [pf, prices]);

    const totals = useMemo(() => {
        const invested = positions.reduce((s, p) => s + p.marketValue, 0);
        const cash = pf?.cash ?? 0;
        const start = pf?.startingCash ?? 10000;
        const totalValue = cash + invested;
        const totalReturn = totalValue - start;
        const totalReturnPct = start > 0 ? (totalReturn / start) * 100 : 0;
        const unrealized = positions.reduce((s, p) => s + p.pnl, 0);
        return { invested, cash, start, totalValue, totalReturn, totalReturnPct, unrealized };
    }, [positions, pf]);

    const pnlColor = (n: number) => (n > 0 ? "var(--signal-strong-buy)" : n < 0 ? "var(--signal-avoid)" : "var(--text-muted)");

    if (loading && !pf) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--accent-cyan)" }} /></div>;
    }

    const isEmpty = positions.length === 0 && (pf?.transactions.length ?? 0) === 0;

    return (
        <div className="max-w-5xl mx-auto px-5 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))" }}>
                        <Wallet size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
                    </div>
                </div>
                {!confirmReset ? (
                    <button onClick={() => setConfirmReset(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                        <RotateCcw size={13} /> {t("reset")}
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{t("resetConfirm")}</span>
                        <button onClick={reset} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ background: "var(--signal-avoid)", color: "white" }}>{t("resetYes")}</button>
                        <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-lg text-xs cursor-pointer" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t("cancel")}</button>
                    </div>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label={t("totalValue")} value={money(totals.totalValue)} accent="var(--accent-cyan)" />
                <StatCard
                    label={t("totalReturn")}
                    value={`${totals.totalReturn >= 0 ? "+" : ""}${money(totals.totalReturn)}`}
                    sub={`${totals.totalReturnPct >= 0 ? "+" : ""}${totals.totalReturnPct.toFixed(2)}%`}
                    accent={pnlColor(totals.totalReturn)}
                    icon={totals.totalReturn >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                />
                <StatCard label={t("invested")} value={money(totals.invested)} accent="var(--text-secondary)" />
                <StatCard label={t("cash")} value={money(totals.cash)} accent="var(--text-secondary)" />
            </div>

            {isEmpty && (
                <div className="text-center py-20 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <Coins size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{t("emptyTitle")}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("emptyHint")}</p>
                </div>
            )}

            {/* Positions */}
            {positions.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{t("positions")}</h2>
                    <div className="space-y-2">
                        {positions.map((p) => (
                            <motion.div
                                key={p.ticker}
                                layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => openDetail(p.assetType, p.ticker)}
                                className="grid grid-cols-12 items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors hover:brightness-110"
                                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                            >
                                {/* Asset */}
                                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                                        {p.assetType === "c" ? <Bitcoin size={15} style={{ color: "var(--accent-orange, #f59e0b)" }} /> : <Building2 size={15} style={{ color: "var(--accent-cyan)" }} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{p.symbol}</p>
                                        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{p.name}</p>
                                    </div>
                                </div>
                                {/* Qty / avg */}
                                <div className="col-span-3 text-right">
                                    <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{p.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })}</p>
                                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t("avgCost")} {money(p.avgCost)}</p>
                                </div>
                                {/* Price / value */}
                                <div className="col-span-2 text-right">
                                    <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{p.price > 0 ? money(p.price) : "—"}</p>
                                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{money(p.marketValue)}</p>
                                </div>
                                {/* P&L */}
                                <div className="col-span-3 text-right">
                                    <p className="text-sm font-bold font-mono" style={{ color: pnlColor(p.pnl) }}>
                                        {p.pnl >= 0 ? "+" : ""}{money(p.pnl)}
                                    </p>
                                    <p className="text-[11px] font-mono inline-flex items-center gap-0.5 justify-end" style={{ color: pnlColor(p.pnl) }}>
                                        {p.pnl >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Transactions */}
            {pf && pf.transactions.length > 0 && (
                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{t("history")}</h2>
                    <div className="space-y-1.5">
                        {pf.transactions.map((tx, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                                <span className="font-semibold px-2 py-0.5 rounded uppercase text-[10px] flex-shrink-0"
                                    style={{ background: tx.type === "buy" ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)", color: tx.type === "buy" ? "var(--signal-strong-buy)" : "var(--signal-avoid)" }}>
                                    {tx.type === "buy" ? t("buy") : t("sell")}
                                </span>
                                <span className="font-bold w-14 flex-shrink-0" style={{ color: "var(--text-primary)" }}>{tx.symbol}</span>
                                <span className="font-mono flex-1" style={{ color: "var(--text-muted)" }}>
                                    {tx.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })} @ {money(tx.price)}
                                </span>
                                {tx.type === "sell" && tx.realizedPnl !== undefined && (
                                    <span className="font-mono text-[11px]" style={{ color: pnlColor(tx.realizedPnl) }}>
                                        {tx.realizedPnl >= 0 ? "+" : ""}{money(tx.realizedPnl)}
                                    </span>
                                )}
                                <span className="font-mono font-semibold w-24 text-right flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{money(tx.amount)}</span>
                                <span className="w-28 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>{fmtDate(tx.date)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent: string; icon?: React.ReactNode }) {
    return (
        <div className="p-4 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-lg font-bold font-mono inline-flex items-center gap-1" style={{ color: accent }}>{icon}{value}</p>
            {sub && <p className="text-[11px] font-mono" style={{ color: accent }}>{sub}</p>}
        </div>
    );
}
