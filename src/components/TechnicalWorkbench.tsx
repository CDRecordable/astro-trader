// ============================================================
// TechnicalWorkbench — the chartist exploration section
// ============================================================
// A TradingView-style workspace: search any asset (stock / crypto / ETF),
// study it on the multi-pane candle chart, and read the technical score with
// its per-pillar coverage, discrete signals, levels and AI translation in a
// side panel. Deep-linkable: /technical?symbol=AAPL&type=s (the fichas link
// here with the asset preloaded).

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CandlestickChart, Loader2, AlertTriangle } from "lucide-react";
import type { TickerEntry } from "@/lib/ticker-registry";
import type { Candle } from "@/lib/technical";
import type { TechnicalScore } from "@/lib/technical-score";
import { overallStance } from "@/lib/technical-score";
import TickerSearch from "./TickerSearch";
import TechnicalChart from "./TechnicalChart";
import TechnicalAiSection from "./TechnicalAiSection";
import { CoverageBar } from "./ScoreTransparency";

type AssetType = "s" | "c" | "e";

interface Selected { id: string; type: AssetType; name: string }

interface TechnicalPayload {
    id: string;
    type: AssetType;
    candles: Candle[];
    score: TechnicalScore;
}

const VERDICT_STYLE: Record<TechnicalScore["verdict"], { color: string }> = {
    strong: { color: "var(--signal-strong-buy)" },
    moderate: { color: "var(--signal-buy)" },
    weak: { color: "var(--signal-hold)" },
    avoid: { color: "var(--signal-avoid)" },
};

const SIGNAL_DOT: Record<string, string> = {
    bullish: "var(--signal-strong-buy)",
    bearish: "var(--signal-avoid)",
    neutral: "var(--text-muted)",
};

function fmtPrice(x: number): string {
    return x >= 1000 ? x.toLocaleString("es-ES", { maximumFractionDigits: 0 })
        : x >= 1 ? x.toFixed(2) : x.toPrecision(3);
}

export default function TechnicalWorkbench() {
    const t = useTranslations("technical");
    const params = useSearchParams();

    const [selected, setSelected] = useState<Selected | null>(null);
    const [data, setData] = useState<TechnicalPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Deep-link: /technical?symbol=AAPL&type=s
    useEffect(() => {
        const symbol = params.get("symbol");
        if (!symbol) return;
        const type = (params.get("type") ?? "s") as AssetType;
         
        setSelected({ id: symbol, type, name: params.get("name") ?? symbol.toUpperCase() });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const load = useCallback(async (sel: Selected) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await fetch(`/api/technical/${encodeURIComponent(sel.id)}?type=${sel.type}`);
            const d = await res.json();
            if (!res.ok) {
                setError(
                    d.error === "not_enough_history" ? t("notEnoughHistory")
                        : d.error === "provider_throttled" ? t("throttled")
                            : t("fetchError"),
                );
            } else {
                setData(d);
            }
        } catch {
            setError(t("fetchError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (selected) void load(selected);
    }, [selected, load]);

    const onPick = useCallback((entry: TickerEntry) => {
        setSelected({ id: entry.t, type: entry.y, name: entry.n });
    }, []);

    const score = data?.score ?? null;
    const stance = score ? overallStance(score.snapshot) : null;
    const topSignals = score
        ? [...score.snapshot.readings]
            .filter((r) => r.available)
            .sort((a, b) => b.strength - a.strength)
        : [];

    return (
        <div className="min-h-screen p-6" style={{ background: "var(--bg-secondary)" }}>
            <div className="max-w-[1500px] mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <CandlestickChart size={22} style={{ color: "var(--accent-cyan)" }} />
                        <div>
                            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
                        </div>
                    </div>
                    <TickerSearch assetType="all" compact onSelect={onPick} />
                </div>

                {/* Empty state */}
                {!selected && !loading && (
                    <div className="glass-card p-10 text-center">
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("emptyState")}</p>
                    </div>
                )}

                {loading && (
                    <div className="glass-card flex items-center justify-center py-24">
                        <Loader2 size={26} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                    </div>
                )}

                {error && !loading && (
                    <div className="glass-card p-5 flex items-center gap-2.5 text-sm" style={{ color: "var(--signal-hold)" }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {data && score && !loading && (
                    <div className="flex flex-col lg:flex-row gap-5 items-start">
                        {/* ── Chart ── */}
                        <section className="glass-card p-4 flex-1 min-w-0 w-full">
                            <div className="flex items-baseline gap-2.5 mb-3">
                                <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                    {selected?.name}
                                </h2>
                                <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                                    {data.id.toUpperCase()} · {t("asOf", { date: score.asOf })}
                                </span>
                            </div>
                            <TechnicalChart candles={data.candles} />
                        </section>

                        {/* ── Side panel ── */}
                        <div className="w-full lg:w-[340px] shrink-0 space-y-4">
                            {/* Score */}
                            <section className="glass-card p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                        {t("scoreTitle")}
                                    </h3>
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                        style={{
                                            color: VERDICT_STYLE[score.verdict].color,
                                            background: `color-mix(in srgb, ${VERDICT_STYLE[score.verdict].color} 12%, transparent)`,
                                        }}
                                    >
                                        {t(`verdict_${score.verdict}`)}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1 mb-3">
                                    <span className="text-3xl font-bold font-mono" style={{ color: VERDICT_STYLE[score.verdict].color }}>
                                        {score.score}
                                    </span>
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>/100</span>
                                </div>

                                {([
                                    ["trend", score.pillars.trend, score.weights.trend],
                                    ["momentum", score.pillars.momentum, score.weights.momentum],
                                    ["volatility", score.pillars.volatility, score.weights.volatility],
                                ] as const).map(([key, pillar, w]) => (
                                    <div key={key} className="py-1.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                                {t(`pillar_${key}`)} ({Math.round(w * 100)}%)
                                            </span>
                                            <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                                                {pillar.score}/100
                                            </span>
                                        </div>
                                        <CoverageBar pillar={pillar} />
                                    </div>
                                ))}

                                {stance && (
                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("balance")}</span>
                                        <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                                            <span style={{ color: "var(--signal-strong-buy)" }}>▲ {stance.bullish}</span>
                                            {" · "}
                                            <span style={{ color: "var(--signal-avoid)" }}>▼ {stance.bearish}</span>
                                        </span>
                                    </div>
                                )}
                            </section>

                            {/* Signals */}
                            <section className="glass-card p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                    {t("signalsTitle")}
                                </h3>
                                <div className="space-y-1">
                                    {topSignals.map((r) => (
                                        <div key={r.id} className="flex items-center gap-2 py-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SIGNAL_DOT[r.signal] }} />
                                            <span className="text-[11px] flex-1" style={{ color: "var(--text-secondary)" }}>{t(`ind_${r.id}`)}</span>
                                            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                                                {r.value !== null ? r.value : "—"}
                                            </span>
                                        </div>
                                    ))}
                                    {score.snapshot.readings.filter((r) => !r.available).length > 0 && (
                                        <p className="text-[9px] italic pt-1.5" style={{ color: "var(--text-muted)" }}>
                                            {t("ndNote", {
                                                list: score.snapshot.readings
                                                    .filter((r) => !r.available)
                                                    .map((r) => t(`ind_${r.id}`))
                                                    .join(", "),
                                            })}
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* Levels */}
                            {(score.snapshot.levels.supports.length > 0 || score.snapshot.levels.resistances.length > 0) && (
                                <section className="glass-card p-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                        {t("levelsTitle")}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--signal-avoid)" }}>{t("resistances")}</p>
                                            {score.snapshot.levels.resistances.map((x, i) => (
                                                <p key={i} className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{fmtPrice(x)}</p>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--signal-strong-buy)" }}>{t("supports")}</p>
                                            {score.snapshot.levels.supports.map((x, i) => (
                                                <p key={i} className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{fmtPrice(x)}</p>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* AI */}
                            {selected && (
                                <TechnicalAiSection
                                    id={data.id}
                                    type={data.type}
                                    name={selected.name}
                                    symbol={data.id.toUpperCase()}
                                    score={score}
                                />
                            )}

                            <p className="text-[9px] italic leading-relaxed px-1" style={{ color: "var(--text-muted)" }}>
                                {t("disclaimer")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
