// ============================================================
// Header - Top bar with title, stats, language toggle
// ============================================================

"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { Rocket, RefreshCw, Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function Header() {
    const { scores, macro, isLoading } = useAppStore();
    const passingCount = scores.filter((s) => s.passesHardFilters).length;
    const strongBuyCount = scores.filter((s) => s.recommendation === "STRONG_BUY").length;
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    const handleRefresh = () => {
        const store = useAppStore.getState();
        store.fetchLiveData();
    };

    // Switch locale: replace /en/ with /es/ or vice versa in the pathname
    const switchLocale = (newLocale: string) => {
        // pathname is like /en/macro/turbulence → replace first segment
        const segments = pathname.split("/");
        segments[1] = newLocale;
        router.push(segments.join("/"));
    };

    return (
        <header
            className="flex items-center justify-between px-6 py-3"
            style={{
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-subtle)",
            }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                    }}
                >
                    <Rocket size={16} className="text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-bold tracking-wide">
                        <span style={{ color: "var(--accent-cyan)" }}>Astro</span>{" "}
                        <span style={{ color: "var(--text-primary)" }}>Trader</span>{" "}
                        <span className="font-normal" style={{ color: "var(--text-muted)" }}>Insights</span>
                    </h1>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        Algorithmic Stock Analysis · Explorer Mode
                    </p>
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-6">
                {/* Live Stats */}
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Passing Filters
                    </div>
                    <div className="text-sm font-bold font-mono" style={{ color: "var(--accent-emerald)" }}>
                        {passingCount}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Strong Buys
                    </div>
                    <div className="text-sm font-bold font-mono" style={{ color: "var(--signal-strong-buy)" }}>
                        {strongBuyCount}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Rates
                    </div>
                    <div className="text-sm font-bold font-mono" style={{ color: "var(--accent-amber)" }}>
                        {macro.currentRate}% {macro.interestRateTrend === "rising" ? "↑" : macro.interestRateTrend === "falling" ? "↓" : "→"}
                    </div>
                </div>

                {/* Language Toggle */}
                <div
                    className="flex items-center gap-1 rounded-lg p-1"
                    style={{ background: "var(--glass-bg)", border: "1px solid var(--border-subtle)" }}
                >
                    <Globe size={12} style={{ color: "var(--text-muted)" }} className="ml-1 mr-0.5" />
                    {(["en", "es"] as const).map((l) => (
                        <button
                            key={l}
                            onClick={() => switchLocale(l)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                            style={{
                                background: locale === l ? "var(--accent-cyan)" : "transparent",
                                color: locale === l ? "#000" : "var(--text-muted)",
                            }}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40"
                    title="Refresh live data"
                >
                    <RefreshCw
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                        className={isLoading ? "animate-spin" : ""}
                    />
                </button>
            </div>
        </header>
    );
}
