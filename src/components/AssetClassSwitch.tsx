// ============================================================
// AssetClassSwitch — stocks / crypto / ETFs, in the content header
// ============================================================
// This lived in the navigation rail, stacked under the section links. It was
// a category error: it doesn't take you anywhere, it changes what you're
// looking at where you already are. Three of the eleven targets crammed into
// a 72px column were spent on a filter.
//
// It now sits at the top of the content, on the sections where it applies —
// next to the thing it filters, which is also where you can see its effect.

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Building2, Bitcoin, Layers } from "lucide-react";
import { useAppStore, type AssetClass } from "@/lib/store";

const OPTIONS: { key: AssetClass; tKey: string; icon: typeof Building2; accent: string }[] = [
    { key: "stocks", tKey: "stocks", icon: Building2, accent: "var(--accent-cyan)" },
    { key: "crypto", tKey: "crypto", icon: Bitcoin, accent: "var(--accent-amber)" },
    { key: "etf", tKey: "etfs", icon: Layers, accent: "var(--accent-violet)" },
];

export default function AssetClassSwitch() {
    const t = useTranslations("nav");
    const assetClass = useAppStore((s) => s.assetClass);
    const setAssetClass = useAppStore((s) => s.setAssetClass);

    return (
        <div className="flex items-center gap-3 px-6 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("assetClass")}
            </span>
            <div
                role="tablist"
                aria-label={t("assetClass")}
                className="flex items-center gap-0.5 p-0.5 rounded-lg"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}
            >
                {OPTIONS.map((o) => {
                    const active = assetClass === o.key;
                    return (
                        <button
                            key={o.key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setAssetClass(o.key)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer"
                            style={{
                                background: active ? "var(--glass-bg)" : "transparent",
                                border: active ? "1px solid var(--border-active)" : "1px solid transparent",
                                color: active ? "var(--text-primary)" : "var(--text-muted)",
                            }}
                        >
                            <o.icon size={13} style={{ color: active ? o.accent : "var(--text-muted)" }} />
                            {t(o.tKey)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
