// ============================================================
// ReinforcementBadge — turns the AI's qualitative score into a
// reinforce (▲ green) / weaken (▼ red) signal on the main score.
// ============================================================
// The app has ONE primary score: the quantitative/heuristic algorithm.
// The AI layer doesn't produce a competing number — it nudges that score
// up or down. This badge renders that nudge as 1-3 arrows.

"use client";

import React from "react";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

/** Map a 0-100 qualitative score to a -3…+3 reinforcement level. */
export function reinforcementLevel(q: number): number {
    if (q >= 80) return 3;
    if (q >= 65) return 2;
    if (q >= 55) return 1;
    if (q > 45) return 0;
    if (q > 35) return -1;
    if (q > 20) return -2;
    return -3;
}

export default function ReinforcementBadge({ score }: { score: number }) {
    const t = useTranslations("aiAnalysis");
    const level = reinforcementLevel(score);
    const n = Math.abs(level);
    const color = level > 0 ? "var(--signal-strong-buy)" : level < 0 ? "var(--signal-avoid)" : "var(--text-muted)";
    const label = level > 0 ? t("aiReinforces") : level < 0 ? t("aiWeakens") : t("aiNeutralScore");
    const Arrow = level > 0 ? ChevronUp : ChevronDown;

    return (
        <div className="flex flex-col items-center gap-0.5 w-16" title={t("scoreClarify")}>
            <div className="flex flex-col items-center -space-y-2.5">
                {level === 0
                    ? <Minus size={20} style={{ color }} />
                    : Array.from({ length: n }).map((_, i) => (
                        <Arrow key={i} size={20} strokeWidth={3} style={{ color }} />
                    ))}
            </div>
            <span className="text-[8px] uppercase tracking-widest text-center leading-tight font-semibold" style={{ color }}>
                {label}
            </span>
        </div>
    );
}
