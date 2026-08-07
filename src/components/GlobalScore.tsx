// ============================================================
// GlobalScore — the fundamental × technical blend (presentation only)
// ============================================================
// Global = fundamental × (1−w) + technical × w, where w is the user's
// baseline weight RESHAPED by the selected investment horizon (see
// scoring-prefs.ts: short ×1.75, medium ×1, long ×0.375). Nothing here
// touches AlgorithmScore or any cache — the blend is computed at render time
// from the two scores on screen.
//
// Honesty note, surfaced in the tooltip: ~30% of the stock fundamental score
// (its timing pillar) is already price-based, so the global slightly
// over-weights price signal. Documented rather than hidden.

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useScoringPrefs, effectiveTechnicalWeight } from "@/lib/scoring-prefs";

export function blendGlobal(fundamental: number, technical: number, weight: number): number {
    return Math.round(fundamental * (1 - weight) + technical * weight);
}

/**
 * The visible arithmetic — same discipline as ScoreArithmetic: the number
 * must be checkable, never an unexplained headline. Reacts live to the
 * horizon selector because both read the same shared prefs.
 */
export function GlobalScoreArithmetic({ fundamental, technical }: {
    fundamental: number;
    technical: number;
}) {
    const t = useTranslations("technical");
    const prefs = useScoringPrefs();
    if (!prefs.loaded || prefs.technicalWeight === 0) return null;
    const w = effectiveTechnicalWeight(prefs.technicalWeight, prefs.horizon);
    const global = blendGlobal(fundamental, technical, w);
    const pct = (x: number) => x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return (
        <div
            className="flex items-center justify-between pt-2 mt-1 cursor-help"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
            title={t("globalTip", { w: Math.round(w * 100) })}
        >
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("globalLabel")} · {t(`horizon_${prefs.horizon}`)}
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                {fundamental} × {pct(1 - w)} + {technical} × {pct(w)} ={" "}
                <strong style={{ color: "var(--accent-cyan)" }}>{global}</strong>
            </span>
        </div>
    );
}
