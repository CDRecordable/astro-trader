// ============================================================
// DiscardButton — add/remove the current company to the discard pile
// ============================================================
// Like the watchlist star, but for companies you deliberately set aside.
// When already discarded it shows WHEN (date + days ago) as a reminder that
// the decision may be stale — fundamentals could have changed since.

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Company } from "@/lib/types";
import type { DiscardItem } from "@/app/api/discards/route";

type State = "checking" | "idle" | "saving" | "discarded";

export default function DiscardButton({
    company,
    assetType,
}: {
    company: Company;
    assetType: "s" | "c";
}) {
    const t = useTranslations("companyDetail");
    const lookupKey = company.id.replace(/^(cg_|yf_|db_)/i, "");

    const [state, setState] = useState<State>("checking");
    const [discardedAt, setDiscardedAt] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/discards")
            .then((r) => r.json())
            .then((d: { items?: DiscardItem[] }) => {
                if (!active) return;
                const hit = (d.items ?? []).find((i) => i.ticker.toLowerCase() === lookupKey.toLowerCase());
                setDiscardedAt(hit?.discardedAt ?? null);
                setState(hit ? "discarded" : "idle");
            })
            .catch(() => { if (active) setState("idle"); });
        return () => { active = false; };
    }, [lookupKey]);

    const toggle = useCallback(async () => {
        if (state === "checking" || state === "saving") return;

        if (state === "discarded") {
            setState("saving");
            try {
                await fetch(`/api/discards?ticker=${encodeURIComponent(lookupKey)}`, { method: "DELETE" });
                setDiscardedAt(null);
                setState("idle");
            } catch { setState("discarded"); }
            return;
        }

        setState("saving");
        try {
            const item: DiscardItem = {
                ticker: lookupKey,
                symbol: company.ticker,
                name: company.name,
                assetType,
                discardedAt: new Date().toISOString(),
                reason: "",
            };
            const res = await fetch("/api/discards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
            });
            if (res.ok || res.status === 409) {
                setDiscardedAt(item.discardedAt);
                setState("discarded");
            } else {
                setState("idle");
            }
        } catch { setState("idle"); }
    }, [state, lookupKey, company.ticker, company.name, assetType]);

    const discarded = state === "discarded";
    const busy = state === "saving" || state === "checking";

    // Date signal
    let dateLabel = "";
    let daysAgo: number | null = null;
    if (discardedAt) {
        const d = new Date(discardedAt);
        dateLabel = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
        // eslint-disable-next-line react-hooks/purity -- staleness countdown reads the clock for display only
        daysAgo = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
    }

    return (
        <button
            onClick={toggle}
            disabled={busy}
            title={discarded ? t("discardedSince", { date: dateLabel, days: daysAgo ?? 0 }) : t("addToDiscards")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
            style={{
                background: discarded ? "rgba(251,113,133,0.12)" : "var(--bg-tertiary)",
                border: discarded ? "1px solid rgba(251,113,133,0.4)" : "1px solid var(--border-subtle)",
                color: discarded ? "var(--signal-avoid)" : "var(--text-secondary)",
            }}
        >
            {state === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
            ) : discarded ? (
                <RotateCcw size={14} />
            ) : (
                <Ban size={14} />
            )}
            <span className="hidden sm:inline">
                {discarded
                    ? t("discardedOn", { date: dateLabel })
                    : t("addToDiscards")}
            </span>
        </button>
    );
}
