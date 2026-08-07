// ============================================================
// GlobalScore — the fundamental × technical blend (presentation only)
// ============================================================
// Global = fundamental × (1−w) + technical × w, with w from Settings
// (default 0.4, and 0 disables the blend entirely — for users who consider
// chartism a chimera). Nothing here touches AlgorithmScore or any cache:
// the blend is computed at render time from the two scores on screen.
//
// Honesty note, surfaced in the tooltip: ~30% of the stock fundamental score
// (its timing pillar) is already price-based, so the global slightly
// over-weights price signal. Documented rather than hidden. A retrocompatible
// refinement exists if it ever bothers us: blend against the ex-timing base
// ((valuation×0.40 + trend×0.30)/0.70) × macroAdjustment — the pillar fields
// are mandatory in every cached AlgorithmScore, so this needs no migration.

"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ScoreRing from "./ScoreRing";

/** Read the blend weight once per mount; 0.4 until settings arrive. */
export function useTechnicalWeight(): number | null {
    const [w, setW] = useState<number | null>(null);
    useEffect(() => {
        let active = true;
        fetch("/api/settings")
            .then((r) => (r.ok ? r.json() : null))
            .then((s: { scoring?: { technicalWeight?: number } } | null) => {
                if (!active) return;
                const raw = Number(s?.scoring?.technicalWeight);
                setW(isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.4);
            })
            .catch(() => { if (active) setW(0.4); });
        return () => { active = false; };
    }, []);
    return w;
}

export function blendGlobal(fundamental: number, technical: number, weight: number): number {
    return Math.round(fundamental * (1 - weight) + technical * weight);
}

/**
 * Small ring for the detail header, next to the (dominant) fundamental ring.
 * Renders nothing while settings load, when the blend is disabled (w=0), or
 * when either score is missing.
 */
export function GlobalScoreRing({ fundamental, technical }: {
    fundamental: number;
    technical: number | null;
}) {
    const t = useTranslations("technical");
    const w = useTechnicalWeight();
    if (w === null || w === 0 || technical === null) return null;
    const global = blendGlobal(fundamental, technical, w);
    return (
        <div className="flex flex-col items-center gap-0.5" title={t("globalTip", { w: Math.round(w * 100) })}>
            <ScoreRing score={global} size={36} strokeWidth={3} />
            <span className="text-[8px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>
                {t("globalLabel")}
            </span>
        </div>
    );
}

/**
 * The visible arithmetic — same discipline as ScoreArithmetic: the number
 * must be checkable, never an unexplained headline.
 */
export function GlobalScoreArithmetic({ fundamental, technical }: {
    fundamental: number;
    technical: number;
}) {
    const t = useTranslations("technical");
    const w = useTechnicalWeight();
    if (w === null || w === 0) return null;
    const global = blendGlobal(fundamental, technical, w);
    const pct = (x: number) => x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return (
        <div
            className="flex items-center justify-between pt-2 mt-1 cursor-help"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
            title={t("globalTip", { w: Math.round(w * 100) })}
        >
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("globalLabel")}
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                {fundamental} × {pct(1 - w)} + {technical} × {pct(w)} ={" "}
                <strong style={{ color: "var(--accent-cyan)" }}>{global}</strong>
            </span>
        </div>
    );
}
