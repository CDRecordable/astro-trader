// ============================================================
// TechnicalSection — the compact technical block inside the fichas
// ============================================================
// Fetches the light payload (score only, ~3KB — the candles stay in the
// workbench), shows the technical score with its pillars and top signals,
// the global blend arithmetic, and links to the workbench with the asset
// preloaded. Failure here must NEVER break the ficha: it degrades to a
// one-line "not available".

"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CandlestickChart, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TechnicalScore } from "@/lib/technical-score";
import { CoverageBar } from "./ScoreTransparency";
import { GlobalScoreArithmetic } from "./GlobalScore";
import TechnicalAiSection from "./TechnicalAiSection";

const VERDICT_COLOR: Record<TechnicalScore["verdict"], string> = {
    strong: "var(--signal-strong-buy)",
    moderate: "var(--signal-buy)",
    weak: "var(--signal-hold)",
    avoid: "var(--signal-avoid)",
};

const SIGNAL_DOT: Record<string, string> = {
    bullish: "var(--signal-strong-buy)",
    bearish: "var(--signal-avoid)",
    neutral: "var(--text-muted)",
};

export default function TechnicalSection({
    id, type, name, fundamentalScore, onScore,
}: {
    /** Yahoo symbol for s/e, CoinGecko id for c. */
    id: string;
    type: "s" | "c" | "e";
    name: string;
    fundamentalScore: number;
    /** Lets the parent show the global ring in its header. */
    onScore?: (score: TechnicalScore | null) => void;
}) {
    const t = useTranslations("technical");
    const [score, setScore] = useState<TechnicalScore | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        // Reset when the asset changes (intentional sync set, same pattern as
        // the detail views).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScore(null);
        setFailed(false);
        fetch(`/api/technical/${encodeURIComponent(id)}?type=${type}&light=1`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { score?: TechnicalScore } | null) => {
                if (!active) return;
                if (d?.score) setScore(d.score);
                else setFailed(true);
            })
            .catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [id, type]);

    // Notify the parent outside the fetch chain so re-renders stay clean.
    useEffect(() => { onScore?.(score); }, [score, onScore]);

    if (failed) {
        return (
            <section className="glass-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1" style={{ color: "var(--text-secondary)" }}>
                    <CandlestickChart size={13} style={{ color: "var(--accent-cyan)" }} /> {t("sectionTitle")}
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("unavailable")}</p>
            </section>
        );
    }

    if (!score) {
        return (
            <section className="glass-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                    <CandlestickChart size={13} style={{ color: "var(--accent-cyan)" }} /> {t("sectionTitle")}
                </h3>
                <div className="h-24 flex items-center justify-center">
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>…</span>
                </div>
            </section>
        );
    }

    const top = [...score.snapshot.readings]
        .filter((r) => r.available && r.signal !== "neutral")
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 6);

    return (
        <div className="space-y-4">
            <section className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <CandlestickChart size={13} style={{ color: "var(--accent-cyan)" }} /> {t("sectionTitle")}
                    </h3>
                    <Link
                        href={{ pathname: "/technical", query: { symbol: id, type, name } }}
                        className="no-print flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-80"
                        style={{ color: "var(--accent-cyan)" }}
                    >
                        {t("openWorkbench")} <ArrowUpRight size={11} />
                    </Link>
                </div>

                <div className="flex items-start gap-5">
                    {/* Compact score */}
                    <div className="shrink-0 w-24 text-center">
                        <div className="text-3xl font-bold font-mono" style={{ color: VERDICT_COLOR[score.verdict] }}>
                            {score.score}
                        </div>
                        <div
                            className="text-[9px] font-bold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
                            style={{
                                color: VERDICT_COLOR[score.verdict],
                                background: `color-mix(in srgb, ${VERDICT_COLOR[score.verdict]} 12%, transparent)`,
                            }}
                        >
                            {t(`verdict_${score.verdict}`)}
                        </div>
                        <p className="text-[9px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                            {t("asOf", { date: score.asOf })}
                        </p>
                    </div>

                    {/* Pillars */}
                    <div className="flex-1 min-w-0">
                        {([
                            ["trend", score.pillars.trend],
                            ["momentum", score.pillars.momentum],
                            ["volatility", score.pillars.volatility],
                        ] as const).map(([key, pillar]) => (
                            <div key={key} className="py-1" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t(`pillar_${key}`)}</span>
                                    <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>{pillar.score}/100</span>
                                </div>
                                <CoverageBar pillar={pillar} />
                            </div>
                        ))}
                        <GlobalScoreArithmetic fundamental={fundamentalScore} technical={score.score} />
                    </div>
                </div>

                {/* Top directional signals */}
                {top.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {top.map((r) => (
                            <span
                                key={r.id}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]"
                                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: SIGNAL_DOT[r.signal] }} />
                                {t(`ind_${r.id}`)}
                                {r.value !== null && <span className="font-mono" style={{ color: "var(--text-muted)" }}>{r.value}</span>}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            <TechnicalAiSection
                id={id}
                type={type}
                name={name}
                symbol={id.toUpperCase()}
                score={score}
            />
        </div>
    );
}
