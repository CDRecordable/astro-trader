// ============================================================
// EtfAiSection — qualitative ETF layer powered by the user's LLM
// ============================================================
// Thesis of the exposure (economy/sector/theme), what you actually own,
// risks (valuation, concentration, currency), UCITS alternatives and the
// portfolio role. No price talk. Cached on disk per symbol.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sparkles, RefreshCw, AlertTriangle, Loader2, Landmark, PackageOpen, Puzzle, Activity, Newspaper, Repeat } from "lucide-react";
import type { EtfQualitative } from "@/lib/api/llm-client";
import type { EtfFundamentals } from "@/lib/etf-fundamentals";
import type { NewsItem } from "@/lib/api/news-client";
import AiLoadingBar from "./AiLoadingBar";
import ReinforcementBadge from "./ReinforcementBadge";

interface CachedEtfAnalysis {
    id: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: EtfQualitative;
    news?: NewsItem[];
}

const SEVERITY_COLOR: Record<string, string> = { alto: "var(--signal-avoid)", medio: "var(--signal-hold)", bajo: "var(--text-muted)" };

function fmt(v: number | null, suffix = "", digits = 1): string {
    return v === null || !isFinite(v) ? "N/D" : `${v.toFixed(digits)}${suffix}`;
}

/** Build the grounding summary the model is told NOT to repeat. */
function buildQuantSummary(f: EtfFundamentals): string {
    const aum = f.totalAssets !== null ? `${(f.totalAssets / 1e9).toFixed(1)}B` : "N/D";
    const top = f.topHoldings.slice(0, 5).map((h) => `${h.name} ${h.pct.toFixed(1)}%`).join(", ") || "N/D";
    const sectors = f.sectorWeights.slice(0, 4).map((s) => `${s.sector} ${s.pct.toFixed(0)}%`).join(", ") || "N/D";
    return [
        `Vehículo: TER ${f.ter !== null ? (f.ter * 100).toFixed(2) + "%" : "N/D"} · AUM ${aum} · antigüedad ${fmt(f.ageYears, " años")} · ${f.accumulating === null ? "" : f.accumulating ? "acumulación" : "distribución"}`,
        `Cartera: top-10 = ${fmt(f.top10Pct, "%")} del fondo · P/E subyacente ${fmt(f.underlyingPE, "", 1)} · P/B ${fmt(f.underlyingPB, "", 1)} · yield ${f.dividendYield !== null ? (f.dividendYield * 100).toFixed(1) + "%" : "N/D"}`,
        `Top posiciones: ${top}`,
        `Sectores: ${sectors}`,
        `Momentum: vs SMA200 ${fmt(f.vsSma200Pct, "%")} · 12m ${fmt(f.ret12mPct, "%")} · vol anual ${fmt(f.volAnnPct, "%")} · drawdown ${fmt(f.drawdownPct, "%")}`,
        f.proxySymbol ? `(Datos de cartera enriquecidos desde el equivalente US ${f.proxySymbol}.)` : "",
    ].filter(Boolean).join("\n");
}

export default function EtfAiSection({ fundamentals, onResult }: {
    fundamentals: EtfFundamentals;
    onResult?: (a: EtfQualitative | null) => void;
}) {
    const t = useTranslations("aiAnalysis");
    const id = fundamentals.symbol.toLowerCase();
    const [data, setData] = useState<CachedEtfAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<{ code: string; message: string } | null>(null);

    useEffect(() => {
        let active = true;
        fetch(`/api/etf-analysis/${encodeURIComponent(id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (active && d) setData(d as CachedEtfAnalysis); })
            .catch(() => { });
        return () => { active = false; };
    }, [id]);

    useEffect(() => { onResult?.(data?.analysis ?? null); }, [data, onResult]);

    const generate = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/etf-analysis/${encodeURIComponent(id)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fundamentals.name,
                    index: fundamentals.index ?? fundamentals.yahooCategory ?? "",
                    category: fundamentals.category ?? "",
                    // Search news for the exposure, not the fund wrapper.
                    newsQuery: fundamentals.region ?? fundamentals.index ?? fundamentals.name,
                    quantSummary: buildQuantSummary(fundamentals),
                }),
            });
            const d = await res.json();
            if (!res.ok) setErr({ code: d.error ?? "error", message: d.message ?? "Error" });
            else setData(d as CachedEtfAnalysis);
        } catch (e) {
            setErr({ code: "network", message: e instanceof Error ? e.message : "Error de red" });
        } finally {
            setLoading(false);
        }
    }, [id, fundamentals]);

    const a = data?.analysis;
    const scoreColor = a
        ? a.qualitativeScore >= 65 ? "var(--signal-strong-buy)" : a.qualitativeScore >= 45 ? "var(--signal-hold)" : "var(--signal-avoid)"
        : "var(--text-muted)";
    const narrColor = a
        ? a.narrativeScore >= 65 ? "var(--signal-strong-buy)" : a.narrativeScore >= 45 ? "var(--signal-hold)" : "var(--signal-avoid)"
        : "var(--text-muted)";

    return (
        <section className="glass-card p-4 flex-1 min-w-0">
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

            {err?.code === "no_api_key" && (
                <div className="px-3 py-2.5 rounded-lg text-[11px]" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", color: "var(--signal-hold)" }}>
                    {t("noKey")}{" "}
                    <Link href="/settings" className="underline font-semibold" style={{ color: "var(--accent-cyan)" }}>{t("goToSettings")}</Link>
                </div>
            )}
            {err && err.code !== "no_api_key" && (
                <div className="px-3 py-2.5 rounded-lg text-[11px]" style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.15)", color: "var(--signal-avoid)" }}>
                    ⚠ {err.message}
                </div>
            )}

            {loading && (
                <AiLoadingBar steps={[t("aiLoadNews"), t("aiLoadEtfMetrics"), t("aiLoadModel"), t("aiLoadEtfSynth"), t("aiLoadVerify")]} />
            )}

            {!data && !err && !loading && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("emptyHintEtf")}</p>
            )}

            {a && !loading && (
                <div className="space-y-4">
                    {/* Summary + reinforcement on the main score */}
                    <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center shrink-0 gap-1.5">
                            <ReinforcementBadge score={a.qualitativeScore} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.summary}</p>
                            <p className="text-[10px] italic mt-1.5" style={{ color: "var(--text-muted)" }}>{t("scoreClarify")}</p>
                        </div>
                    </div>

                    {/* Narrative (baseline → recent), grounded on news */}
                    {(a.narrativeShift || a.baselineNarrative?.length || a.recentNarrative?.length) && (
                        <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-violet)" }}>
                                    <Activity size={11} /> {t("narrativeTitle")}
                                </p>
                                {a.narrativeShift && (
                                    <span className="text-[10px] font-mono font-bold" style={{ color: narrColor }}>
                                        {a.narrativeShift.from} → {a.narrativeShift.to}
                                        <span className="ml-1.5" style={{ color: "var(--text-muted)" }}>· {a.narrativeScore}/100</span>
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {a.baselineNarrative?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("baselineNarrative")}</p>
                                        <ul className="space-y-1">
                                            {a.baselineNarrative.map((b, i) => (
                                                <li key={i} className="text-[11px] flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                                    <span style={{ color: "var(--text-muted)" }}>›</span>{b}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {a.recentNarrative?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--accent-cyan)" }}>{t("recentNarrative")}</p>
                                        <ul className="space-y-1">
                                            {a.recentNarrative.map((r, i) => (
                                                <li key={i} className="text-[11px] flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                                    <span style={{ color: "var(--accent-cyan)" }}>›</span>{r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Exposure thesis */}
                    {a.thesis && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-cyan)" }}>
                                <Landmark size={11} /> {t("etfThesis")}
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.thesis}</p>
                        </div>
                    )}

                    {/* What you actually own */}
                    {a.whatYouOwn && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-emerald)" }}>
                                <PackageOpen size={11} /> {t("etfWhatYouOwn")}
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.whatYouOwn}</p>
                        </div>
                    )}

                    {/* Risks + alternatives */}
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
                        {a.alternatives.length > 0 && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-amber)" }}>
                                    <Repeat size={11} /> {t("etfAlternatives")}
                                </p>
                                <ul className="space-y-1">
                                    {a.alternatives.map((c, i) => (
                                        <li key={i} className="text-[11px] flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                            <span style={{ color: "var(--accent-amber)" }}>›</span>{c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Portfolio fit */}
                    {a.fitProfile && (
                        <div className="px-3 py-2 rounded-lg text-[11px] flex items-start gap-2" style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.14)", color: "var(--text-secondary)" }}>
                            <Puzzle size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent-violet)" }} />
                            <span><strong style={{ color: "var(--accent-violet)" }}>{t("etfFit")}:</strong> {a.fitProfile}</span>
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

                    {/* Source news headlines */}
                    {data?.news && data.news.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                                <Newspaper size={11} /> {t("newsTitle")}
                            </p>
                            <ul className="space-y-1">
                                {data.news.slice(0, 6).map((n, i) => (
                                    <li key={i} className="text-[11px] flex items-start gap-1.5">
                                        <span className="text-[9px] font-mono shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{n.date}</span>
                                        {n.link ? (
                                            <a href={n.link} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--text-secondary)" }}>
                                                {n.title}{n.publisher && <span style={{ color: "var(--text-muted)" }}> · {n.publisher}</span>}
                                            </a>
                                        ) : (
                                            <span style={{ color: "var(--text-secondary)" }}>{n.title}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className="text-[9px] italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {t("generatedWith", { model: data!.model, date: new Date(data!.generatedAt).toLocaleDateString("es-ES") })} · {t("disclaimerEtf")}
                    </p>
                </div>
            )}
        </section>
    );
}
