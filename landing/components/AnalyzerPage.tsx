// ============================================================
// AnalyzerPage — shared layout for the three analyzer pages
// ============================================================
// Same skeleton, different substance: keeps /acciones, /cripto and /etfs
// consistent and means a design change lands on all three at once.

import Link from "next/link";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import { FaqJsonLd } from "./Seo";
import { VoxelScene, type Cube } from "./Voxel";

export interface Pillar {
    name: string;
    weight: number;
    detail: string;
}

export interface Signal {
    name: string;
    detail: string;
}

export default function AnalyzerPage({
    eyebrow, title, lead, accent, voxels, pillars, signals, differentiator, faq,
}: {
    eyebrow: string;
    title: React.ReactNode;
    lead: string;
    accent: string;
    voxels: Cube[];
    pillars: Pillar[];
    signals: Signal[];
    differentiator: { title: string; body: string };
    faq: { q: string; a: string }[];
}) {
    return (
        <>
            <SiteNav />
            <FaqJsonLd faq={faq} />
            <main>
                {/* Hero */}
                <header className="grid-bg relative overflow-hidden">
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse 70% 50% at 50% -10%, ${accent}22, transparent 70%)` }}
                    />
                    <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-12 text-center">
                        <div className="flex justify-center mb-6 rise">
                            <VoxelScene cubes={voxels} size={170} className="floaty" />
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: accent }}>
                            {eyebrow}
                        </p>
                        <h1 className="rise text-3xl sm:text-5xl font-bold tracking-tight leading-[1.08] mb-5">{title}</h1>
                        <p className="rise text-base leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--text-soft)", animationDelay: ".12s" }}>
                            {lead}
                        </p>
                    </div>
                </header>

                {/* Pillars */}
                <section className="py-16" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                    <div className="max-w-4xl mx-auto px-5">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-bold tracking-tight mb-3">Cómo se puntúa</h2>
                            <p className="text-sm max-w-xl mx-auto" style={{ color: "var(--text-soft)" }}>
                                Tres pilares con peso propio. Cada uno se renormaliza sobre los datos
                                disponibles, así que una métrica ausente puntúa neutro y no como un cero.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {pillars.map((p) => (
                                <article key={p.name} className="glass rounded-2xl p-5">
                                    <div className="flex items-baseline justify-between mb-3">
                                        <h3 className="text-sm font-bold">{p.name}</h3>
                                        <span className="mono text-xs font-bold" style={{ color: accent }}>{p.weight}%</span>
                                    </div>
                                    <div className="h-1 rounded-full mb-3.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                        <div className="h-full rounded-full" style={{ width: `${p.weight}%`, background: accent }} />
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{p.detail}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Signals */}
                <section className="py-16">
                    <div className="max-w-4xl mx-auto px-5">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-bold tracking-tight">Lo que mira, una por una</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                            {signals.map((s) => (
                                <div key={s.name} className="py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                                    <h3 className="text-sm font-semibold mb-1">{s.name}</h3>
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{s.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Differentiator */}
                <section className="pb-16">
                    <div className="max-w-3xl mx-auto px-5">
                        <div className="rounded-2xl p-6 sm:p-7" style={{ background: `${accent}0d`, border: `1px solid ${accent}33` }}>
                            <h2 className="text-lg font-bold mb-3">{differentiator.title}</h2>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>{differentiator.body}</p>
                        </div>
                    </div>
                </section>

                {/* FAQ, plain markup so it's easy to read and to crawl */}
                <section className="py-16" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)" }}>
                    <div className="max-w-3xl mx-auto px-5">
                        <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">Preguntas frecuentes</h2>
                        <div className="space-y-5">
                            {faq.map((f) => (
                                <div key={f.q}>
                                    <h3 className="text-sm font-semibold mb-1.5">{f.q}</h3>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>{f.a}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center mt-11">
                            <Link href="/#descargar" className="px-6 py-3 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.03]"
                                style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}>
                                Descargar gratis
                            </Link>
                            <Link href="/#demo" className="px-6 py-3 rounded-xl text-sm font-semibold glass transition-colors hover:bg-white/[0.06]">
                                Ver la demo
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}
