// ============================================================
// TechnicalAiSection — the AI translation of the indicator table
// ============================================================
// Follows the qualitative-section pattern (GET cache → generate → render),
// with two deliberate departures:
//   · AnalysisAge warns at 3 days, not 14 — a chart read is a photograph.
//   · NO ReinforcementBadge: its arrows mean "conviction that reinforces the
//     fundamental score", which is not what a short-horizon chart stance is.
//     A local SignalBadge (alcista/neutral/bajista + horizon reminder) says
//     exactly what this layer is and no more.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import type { TechnicalQualitative } from "@/lib/api/llm-client";
import type { TechnicalScore } from "@/lib/technical-score";
import AiLoadingBar from "./AiLoadingBar";
import { AnalysisAge } from "./ScoreTransparency";

interface CachedTechnicalAnalysis {
    id: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: TechnicalQualitative;
}

const SIGNAL_COLOR: Record<string, string> = {
    alcista: "var(--signal-strong-buy)",
    bajista: "var(--signal-avoid)",
    neutral: "var(--text-muted)",
};

/** The very-simple stance pill: direction + short-horizon disclaimer. */
function SignalBadge({ stance }: { stance: TechnicalQualitative["stance"] }) {
    const t = useTranslations("technicalAi");
    const Icon = stance === "alcista" ? TrendingUp : stance === "bajista" ? TrendingDown : Minus;
    const color = SIGNAL_COLOR[stance];
    return (
        <div className="flex flex-col items-center gap-1 w-20 shrink-0">
            <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
            >
                <Icon size={16} style={{ color }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
                    {t(`stance_${stance}`)}
                </span>
            </div>
            <span className="text-[8px] text-center leading-tight" style={{ color: "var(--text-muted)" }}>
                {t("horizonNote")}
            </span>
        </div>
    );
}

/** Turn the computed score into the grounding text the model receives. */
export function buildTechnicalQuantSummary(score: TechnicalScore, tInd: (id: string) => string): string {
    const lines: string[] = [];
    lines.push(`Score técnico heurístico: ${score.score}/100 (${score.verdict}) · a fecha ${score.asOf}`);
    lines.push(`Pilares — Tendencia ${score.pillars.trend.score} (cobertura ${Math.round(score.pillars.trend.coverage * 100)}%) · Momentum ${score.pillars.momentum.score} (${Math.round(score.pillars.momentum.coverage * 100)}%) · Vol&Volumen ${score.pillars.volatility.score} (${Math.round(score.pillars.volatility.coverage * 100)}%)`);
    lines.push("");
    lines.push("Indicadores:");
    for (const r of score.snapshot.readings) {
        const name = tInd(r.id);
        if (!r.available) {
            lines.push(`- ${name}: N/D (sin datos para este activo)`);
            continue;
        }
        const extras = r.extra
            ? " · " + Object.entries(r.extra).map(([k, v]) => `${k}=${Math.round(v * 100) / 100}`).join(" ")
            : "";
        lines.push(`- ${name}: ${r.value ?? "—"} · señal ${r.signal} (fuerza ${Math.round(r.strength * 100) / 100})${extras}`);
    }
    const { supports, resistances } = score.snapshot.levels;
    const fmt = (xs: number[]) => xs.map((x) => Math.round(x * 100) / 100).join(", ") || "ninguno detectado";
    lines.push("");
    lines.push(`Soportes calculados: ${fmt(supports)}`);
    lines.push(`Resistencias calculadas: ${fmt(resistances)}`);
    const q = score.snapshot.quality;
    lines.push(`Calidad de datos: ${q.candles} velas diarias · OHLC ${q.hasOHLC ? "completo" : "NO disponible (velas sintéticas de cierre)"} · volumen ${q.hasVolume ? "sí" : "no"}`);
    return lines.join("\n");
}

export default function TechnicalAiSection({
    id, type, name, symbol, score,
}: {
    id: string;
    type: "s" | "c" | "e";
    name: string;
    symbol: string;
    score: TechnicalScore;
}) {
    const t = useTranslations("technicalAi");
    const tTech = useTranslations("technical");

    const [data, setData] = useState<CachedTechnicalAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<{ code: string; message: string } | null>(null);

    // Cached analysis on mount (shared between workbench and ficha by id).
    useEffect(() => {
        let active = true;
        setData(null);
        fetch(`/api/technical-analysis/${encodeURIComponent(id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: CachedTechnicalAnalysis | null) => { if (active && d) setData(d); })
            .catch(() => { });
        return () => { active = false; };
    }, [id]);

    const generate = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const quantSummary = buildTechnicalQuantSummary(score, (k) => tTech(`ind_${k}`));
            const res = await fetch(`/api/technical-analysis/${encodeURIComponent(id)}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name, symbol, type, quantSummary }),
            });
            const d = await res.json();
            if (!res.ok) {
                setErr({ code: d.error ?? "error", message: d.message ?? "Error" });
            } else {
                setData(d);
            }
        } catch {
            setErr({ code: "network", message: t("networkError") });
        } finally {
            setLoading(false);
        }
    }, [id, name, symbol, type, score, t, tTech]);

    const a = data?.analysis;

    return (
        <section className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                    <Sparkles size={13} style={{ color: "var(--accent-violet)" }} /> {t("title")}
                </h3>
                {a && !loading && (
                    <button
                        onClick={generate}
                        className="no-print flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                        style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: "var(--accent-violet)" }}
                    >
                        <RefreshCw size={11} /> {t("regenerate")}
                    </button>
                )}
            </div>

            {loading && (
                <AiLoadingBar steps={[t("loadReading"), t("loadContradictions"), t("loadWriting")]} />
            )}

            {err && !loading && (
                // ai-access emits "no_key" (not "no_api_key") — don't propagate that old mismatch.
                <div className="px-3 py-2.5 rounded-lg text-[11px] flex items-start gap-2" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--signal-hold)" }}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>{err.message}</span>
                </div>
            )}

            {!a && !err && !loading && (
                <div className="flex flex-col items-start gap-2.5">
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("emptyHint")}</p>
                    <button
                        onClick={generate}
                        className="no-print px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                        style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", color: "var(--accent-violet)" }}
                    >
                        {t("generate")}
                    </button>
                </div>
            )}

            {a && !loading && (
                <div className="space-y-4">
                    <AnalysisAge generatedAt={data?.generatedAt} staleDays={3} />

                    {/* Stance + summary */}
                    <div className="flex items-start gap-4">
                        <SignalBadge stance={a.stance} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.summary}</p>
                        </div>
                    </div>

                    {/* Simple signals table */}
                    {a.signals.length > 0 && (
                        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                            {a.signals.map((s, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 px-3 py-2"
                                    style={{ borderBottom: i < a.signals.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                                >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SIGNAL_COLOR[s.signal] }} />
                                    <span className="text-[11px] font-semibold w-32 shrink-0" style={{ color: "var(--text-primary)" }}>{s.indicator}</span>
                                    <span className="text-[11px] flex-1 min-w-0" style={{ color: "var(--text-secondary)" }}>{s.reading}</span>
                                    <span className="text-[9px] uppercase tracking-wider shrink-0" style={{ color: SIGNAL_COLOR[s.signal] }}>
                                        {t(`stance_${s.signal}`)} · {s.strength}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Structure */}
                    {a.structure && (
                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            <span className="font-semibold" style={{ color: "var(--accent-cyan)" }}>{t("structure")}: </span>
                            {a.structure}
                        </p>
                    )}

                    {/* Contradictions — honesty first */}
                    {a.contradictions.length > 0 && (
                        <div className="px-3 py-2.5 rounded-lg" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--signal-hold)" }}>
                                {t("contradictions")}
                            </p>
                            <ul className="space-y-1">
                                {a.contradictions.map((c, i) => (
                                    <li key={i} className="text-[11px] leading-relaxed flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                        <span style={{ color: "var(--signal-hold)" }}>⚖</span> {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Verdict */}
                    {a.verdict && (
                        <p
                            className="text-[11px] leading-relaxed px-3 py-2.5 rounded-lg"
                            style={{
                                background: `color-mix(in srgb, ${SIGNAL_COLOR[a.stance]} 5%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${SIGNAL_COLOR[a.stance]} 14%, transparent)`,
                                color: "var(--text-secondary)",
                            }}
                        >
                            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("verdict")}: </span>
                            {a.verdict}
                        </p>
                    )}

                    <p className="text-[9px] italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {t("generatedWith", { model: data!.model, date: new Date(data!.generatedAt).toLocaleDateString("es-ES") })} · {t("disclaimer")}
                    </p>
                </div>
            )}
        </section>
    );
}
