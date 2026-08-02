// ============================================================
// ScoreTransparency — show what the score is actually made of
// ============================================================
// Two gaps this closes, both found by auditing a real report:
//
//  1. A pillar decided by 2 of its 6 metrics looked exactly like a pillar
//     decided by all 6. Ethereum's "on-chain" pillar read 87/100 while
//     every on-chain metric in it was N/D — it was two GitHub counters.
//     The engine now shrinks a thin pillar toward neutral; these components
//     make that visible instead of silent.
//
//  2. The pillars never added up to the headline number, because a Fear &
//     Greed multiplier was applied afterwards and shown nowhere. Anyone
//     checking the arithmetic found an unexplained gap.

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { THIN_COVERAGE, type PillarResult } from "@/lib/scoring";
// Each detail view defines its own styled Tooltip locally, so this shared
// component uses the native title attribute rather than reaching into one.

/**
 * A thin bar + caption showing how much of a pillar we could measure.
 * Renders nothing for analyses cached before coverage was tracked.
 */
export function CoverageBar({ pillar }: { pillar?: PillarResult }) {
    const t = useTranslations("coverage");
    if (!pillar) return null;

    const pct = Math.round(pillar.coverage * 100);
    const thin = pillar.coverage < THIN_COVERAGE;
    const color = thin ? "var(--signal-hold)" : "var(--text-muted)";

    const detail = pillar.total
        ? t("metrics", { measured: pillar.measured ?? 0, total: pillar.total })
        : t("points", { possible: pillar.possible, max: pillar.maxPossible });

    // Only mention the shrink when it actually moved the number.
    const shifted = pillar.score !== pillar.raw;

    return (
        <div
            className="flex items-center gap-2 pt-1.5 cursor-help"
            title={shifted ? t("tipShifted", { raw: pillar.raw, score: pillar.score }) : t("tip")}
        >
            <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[10px] font-mono whitespace-nowrap flex items-center gap-1" style={{ color }}>
                {thin && <AlertTriangle size={10} />}
                {t("label", { pct })} · {detail}
            </span>
        </div>
    );
}

/** Past this age a cached qualitative analysis gets an explicit warning. */
export const STALE_ANALYSIS_DAYS = 14;

/**
 * A cached AI analysis and a live quantitative score sit in the same report
 * but are not the same vintage: the number is recomputed on every open, the
 * text is written once and kept. A six-week-old narrative next to today's
 * score read as one coherent, current analysis. This says otherwise.
 */
export function AnalysisAge({ generatedAt }: { generatedAt?: string }) {
    const t = useTranslations("coverage");
    // Read the clock after mount, not during render: it keeps the component
    // pure and avoids a server/client hydration mismatch on the day boundary.
    const [now, setNow] = React.useState<number | null>(null);
    React.useEffect(() => setNow(Date.now()), []);

    if (!generatedAt || now === null) return null;

    const then = new Date(generatedAt);
    if (isNaN(then.getTime())) return null;

    const days = Math.floor((now - then.getTime()) / 86_400_000);
    if (days < STALE_ANALYSIS_DAYS) return null;

    return (
        <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
            style={{
                background: "rgba(251,191,36,0.06)",
                border: "1px solid rgba(251,191,36,0.2)",
                color: "var(--signal-hold)",
            }}
        >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{t("staleAnalysis", { days, date: then.toLocaleDateString("es-ES") })}</span>
        </div>
    );
}

/**
 * The full arithmetic behind the headline score, so the pillars above it
 * visibly add up: `composite × macro = total`.
 */
export function ScoreArithmetic({
    composite, macro, total, macroLabel,
}: {
    composite?: number;
    macro: number;
    total: number;
    /** What the multiplier represents (Fear & Greed for crypto, macro for stocks). */
    macroLabel: string;
}) {
    const t = useTranslations("coverage");
    if (composite === undefined) return null;

    const nf = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
    const adjusts = Math.abs(macro - 1) > 0.0005;

    return (
        <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("arithmetic")}
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                {nf(composite)}
                {adjusts && (
                    <span
                        className="cursor-help"
                        title={t("macroTip", { label: macroLabel, pct: nf((macro - 1) * 100) })}
                        style={{ color: macro > 1 ? "var(--signal-strong-buy)" : "var(--signal-avoid)" }}
                    >
                        {" × "}{macro.toFixed(2)}
                    </span>
                )}
                {" = "}
                <strong style={{ color: "var(--accent-cyan)" }}>{total}</strong>
            </span>
        </div>
    );
}
