// ============================================================
// EconomyView — country macro dashboard (SERIOUS mode)
// ============================================================
// The layer ABOVE the stock: classic top-down read of a country's
// economy. Each indicator is bucketed (low/normal/high), translated
// into an economic reading (weak/OK/strong · inflation low/target/high)
// and into the central-bank stance it implies (expansionary/neutral/
// contractionary). An aggregate dial sums it into "what does this
// mean for the index/stocks I'm hunting".

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    Landmark, Briefcase, Flame, Factory, Loader2, AlertTriangle,
    TrendingUp, TrendingDown, Minus, HelpCircle, Scale,
} from "lucide-react";
import {
    COUNTRIES, readIndicator, aggregateCountry,
    type CountryId, type IndicatorDef, type Band, type Stance, type EconRead,
} from "@/lib/econ-indicators";
import type { EconIndicatorPayload } from "@/app/api/econ/route";

// ── Formatting ────────────────────────────────────────────────

function fmtValue(def: IndicatorDef, v: number): string {
    switch (def.unit) {
        case "percent": return `${v.toFixed(def.decimals)}%`;
        case "thousands": {
            // ICSA comes in persons (215 000), payroll deltas in thousands (+29).
            const k = Math.abs(v) >= 10_000 ? v / 1000 : v;
            return `${k >= 0 ? "" : "−"}${Math.abs(k).toFixed(0)}k`;
        }
        default: return v.toFixed(def.decimals);
    }
}

/** Period label: monthly "2026-06-01"/"2026-06" → "2026-06"; weekly stays full. */
function fmtDate(d: string): string {
    return /^\d{4}-\d{2}-01$/.test(d) ? d.slice(0, 7) : d;
}

const STANCE_COLOR: Record<Stance, string> = {
    expansionary: "var(--signal-strong-buy)",   // cuts/QE → liquidity tailwind
    neutral: "var(--signal-hold)",
    contractionary: "var(--signal-avoid)",      // hikes/QT → headwind
};

const READ_COLOR: Record<EconRead, string> = {
    strong: "var(--signal-strong-buy)",
    ok: "var(--accent-cyan)",
    weak: "var(--signal-avoid)",
};

/** Inflation bands read differently: on-target is the good state. */
const INFLATION_BAND_COLOR: Record<Band, string> = {
    low: "var(--accent-cyan)",
    normal: "var(--signal-strong-buy)",
    high: "var(--signal-avoid)",
};

// ── Small local widgets ───────────────────────────────────────

function Tip({ children, content }: { children: React.ReactNode; content: string }) {
    return (
        <div className="group relative flex items-center">
            {children}
            <div className="absolute bottom-full left-0 mb-2 w-max max-w-xs p-2.5 bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-left">
                {content}
            </div>
        </div>
    );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
    if (points.length < 2) return null;
    const w = 84, h = 24, pad = 2;
    const min = Math.min(...points), max = Math.max(...points);
    const span = max - min || 1;
    const xy = points.map((v, i) => {
        const x = pad + (i / (points.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / span) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const [lx, ly] = xy[xy.length - 1].split(",");
    return (
        <svg width={w} height={h} className="shrink-0 opacity-80">
            <polyline points={xy.join(" ")} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <circle cx={lx} cy={ly} r="2.2" fill={color} />
        </svg>
    );
}

// ── Component ─────────────────────────────────────────────────

const CATEGORY_META = [
    { id: "jobs", icon: Briefcase, color: "var(--accent-cyan)" },
    { id: "inflation", icon: Flame, color: "var(--accent-amber)" },
    { id: "activity", icon: Factory, color: "var(--accent-violet)" },
] as const;

export default function EconomyView() {
    const t = useTranslations("economy");

    const [country, setCountry] = useState<CountryId>("us");
    const [data, setData] = useState<Partial<Record<CountryId, EconIndicatorPayload[]>>>({});
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Fetch once per country, keep previously loaded countries cached.
    useEffect(() => {
        if (data[country]) return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset spinner when switching country
        setLoading(true);
        setErr(null);
        fetch(`/api/econ?country=${country}`)
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((d: { indicators: EconIndicatorPayload[] }) => {
                if (active) setData((prev) => ({ ...prev, [country]: d.indicators }));
            })
            .catch((e) => { if (active) setErr(e instanceof Error ? e.message : "Error"); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [country, data]);

    const defs = COUNTRIES[country].indicators;
    const payload = data[country];
    const byKey = useMemo(() => new Map((payload ?? []).map((p) => [p.key, p])), [payload]);

    // Classify every loaded indicator + build the aggregate dial.
    const readings = useMemo(() =>
        defs.flatMap((d) => {
            const p = byKey.get(d.key);
            return p ? [readIndicator(d, p.value)] : [];
        }), [defs, byKey]);
    const agg = useMemo(() => aggregateCountry(readings, defs), [readings, defs]);
    const readingByKey = useMemo(() => new Map(readings.map((r) => [r.key, r])), [readings]);

    const policyDef = defs.find((d) => d.category === "policy");
    const policyPayload = policyDef ? byKey.get(policyDef.key) : undefined;

    /** Dynamic band line for the tooltip (bands differ per country). */
    const bandLine = (def: IndicatorDef): string => {
        if (!def.bands) return "";
        const lo = fmtValue(def, def.bands.lo);
        const hi = fmtValue(def, def.bands.hi);
        return t("bandThresholds", { lo, hi });
    };

    const bandLabel = (def: IndicatorDef, band: Band, read: EconRead | null): string => {
        if (def.category === "inflation") return t(`inflationBand.${band}`);
        return read ? t(`econRead.${read}`) : "";
    };
    const bandColor = (def: IndicatorDef, band: Band, read: EconRead | null): string => {
        if (def.category === "inflation") return INFLATION_BAND_COLOR[band];
        return read ? READ_COLOR[read] : "var(--text-muted)";
    };

    return (
        <div className="min-h-screen p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--accent-emerald, #34d399), var(--accent-cyan))" }}>
                    <Landmark size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
                </div>
            </div>

            {/* Country tabs */}
            <div className="flex items-center gap-2 mb-6">
                {(Object.keys(COUNTRIES) as CountryId[]).map((id) => (
                    <button key={id} onClick={() => setCountry(id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                        style={{
                            background: country === id ? "var(--accent-cyan-dim)" : "var(--bg-tertiary)",
                            color: country === id ? "white" : "var(--text-muted)",
                            border: "1px solid var(--border-subtle)",
                        }}>
                        <span>{COUNTRIES[id].flag}</span> {t(`country.${id}`)}
                    </button>
                ))}
            </div>

            {loading && !payload && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("loading")}</p>
                </div>
            )}

            {err && !payload && (
                <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.2)", color: "var(--signal-avoid)" }}>
                    <AlertTriangle size={14} /> {t("error")}
                </div>
            )}

            {payload && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    {/* ── Aggregate dial ── */}
                    {agg && (
                        <div className="glass-card p-4 mb-5">
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{t("aggEconomy")}</p>
                                    <p className="text-base font-bold" style={{ color: READ_COLOR[agg.economy] }}>{t(`econRead.${agg.economy}`)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{t("aggBias")}</p>
                                    <p className="text-base font-bold flex items-center gap-1.5" style={{ color: STANCE_COLOR[agg.bias] }}>
                                        <Scale size={15} /> {t(`stance.${agg.bias}`)}
                                    </p>
                                </div>
                                {policyDef && policyPayload && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{t("ind.policyRate")}</p>
                                        <p className="text-base font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                                            {fmtValue(policyDef, policyPayload.value)}
                                            <span className="text-[10px] font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>{fmtDate(policyPayload.date)}</span>
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {(["expansionary", "neutral", "contractionary"] as const).map((s) => (
                                        <span key={s} className="px-1.5 py-0.5 rounded" style={{ background: `${"var(--bg-tertiary)"}`, border: "1px solid var(--border-subtle)" }}>
                                            <strong style={{ color: STANCE_COLOR[s] }}>{agg.counts[s]}</strong> {t(`stance.${s}`)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] leading-relaxed mt-3 pt-3" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-subtle)" }}>
                                {t(`readEquity.${agg.economy}`)} {t(`biasEquity.${agg.bias}`)}
                            </p>
                        </div>
                    )}

                    {/* ── Category cards ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                        {CATEGORY_META.map(({ id, icon: Icon, color }) => {
                            const catDefs = defs.filter((d) => d.category === id);
                            if (catDefs.length === 0) return null;
                            return (
                                <section key={id} className="glass-card p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon size={14} style={{ color }} />
                                        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                            {t(`category.${id}`)}
                                        </h3>
                                    </div>
                                    {catDefs.map((def) => {
                                        const p = byKey.get(def.key);
                                        const r = readingByKey.get(def.key);
                                        const trend = p && p.prev !== null ? Math.sign(p.value - p.prev) : 0;
                                        return (
                                            <div key={def.key} className="py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <Tip content={`${t(`ind.${def.key}Tip`)} ${bandLine(def)}`}>
                                                        <span className="text-xs flex items-center gap-1 cursor-help border-b border-dashed border-zinc-600 pb-0.5" style={{ color: "var(--text-muted)" }}>
                                                            {t(`ind.${def.key}`)}
                                                            <HelpCircle size={11} className="opacity-50" />
                                                        </span>
                                                    </Tip>
                                                    <div className="flex items-center gap-2">
                                                        {p && <Sparkline points={p.history.map((h) => h.value)} color={r?.band ? bandColor(def, r.band, r.read) : "var(--text-muted)"} />}
                                                        <span className="text-sm font-mono font-bold flex items-center gap-1" style={{ color: r?.band ? bandColor(def, r.band, r.read) : "var(--text-muted)" }}>
                                                            {p ? fmtValue(def, p.value) : "N/D"}
                                                            {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} className="opacity-40" />}
                                                        </span>
                                                    </div>
                                                </div>
                                                {p && r?.band && (
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{fmtDate(p.date)}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                                                style={{ background: `color-mix(in srgb, ${bandColor(def, r.band, r.read)} 12%, transparent)`, color: bandColor(def, r.band, r.read) }}>
                                                                {bandLabel(def, r.band, r.read)}
                                                            </span>
                                                            {r.stance && (
                                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                                                    style={{ background: `color-mix(in srgb, ${STANCE_COLOR[r.stance]} 12%, transparent)`, color: STANCE_COLOR[r.stance] }}>
                                                                    {t(`stance.${r.stance}`)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>
                            );
                        })}
                    </div>

                    {/* ── Legend ── */}
                    <div className="mt-5 px-4 py-3 rounded-xl text-[10px] leading-relaxed"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <strong style={{ color: "var(--text-secondary)" }}>{t("legendTitle")}</strong>{" "}
                        <span style={{ color: STANCE_COLOR.expansionary }}>{t("stance.expansionary")}</span>: {t("legendExpansionary")} ·{" "}
                        <span style={{ color: STANCE_COLOR.neutral }}>{t("stance.neutral")}</span>: {t("legendNeutral")} ·{" "}
                        <span style={{ color: STANCE_COLOR.contractionary }}>{t("stance.contractionary")}</span>: {t("legendContractionary")}
                        <br />{t("legendSources")}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
