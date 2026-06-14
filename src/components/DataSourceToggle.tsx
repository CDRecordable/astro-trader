// ============================================================
// DataSourceToggle - Switch between Mock and Live data
// ============================================================

"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { Database, Wifi } from "lucide-react";

export default function DataSourceToggle() {
    const { dataSource, setDataSource, isLoading, apiCallCount, error } = useAppStore();

    const isLive = dataSource === "live";

    return (
        <div className="flex items-center gap-3">
            {/* API Calls Counter */}
            <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    API Calls
                </div>
                <div className="text-sm font-bold font-mono" style={{ color: "var(--text-secondary)" }}>
                    {apiCallCount}
                    <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>/250</span>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setDataSource(isLive ? "mock" : "live")}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{
                    background: isLive ? "rgba(52, 211, 153, 0.10)" : "var(--bg-tertiary)",
                    border: isLive
                        ? "1px solid rgba(52, 211, 153, 0.25)"
                        : "1px solid var(--border-subtle)",
                    opacity: isLoading ? 0.6 : 1,
                }}
            >
                {isLive ? (
                    <Wifi size={14} style={{ color: "var(--signal-strong-buy)" }} />
                ) : (
                    <Database size={14} style={{ color: "var(--text-muted)" }} />
                )}
                <span
                    className="text-xs font-semibold"
                    style={{
                        color: isLive ? "var(--signal-strong-buy)" : "var(--text-muted)",
                    }}
                >
                    {isLoading ? "Loading..." : isLive ? "LIVE" : "MOCK"}
                </span>
            </button>

            {/* Error indicator */}
            {error && (
                <div
                    className="text-[10px] max-w-[160px] truncate"
                    style={{ color: "var(--signal-avoid)" }}
                    title={error}
                >
                    ⚠ {error}
                </div>
            )}
        </div>
    );
}
