// ============================================================
// CryptoAiSection — qualitative crypto layer powered by the user's LLM
// ============================================================
// Tech explained plainly, real use case, practical roadmap, risks
// (unlocks/centralization/governance), moat & competitors. No price talk.
// Grounded on the quantitative pillars; cached on disk per coin id.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sparkles, RefreshCw, AlertTriangle, Loader2, Cpu, Target, Calendar, Swords, Activity, Newspaper } from "lucide-react";
import type { CryptoQualitative } from "@/lib/api/llm-client";
import type { CryptoFundamentals } from "@/lib/crypto-fundamentals";
import type { NewsItem } from "@/lib/api/news-client";

interface CachedCryptoAnalysis {
    id: string;
    generatedAt: string;
    provider: string;
    model: string;
    analysis: CryptoQualitative;
    news?: NewsItem[];
}

const IMPACT_COLOR: Record<string, string> = { alto: "var(--signal-strong-buy)", medio: "var(--signal-hold)", bajo: "var(--text-muted)" };
const SEVERITY_COLOR: Record<string, string> = { alto: "var(--signal-avoid)", medio: "var(--signal-hold)", bajo: "var(--text-muted)" };

// Compact USD formatter for the grounding summary
function usd(v: number | null): string {
    if (v === null || !isFinite(v)) return "N/D";
    const a = Math.abs(v);
    if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
}
function pct(v: number | null): string {
    return v === null || !isFinite(v) ? "N/D" : `${v.toFixed(1)}%`;
}

/** Build the grounding summary the model is told NOT to repeat. */
function buildQuantSummary(f: CryptoFundamentals): string {
    const supplyPct = f.circulatingSupply && f.maxSupply ? `${((f.circulatingSupply / f.maxSupply) * 100).toFixed(0)}%` : "N/D";
    const fdvMc = f.fdv && f.marketCap ? (f.fdv / f.marketCap).toFixed(2) : "N/D";
    const cats = f.catalysts.length
        ? f.catalysts.map((c) => `${c.title}${c.daysUntil !== null ? ` (${c.daysUntil}d)` : ""}`).join("; ")
        : "N/D";
    const net = f.networkStats;
    const netLine = net
        ? `Red on-chain: TPS ~${net.tpsEstimate?.toFixed(1) ?? "N/D"} · supply circulante ${net.circulatingSupply ? (net.circulatingSupply / 1e9).toFixed(1) + "B" : "N/D"} · tx top: ${net.txTypeBreakdown.map((x) => x.name).slice(0, 3).join(", ") || "N/D"}`
        : null;
    return [
        `Market cap ${usd(f.marketCap)} · Vol 24h ${usd(f.volume24h)} · Precio $${f.price}`,
        ...(netLine ? [netLine] : []),
        `Tokenomics: circulante/máx ${supplyPct} · FDV/MC ${fdvMc} · P/S ${f.psRatio?.toFixed(1) ?? "N/D"} · MC/TVL ${f.mcapToTvl?.toFixed(2) ?? "N/D"} · TVL ${usd(f.tvl)} · ingresos anuales ${usd(f.annualizedFees)}`,
        `Red: commits 4w ${f.devCommits4w ?? "N/D"} · contribuidores ${f.devContributors ?? "N/D"} · holders ${f.holderCount ?? "N/D"} · top-10 ${pct(f.top10ConcentrationPct)} · ballenas Δ30d ${pct(f.whaleAccumulationPct)}`,
        `Momentum: desde ATH ${pct(f.athChangePct)} · 30d ${pct(f.change30d)} · 1y ${pct(f.change1y)}`,
        `Catalizadores on-chain: ${cats}`,
        `Fear&Greed: ${f.fearGreed ?? "N/D"}${f.fearGreedLabel ? ` (${f.fearGreedLabel})` : ""}`,
    ].join("\n");
}

export default function CryptoAiSection({ fundamentals, description }: {
    fundamentals: CryptoFundamentals;
    description: string;
}) {
    const t = useTranslations("aiAnalysis");
    const id = fundamentals.id;
    const [data, setData] = useState<CachedCryptoAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<{ code: string; message: string } | null>(null);

    useEffect(() => {
        let active = true;
        fetch(`/api/crypto-analysis/${encodeURIComponent(id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (active && d) setData(d as CachedCryptoAnalysis); })
            .catch(() => { });
        return () => { active = false; };
    }, [id]);

    const generate = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/crypto-analysis/${encodeURIComponent(id)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fundamentals.name,
                    symbol: fundamentals.symbol,
                    categories: "",
                    description,
                    quantSummary: buildQuantSummary(fundamentals),
                }),
            });
            const d = await res.json();
            if (!res.ok) setErr({ code: d.error ?? "error", message: d.message ?? "Error" });
            else setData(d as CachedCryptoAnalysis);
        } catch (e) {
            setErr({ code: "network", message: e instanceof Error ? e.message : "Error de red" });
        } finally {
            setLoading(false);
        }
    }, [id, fundamentals, description]);

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

            {!data && !err && !loading && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("emptyHintCrypto")}</p>
            )}

            {a && (
                <div className="space-y-4">
                    {/* Summary + score */}
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

                    {/* Tech explanation */}
                    {a.techExplanation && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-cyan)" }}>
                                <Cpu size={11} /> {t("cryptoTech")}
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.techExplanation}</p>
                        </div>
                    )}

                    {/* Use case */}
                    {a.useCase && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-emerald)" }}>
                                <Target size={11} /> {t("cryptoUseCase")}
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.useCase}</p>
                        </div>
                    )}

                    {/* Roadmap */}
                    {a.roadmap.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-cyan)" }}>
                                <Calendar size={11} /> {t("roadmap")}
                            </p>
                            <div className="space-y-1.5">
                                {a.roadmap.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: IMPACT_COLOR[c.impact] ?? "var(--text-muted)" }} />
                                        <span className="flex-1" style={{ color: "var(--text-secondary)" }}>
                                            {c.title}{c.verify && <span className="italic" style={{ color: "var(--signal-hold)" }}> · {t("verify")}</span>}
                                        </span>
                                        <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--text-muted)" }}>{c.timeframe}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Risks + competitors */}
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
                        {a.competitors.length > 0 && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-amber)" }}>
                                    <Swords size={11} /> {t("competitors")}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {a.competitors.map((c, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

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
                        {t("generatedWith", { model: data!.model, date: new Date(data!.generatedAt).toLocaleDateString("es-ES") })} · {t("disclaimerCrypto")}
                    </p>
                </div>
            )}
        </section>
    );
}
