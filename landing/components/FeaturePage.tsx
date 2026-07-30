// ============================================================
// FeaturePage — shared layout for the tool landings
// ============================================================
// Used by /screener, /economia, /vix, /watchlist, /cartera and /ia. Hero with
// voxel art, a "how it works" walkthrough, the feature grid, the honest
// differentiator, FAQ (with FAQPage JSON-LD) and the download CTA.

import Link from "next/link";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import { FaqJsonLd, type Faq } from "./Seo";
import { VoxelScene, type Cube } from "./Voxel";

export interface Step { title: string; detail: string }
export interface Feature { name: string; detail: string }

export default function FeaturePage({
    eyebrow, title, lead, accent, voxels, steps, features, differentiator, faq, related,
}: {
    eyebrow: string;
    title: React.ReactNode;
    lead: string;
    accent: string;
    voxels: Cube[];
    steps: Step[];
    features: Feature[];
    differentiator: { title: string; body: string };
    faq: Faq[];
    /** Cross-links to sibling landings, for internal SEO juice. */
    related?: { href: string; label: string }[];
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
                        style={{ background: `radial-gradient(ellipse 70% 50% at 50% -10%, ${accent}20, transparent 70%)` }}
                    />
                    <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-12 text-center">
                        <div className="flex justify-center mb-6 rise">
                            <VoxelScene cubes={voxels} size={160} className="floaty" />
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

                {/* How it works */}
                <section className="py-16" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                    <div className="max-w-4xl mx-auto px-5">
                        <h2 className="text-2xl font-bold tracking-tight mb-9 text-center">Cómo funciona</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            {steps.map((s, i) => (
                                <div key={s.title} className="glass rounded-2xl p-5">
                                    <span className="mono text-xs font-bold inline-flex w-6 h-6 rounded items-center justify-center mb-3"
                                        style={{ background: `${accent}1d`, color: accent }}>
                                        {i + 1}
                                    </span>
                                    <h3 className="text-sm font-bold mb-2">{s.title}</h3>
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{s.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Feature grid */}
                <section className="py-16">
                    <div className="max-w-4xl mx-auto px-5">
                        <h2 className="text-2xl font-bold tracking-tight mb-9 text-center">Qué incluye</h2>
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                            {features.map((f) => (
                                <div key={f.name} className="py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                                    <h3 className="text-sm font-semibold mb-1">{f.name}</h3>
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{f.detail}</p>
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

                {/* FAQ + CTA */}
                <section className="py-16" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)" }}>
                    <div className="max-w-3xl mx-auto px-5">
                        <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">Preguntas frecuentes</h2>
                        <div className="space-y-5 mb-11">
                            {faq.map((f) => (
                                <div key={f.q}>
                                    <h3 className="text-sm font-semibold mb-1.5">{f.q}</h3>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>{f.a}</p>
                                </div>
                            ))}
                        </div>

                        {related && related.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 justify-center mb-10">
                                <span className="text-[11px]" style={{ color: "var(--text-mute)" }}>Relacionado:</span>
                                {related.map((r) => (
                                    <Link key={r.href} href={r.href}
                                        className="text-[11px] px-2.5 py-1 rounded-full glass hover:bg-white/[0.06] transition-colors"
                                        style={{ color: "var(--text-soft)" }}>
                                        {r.label}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3 justify-center">
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
