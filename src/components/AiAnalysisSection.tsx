// ============================================================
// AiAnalysisSection — qualitative layer powered by the user's LLM
// ============================================================
// Catalysts (incl. FDA/EMA pipeline for pharma), governance risks,
// moat and a 0-100 qualitative score. Cached on disk per ticker.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sparkles, RefreshCw, AlertTriangle, Loader2, Shield, FlaskConical, Landmark, Calendar } from "lucide-react";
import type { QualitativeAnalysis } from "@/lib/api/llm-client";

interface CachedAnalysis {
    ticker: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: QualitativeAnalysis;
}

const IMPACT_COLOR: Record<string, string> = { alto: "var(--signal-strong-buy)", medio: "var(--signal-hold)", bajo: "var(--text-muted)" };
const SEVERITY_COLOR: Record<string, string> = { alto: "var(--signal-avoid)", medio: "var(--signal-hold)", bajo: "var(--text-muted)" };

export default function AiAnalysisSection({ ticker }: { ticker: string }) {
    const t = useTranslations("aiAnalysis");
    const [data, setData] = useState<CachedAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<{ code: string; message: string } | null>(null);

    // Load cached analysis on mount
    useEffect(() => {
        let active = true;
        fetch(`/api/ai-analysis/${encodeURIComponent(ticker)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (active && d) setData(d as CachedAnalysis); })
            .catch(() => { });
        return () => { active = false; };
    }, [ticker]);

    const generate = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/ai-analysis/${encodeURIComponent(ticker)}`, { method: "POST" });
            const d = await res.json();
            if (!res.ok) {
                setErr({ code: d.error ?? "error", message: d.message ?? "Error" });
            } else {
                setData(d as CachedAnalysis);
            }
        } catch (e) {
            setErr({ code: "network", message: e instanceof Error ? e.message : "Error de red" });
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    const a = data?.analysis;
    const scoreColor = a
        ? a.qualitativeScore >= 65 ? "var(--signal-strong-buy)" : a.qualitativeScore >= 45 ? "var(--signal-hold)" : "var(--signal-avoid)"
        : "var(--text-muted)";

    return (
        <section className="glass-card p-4 flex-1 min-w-0">
            {/* Header with generate button */}
            <div className="flex items-center justify-between mb-3 mt-2">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: "var(--accent-violet)" }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                        {t("title")}
                    </h3>
                </div>
                <button
                    onClick={generate}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, var(--accent-violet-dim), var(--accent-cyan-dim))", color: "white" }}
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : data ? <RefreshCw size={12} /> : <Sparkles size={12} />}
                    {loading ? t("generating") : data ? t("regenerate") : t("generate")}
                </button>
            </div>

            {/* No key configured */}
            {err?.code === "no_api_key" && (
                <div className="px-3 py-2.5 rounded-lg text-[11px]" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", color: "var(--signal-hold)" }}>
                    {t("noKey")}{" "}
                    <Link href="/settings" className="underline font-semibold" style={{ color: "var(--accent-cyan)" }}>
                        {t("goToSettings")}
                    </Link>
                </div>
            )}
            {err && err.code !== "no_api_key" && (
                <div className="px-3 py-2.5 rounded-lg text-[11px]" style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.15)", color: "var(--signal-avoid)" }}>
                    ⚠ {err.message}
                </div>
            )}

            {/* Empty state */}
            {!data && !err && !loading && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("emptyHint")}</p>
            )}

            {/* Rendered analysis */}
            {a && (
                <div className="space-y-4">
                    {/* Summary + qualitative score */}
                    <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center shrink-0">
                            <span className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>{a.qualitativeScore}</span>
                            <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{t("qualScore")}</span>
                            <span className="text-[9px] mt-1 px-1.5 py-0.5 rounded" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                                {t("moat")}: {a.moat}
                            </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.summary}</p>
                    </div>

                    {/* Catalysts */}
                    {a.catalysts.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-cyan)" }}>
                                <Calendar size={11} /> {t("catalysts")}
                            </p>
                            <div className="space-y-1.5">
                                {a.catalysts.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: IMPACT_COLOR[c.impact] ?? "var(--text-muted)" }} />
                                        <span className="flex-1" style={{ color: "var(--text-secondary)" }}>
                                            {c.title}{c.verify && <span className="italic" style={{ color: "var(--signal-hold)" }}> · {t("verify")}</span>}
                                        </span>
                                        <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--text-muted)" }}>{c.timeframe}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{c.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pharma pipeline */}
                    {a.pharmaPipeline && a.pharmaPipeline.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-emerald)" }}>
                                <FlaskConical size={11} /> {t("pipeline")}
                            </p>
                            <div className="space-y-1.5">
                                {a.pharmaPipeline.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.10)" }}>
                                        <span className="font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>{p.asset}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--bg-tertiary)", color: "var(--accent-emerald)" }}>{p.stage}</span>
                                        {p.note && <span className="flex-1 truncate" style={{ color: "var(--text-muted)" }}>{p.note}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Risks + governance */}
                    {(a.risks.length > 0 || a.governanceFlags.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {a.risks.length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--signal-avoid)" }}>
                                        <AlertTriangle size={11} /> {t("risks")}
                                    </p>
                                    <ul className="space-y-1">
                                        {a.risks.map((r, i) => (
                                            <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                                <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: SEVERITY_COLOR[r.severity] ?? "var(--text-muted)" }} />
                                                {r.title}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {a.governanceFlags.length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--signal-hold)" }}>
                                        <Landmark size={11} /> {t("governance")}
                                    </p>
                                    <ul className="space-y-1">
                                        {a.governanceFlags.map((g, i) => (
                                            <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                                <Shield size={10} className="mt-0.5 shrink-0" style={{ color: "var(--signal-hold)" }} />
                                                {g}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Verdict */}
                    <div className="px-3 py-2.5 rounded-lg text-[11px] leading-relaxed" style={{
                        background: a.qualitativeScore >= 65 ? "rgba(52,211,153,0.05)" : a.qualitativeScore >= 45 ? "rgba(251,191,36,0.05)" : "rgba(251,113,133,0.05)",
                        border: `1px solid ${a.qualitativeScore >= 65 ? "rgba(52,211,153,0.12)" : a.qualitativeScore >= 45 ? "rgba(251,191,36,0.12)" : "rgba(251,113,133,0.12)"}`,
                        color: "var(--text-secondary)",
                    }}>
                        <strong style={{ color: scoreColor }}>{t("verdict")}:</strong> {a.verdict}
                    </div>

                    {/* Provenance + disclaimer */}
                    <p className="text-[9px] italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {t("generatedWith", { model: data!.model, date: new Date(data!.generatedAt).toLocaleDateString("es-ES") })} · {t("disclaimer")}
                    </p>
                </div>
            )}
        </section>
    );
}
