// ============================================================
// TradeButtons — Buy / Sell a stock or crypto into the simulated portfolio
// ============================================================
// Sits in the detail header next to watchlist/discards. Orders are placed by
// dollar amount at the asset's current price; fractional units allowed.

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Company } from "@/lib/types";

export default function TradeButtons({ company, assetType }: { company: Company; assetType: "s" | "c" }) {
    const t = useTranslations("portfolio");
    const lookupKey = company.id.replace(/^(cg_|yf_|db_)/i, "");
    const price = company.metrics.currentPrice;

    const [cash, setCash] = useState<number | null>(null);
    const [posQty, setPosQty] = useState(0);
    const [open, setOpen] = useState<null | "buy" | "sell">(null);
    const [amount, setAmount] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(() => {
        fetch("/api/portfolio").then((r) => r.json())
            .then((p: { cash?: number; holdings?: Record<string, { qty: number }> }) => {
                setCash(p.cash ?? null);
                setPosQty(p.holdings?.[lookupKey.toLowerCase()]?.qty ?? 0);
            }).catch(() => { });
    }, [lookupKey]);
    useEffect(() => { load(); }, [load]);

    const positionValue = posQty * price;
    const amt = parseFloat(amount) || 0;
    const units = price > 0 ? amt / price : 0;

    const submit = async () => {
        if (amt <= 0) return;
        setBusy(true); setErr(null);
        try {
            const res = await fetch("/api/portfolio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker: lookupKey, symbol: company.ticker, name: company.name, assetType, type: open, amount: amt, price }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error ?? "error"); }
            else {
                setCash(d.cash ?? null);
                setPosQty(d.holdings?.[lookupKey.toLowerCase()]?.qty ?? 0);
                setOpen(null); setAmount("");
            }
        } catch { setErr("network"); }
        finally { setBusy(false); }
    };

    const isBuy = open === "buy";
    const maxAmount = isBuy ? (cash ?? 0) : positionValue;

    return (
        <>
            <button
                onClick={() => { setOpen("buy"); setAmount(""); setErr(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)", color: "var(--signal-strong-buy)" }}
            >
                <TrendingUp size={14} /> <span className="hidden sm:inline">{t("buy")}</span>
            </button>
            <button
                onClick={() => { if (posQty > 0) { setOpen("sell"); setAmount(""); setErr(null); } }}
                disabled={posQty <= 0}
                title={posQty <= 0 ? t("noPosition") : t("sell")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgba(251,113,133,0.10)", border: "1px solid rgba(251,113,133,0.4)", color: "var(--signal-avoid)" }}
            >
                <TrendingDown size={14} /> <span className="hidden sm:inline">{t("sell")}</span>
            </button>

            {/* Order dialog */}
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(null)}>
                    <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold" style={{ color: isBuy ? "var(--signal-strong-buy)" : "var(--signal-avoid)" }}>
                                {isBuy ? t("dialogBuyTitle", { symbol: company.ticker }) : t("dialogSellTitle", { symbol: company.ticker })}
                            </h3>
                            <button onClick={() => setOpen(null)} className="p-1 rounded cursor-pointer"><X size={16} style={{ color: "var(--text-muted)" }} /></button>
                        </div>

                        <div className="space-y-2 text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                            <div className="flex justify-between"><span>{t("currentPrice")}</span><span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>${price.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>{isBuy ? t("availableCash") : t("positionValue")}</span><span className="font-mono font-bold" style={{ color: "var(--text-secondary)" }}>${maxAmount.toFixed(2)}</span></div>
                        </div>

                        {/* Amount input */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>$</span>
                            <input
                                type="number" min={0} value={amount} autoFocus
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={t("amountLabel")}
                                className="flex-1 bg-transparent text-sm font-mono outline-none" style={{ color: "var(--text-primary)" }}
                            />
                            <button onClick={() => setAmount(maxAmount.toFixed(2))} className="text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer" style={{ background: "var(--bg-secondary)", color: "var(--accent-cyan)" }}>{t("max")}</button>
                        </div>
                        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                            ≈ <span className="font-mono font-bold" style={{ color: "var(--text-secondary)" }}>{units.toFixed(4)}</span> {t("units")}
                        </p>

                        {err && <p className="text-[11px] mb-2" style={{ color: "var(--signal-avoid)" }}>⚠ {t(`err_${err}`)}</p>}

                        <button
                            onClick={submit}
                            disabled={busy || amt <= 0 || amt > maxAmount + 0.001}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
                            style={{ background: isBuy ? "var(--signal-strong-buy)" : "var(--signal-avoid)", color: "white" }}
                        >
                            {busy ? <Loader2 size={15} className="animate-spin" /> : isBuy ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                            {isBuy ? t("confirmBuy") : t("confirmSell")}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
