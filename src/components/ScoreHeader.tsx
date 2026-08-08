// ============================================================
// ScoreHeader — the premium score block in every detail header
// ============================================================
// One glass group holding the two valuations side by side, each with its
// verdict spelled out, plus the horizon selector:
//
//   ┌─────────────────────────────────────────────────────────┐
//   │  (72) FUNDAMENTAL │ (72) GLOBAL · label │ Horizonte     │
//   │   ▲▲  STRONG BUY  │      ≈ blend        │ C · M · L     │
//   └─────────────────────────────────────────────────────────┘
//
// The fundamental ring stays dominant (it is the product's identity); the
// global one answers "and if I also listen to the chart, at MY horizon?".
// Changing the horizon reshapes the blend live — short leans on the
// technical read, long almost ignores it — and persists via settings.
//
// When the user disabled the technical weight (0%) or the technical score is
// missing, the group gracefully collapses to the fundamental ring alone.

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown } from "lucide-react";
import ScoreRing from "./ScoreRing";
import { blendGlobal } from "./GlobalScore";
import {
    useScoringPrefs, setHorizon, effectiveTechnicalWeight, type ScoringHorizon,
} from "@/lib/scoring-prefs";

const HORIZONS: ScoringHorizon[] = ["short", "medium", "long"];

/** Verdict label for the blended score, using the app-wide thresholds. */
function globalVerdictKey(score: number): string {
    if (score >= 72) return "globalVerdict_strong";
    if (score >= 56) return "globalVerdict_constructive";
    if (score >= 40) return "globalVerdict_weak";
    return "globalVerdict_adverse";
}

export default function ScoreHeader({
    fundamental, recommendation, aiLevel = 0, aiTitle, technical,
}: {
    fundamental: number;
    /** The engine's label, e.g. "STRONG BUY" — shown under the main ring. */
    recommendation: string;
    /** Reinforcement arrows from the qualitative AI (±3..0). */
    aiLevel?: number;
    aiTitle?: string;
    /** Technical score 0-100, or null while loading / unavailable. */
    technical: number | null;
}) {
    const t = useTranslations("technical");
    const prefs = useScoringPrefs();

    const showGlobal =
        prefs.loaded && prefs.technicalWeight > 0 && technical !== null;
    const w = effectiveTechnicalWeight(prefs.technicalWeight, prefs.horizon);
    const global = showGlobal ? blendGlobal(fundamental, technical as number, w) : null;

    return (
        <div
            className="flex items-center gap-5 w-full pl-4 pr-4 py-2.5 rounded-2xl"
            style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.04))",
                border: "1px solid var(--border-active)",
            }}
        >
            {/* ── Fundamental — the headline number ── */}
            <div className="flex flex-col items-center gap-1">
                <div className="relative" title={aiTitle}>
                    <ScoreRing score={fundamental} size={52} strokeWidth={3.5} recommendation={recommendation} />
                    {aiLevel !== 0 && (
                        <div className="absolute -top-1.5 -right-1.5 flex flex-col items-center -space-y-1.5">
                            {Array.from({ length: Math.abs(aiLevel) }).map((_, i) => (
                                aiLevel > 0
                                    ? <ChevronUp key={i} size={12} strokeWidth={3.5} style={{ color: "var(--signal-strong-buy)" }} />
                                    : <ChevronDown key={i} size={12} strokeWidth={3.5} style={{ color: "var(--signal-avoid)" }} />
                            ))}
                        </div>
                    )}
                </div>
                <span className="text-[8px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--text-muted)" }}>
                    {t("fundamentalLabel")}
                </span>
            </div>

            {showGlobal && global !== null && (
                <>
                    <div className="w-px self-stretch my-1" style={{ background: "var(--border-subtle)" }} />

                    {/* ── Global — fundamental blended with the chart ── */}
                    <div
                        className="flex flex-col items-center gap-1 cursor-help"
                        title={t("globalTip", { w: Math.round(w * 100) })}
                    >
                        <ScoreRing score={global} size={52} strokeWidth={3.5} recommendation={t(globalVerdictKey(global))} />
                        <span className="text-[8px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--text-muted)" }}>
                            {t("globalLabel")} · {Math.round(w * 100)}%
                        </span>
                    </div>

                    {/* ── Horizon selector — pushed to the far edge: the block
                        spans the header row, so the choice reads as a control
                        for the whole group rather than a third score. ── */}
                    <div className="flex flex-col items-end gap-1 ml-auto">
                        <span className="text-[8px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--text-muted)" }}>
                            {t("horizonLabel")}
                        </span>
                        <div
                            className="no-print flex gap-0.5 p-0.5 rounded-lg"
                            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}
                        >
                            {HORIZONS.map((h) => {
                                const active = prefs.horizon === h;
                                return (
                                    <button
                                        key={h}
                                        onClick={() => setHorizon(h)}
                                        title={t(`horizonTip_${h}`)}
                                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer leading-none"
                                        style={{
                                            background: active ? "var(--glass-bg)" : "transparent",
                                            border: active ? "1px solid var(--border-active)" : "1px solid transparent",
                                            color: active ? "var(--text-primary)" : "var(--text-muted)",
                                        }}
                                    >
                                        {t(`horizon_${h}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
