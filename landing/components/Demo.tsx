"use client";

// ============================================================
// Demo — the interactive proof, above the fold
// ============================================================
// Runs on a frozen snapshot captured from the real analyzers: zero API calls,
// so it stays instant and can't be rate-limited no matter the traffic. The
// scores shown are the ones the actual engine produced for these assets.

import React, { useState } from "react";
import { SHOWCASE, metricsFor, RECOMMENDATION_ES, type ShowcaseAsset, type Metric } from "@/lib/showcase";

const KIND_LABEL: Record<string, string> = { stock: "Acción", etf: "ETF", crypto: "Cripto" };
const KIND_TONE: Record<string, string> = { stock: "var(--cyan)", etf: "var(--violet)", crypto: "var(--amber)" };

const TONE_COLOR: Record<Metric["tone"], string> = {
    good: "var(--emerald)",
    warn: "var(--amber)",
    bad: "var(--rose)",
    na: "var(--amber)",
};

function scoreColor(s: number) {
    if (s >= 70) return "var(--emerald)";
    if (s >= 55) return "var(--cyan)";
    if (s >= 40) return "var(--amber)";
    return "var(--rose)";
}

/* ── Score ring ─────────────────────────────────────────────── */
function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
    const r = size / 2 - 9;
    const circ = 2 * Math.PI * r;
    const color = scoreColor(score);
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={7} strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * circ} ${circ}`}
                    style={{ transition: "stroke-dasharray .7s cubic-bezier(.22,1,.36,1), stroke .4s", filter: `drop-shadow(0 0 8px ${color}55)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="mono text-3xl font-bold" style={{ color }}>{score}</span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-mute)" }}>de 100</span>
            </div>
        </div>
    );
}

/* ── Sparkline ──────────────────────────────────────────────── */
function Spark({ points, color }: { points: number[]; color: string }) {
    if (points.length < 2) return null;
    const min = Math.min(...points), max = Math.max(...points);
    const span = max - min || 1;
    const w = 260, h = 44;
    const d = points
        .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * h}`)
        .join(" L");
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
            <path d={`M${d}`} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
            <path d={`M${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.1} />
        </svg>
    );
}

/* ── Pillar bar ─────────────────────────────────────────────── */
function PillarBar({ label, value, weight }: { label: string; value: number; weight: number }) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                    {label} <span className="mono text-[10px]" style={{ color: "var(--text-mute)" }}>{weight}%</span>
                </span>
                <span className="mono text-xs font-bold" style={{ color: scoreColor(value) }}>{value}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                    className="h-full rounded-full"
                    style={{ width: `${value}%`, background: scoreColor(value), transition: "width .7s cubic-bezier(.22,1,.36,1)" }}
                />
            </div>
        </div>
    );
}

/* ── Main ───────────────────────────────────────────────────── */
export default function Demo() {
    const assets = SHOWCASE.assets;
    const [idx, setIdx] = useState(0);
    const [open, setOpen] = useState<number | null>(null);
    const a: ShowcaseAsset = assets[idx];
    const metrics = metricsFor(a);
    const naCount = metrics.filter((m) => m.tone === "na").length;
    const accent = KIND_TONE[a.kind];

    const select = (i: number) => { setIdx(i); setOpen(null); };

    return (
        <section id="demo" className="w-full max-w-5xl mx-auto px-5">
            <div className="glass rounded-3xl overflow-hidden" style={{ borderColor: "var(--border-strong)" }}>

                {/* Tabs */}
                <div className="flex items-stretch border-b" style={{ borderColor: "var(--border)" }}>
                    {assets.map((x, i) => (
                        <button
                            key={x.id}
                            onClick={() => select(i)}
                            aria-pressed={i === idx}
                            className="flex-1 px-4 py-3.5 text-left cursor-pointer transition-colors"
                            style={{
                                background: i === idx ? "rgba(255,255,255,0.035)" : "transparent",
                                borderBottom: i === idx ? `2px solid ${KIND_TONE[x.kind]}` : "2px solid transparent",
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="mono text-sm font-bold" style={{ color: i === idx ? KIND_TONE[x.kind] : "var(--text-soft)" }}>
                                    {x.ticker}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-mute)" }}>
                                    {KIND_LABEL[x.kind]}
                                </span>
                            </div>
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-mute)" }}>{x.name}</p>
                        </button>
                    ))}
                </div>

                <div className="p-5 sm:p-7 grid md:grid-cols-[auto_1fr] gap-7">
                    {/* Score + pillars */}
                    <div className="flex md:flex-col items-center md:items-start gap-5">
                        <div className="flex items-center gap-4">
                            <ScoreRing score={a.score.total} />
                            <div className="md:hidden">
                                <p className="mono text-lg font-bold">{a.price} <span className="text-xs" style={{ color: "var(--text-mute)" }}>{a.currency}</span></p>
                                <p className="text-xs px-2 py-0.5 rounded inline-block mt-1"
                                    style={{ background: `${scoreColor(a.score.total)}1a`, color: scoreColor(a.score.total) }}>
                                    {RECOMMENDATION_ES[a.score.recommendation] ?? a.score.recommendation}
                                </p>
                            </div>
                        </div>
                        <div className="hidden md:block w-full">
                            <p className="mono text-xl font-bold">{a.price} <span className="text-xs" style={{ color: "var(--text-mute)" }}>{a.currency}</span></p>
                            <p className="text-xs px-2 py-0.5 rounded inline-block mt-1.5"
                                style={{ background: `${scoreColor(a.score.total)}1a`, color: scoreColor(a.score.total) }}>
                                {RECOMMENDATION_ES[a.score.recommendation] ?? a.score.recommendation}
                            </p>
                            <div className="mt-4" style={{ color: accent }}>
                                <Spark points={a.spark} color={accent} />
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="min-w-0">
                        <div className="space-y-3.5 mb-6">
                            {a.score.pillars.map((p) => (
                                <PillarBar key={p.key} label={p.label} value={p.value} weight={p.weight} />
                            ))}
                        </div>

                        <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-mute)" }}>
                            Métricas · pulsa para entender cada una
                        </p>
                        <div className="space-y-px">
                            {metrics.map((m, i) => (
                                <div key={i}>
                                    <button
                                        onClick={() => setOpen(open === i ? null : i)}
                                        aria-expanded={open === i}
                                        className="w-full flex items-center justify-between gap-3 py-2 text-left cursor-pointer transition-colors hover:bg-white/[0.03] rounded px-1"
                                        style={{ borderBottom: "1px solid var(--border)" }}
                                    >
                                        <span className="text-xs" style={{ color: open === i ? "var(--text)" : "var(--text-soft)" }}>
                                            {m.label}
                                            {m.tone === "na" && <span className="italic ml-1" style={{ color: "var(--amber)" }}>· sin dato</span>}
                                        </span>
                                        <span className="mono text-xs font-bold shrink-0" style={{ color: TONE_COLOR[m.tone] }}>{m.value}</span>
                                    </button>
                                    {open === i && (
                                        <p className="text-[11px] leading-relaxed px-1 py-2 rise" style={{ color: "var(--text-mute)" }}>
                                            {m.hint}
                                            {m.tone === "na" && (
                                                <span style={{ color: "var(--amber)" }}>
                                                    {" "}Este dato no existe públicamente para {a.ticker}. Otros screeners lo puntúan como
                                                    un cero y hunden la nota; aquí se excluye del cálculo y el pilar se renormaliza sobre
                                                    lo que sí se sabe.
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {naCount > 0 && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.16)" }}>
                                <span className="mono text-xs font-bold shrink-0" style={{ color: "var(--amber)" }}>{naCount} N/D</span>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                                    Falta información y <strong style={{ color: "var(--amber)" }}>se dice</strong>, en vez de
                                    rellenarla con un cero que castigaría injustamente al activo.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer note */}
                <div className="px-5 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-2 border-t"
                    style={{ borderColor: "var(--border)", background: "rgba(0,0,0,0.2)" }}>
                    <p className="text-[10px]" style={{ color: "var(--text-mute)" }}>
                        Análisis real del motor · datos congelados el {SHOWCASE.generatedAt}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-mute)" }}>
                        En la app, en vivo y sobre cualquier activo del mundo
                    </p>
                </div>
            </div>
        </section>
    );
}
