// ============================================================
// WatchlistButton — add/remove the current company to the watchlist
// Reused by both CompanyDetail (stocks) and CryptoDetail (crypto).
// Toggles a star: idle → saved → (click again) removed.
// ============================================================

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Star, Loader2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Company } from "@/lib/types";
import type { WatchlistItem } from "@/app/api/watchlist/route";

type State = "checking" | "idle" | "saving" | "saved";

export default function WatchlistButton({
    company,
    assetType,
}: {
    company: Company;
    assetType: "s" | "c" | "e";
}) {
    const t = useTranslations("companyDetail");

    // Watchlist lookup key: CoinGecko id for crypto, symbol for stocks.
    // Company.id is prefixed by the provider (cg_… / yf_…) — strip it.
    const lookupKey = company.id.replace(/^(cg_|yf_|db_|etf_)/i, "");

    const [state, setState] = useState<State>("checking");

    // Is it already saved? (one read on mount)
    useEffect(() => {
        let active = true;
        fetch("/api/watchlist")
            .then((r) => r.json())
            .then((d: { items?: WatchlistItem[] }) => {
                if (!active) return;
                const present = (d.items ?? []).some(
                    (i) => i.ticker.toLowerCase() === lookupKey.toLowerCase()
                );
                setState(present ? "saved" : "idle");
            })
            .catch(() => { if (active) setState("idle"); });
        return () => { active = false; };
    }, [lookupKey]);

    const toggle = useCallback(async () => {
        if (state === "checking" || state === "saving") return;

        // Remove
        if (state === "saved") {
            setState("saving");
            try {
                await fetch(`/api/watchlist?ticker=${encodeURIComponent(lookupKey)}`, { method: "DELETE" });
                setState("idle");
            } catch {
                setState("saved");
            }
            return;
        }

        // Add
        setState("saving");
        try {
            const item: WatchlistItem = {
                ticker: lookupKey,
                symbol: company.ticker,
                name: company.name,
                assetType,
                addedAt: new Date().toISOString(),
                note: "",
            };
            const res = await fetch("/api/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
            });
            setState(res.ok || res.status === 409 ? "saved" : "idle");
        } catch {
            setState("idle");
        }
    }, [state, lookupKey, company.ticker, company.name, assetType]);

    const saved = state === "saved";
    const busy = state === "saving" || state === "checking";

    return (
        <button
            onClick={toggle}
            disabled={busy}
            title={saved ? t("removeFromWatchlist") : t("addToWatchlist")}
            className="header-action"
            style={{ color: saved ? "var(--accent-amber)" : undefined }}
        >
            {state === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
                <Check size={14} />
            ) : (
                <Star size={14} style={{ color: "var(--accent-amber)", opacity: 0.7 }} />
            )}
            <span className="hidden sm:inline">
                {saved ? t("inWatchlist") : t("addToWatchlist")}
            </span>
        </button>
    );
}
