// ============================================================
// Explorer Filters - Slider controls for the dashboard
// ============================================================

"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { formatPercent } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

function formatMarketCapWide(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}T`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}B`;
    return `$${value}M`;
}

export default function ExplorerFilters() {
    const { filters, setFilter } = useAppStore();

    return (
        <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal size={16} style={{ color: "var(--accent-cyan)" }} />
                <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>
                    Explorer Filters
                </h2>
            </div>

            <div className="space-y-5">
                {/* Market Cap Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            Max Market Cap
                        </label>
                        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
                            {formatMarketCapWide(filters.maxMarketCap)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={100}
                        max={5_000_000}
                        step={100}
                        value={filters.maxMarketCap}
                        onChange={(e) => setFilter("maxMarketCap", Number(e.target.value))}
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>$100M</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>$5T</span>
                    </div>
                </div>

                {/* FCF Yield Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            Min FCF Yield
                        </label>
                        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-emerald)" }}>
                            {formatPercent(filters.minFcfYield)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={0.30}
                        step={0.005}
                        value={filters.minFcfYield}
                        onChange={(e) => setFilter("minFcfYield", Number(e.target.value))}
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>0%</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>30%</span>
                    </div>
                </div>

                {/* Book-to-Market Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            Min Book-to-Market
                        </label>
                        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-violet)" }}>
                            {filters.minBookToMarket.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={3.0}
                        step={0.05}
                        value={filters.minBookToMarket}
                        onChange={(e) => setFilter("minBookToMarket", Number(e.target.value))}
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>0.00</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>3.00</span>
                    </div>
                </div>

                {/* Toggle: Show Only Passing */}
                <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        Hide failed filters
                    </span>
                    <button
                        onClick={() => setFilter("showOnlyPassing", !filters.showOnlyPassing)}
                        className="w-10 h-5 rounded-full transition-colors duration-200 relative"
                        style={{
                            background: filters.showOnlyPassing
                                ? "var(--accent-cyan-dim)"
                                : "var(--bg-tertiary)",
                        }}
                    >
                        <div
                            className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200"
                            style={{
                                left: filters.showOnlyPassing ? 22 : 2,
                                boxShadow: filters.showOnlyPassing
                                    ? "0 0 6px rgba(34, 211, 238, 0.4)"
                                    : "none",
                            }}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
