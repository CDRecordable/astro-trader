// ============================================================
// DimensionPage — shared layout for the esoteric dimension landings
// ============================================================
// Each of the seven dimensions gets: the hypothesis (what the tradition
// claims), the measurement (how the app actually computes it), the honest
// verdict (what the statistics say), FAQ with FAQPage JSON-LD, breadcrumbs
// and cross-links to its sibling dimensions.

import Link from "next/link";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import { FaqJsonLd, BreadcrumbJsonLd, type Faq } from "./Seo";
import { VoxelScene, ESOTERIC_VOXELS, type Cube } from "./Voxel";
import { childrenOf } from "@/lib/site";

export default function DimensionPage({
    slug, name, eyebrow, title, lead, hypothesis, measurement, verdict, faq, voxels,
}: {
    /** Full href of this page, to exclude it from the siblings strip. */
    slug: string;
    /** Short name used in breadcrumbs. */
    name: string;
    eyebrow: string;
    title: React.ReactNode;
    lead: string;
    /** What the esoteric tradition claims. */
    hypothesis: string;
    /** How the app actually measures it — sources, engine, method. */
    measurement: { title: string; detail: string }[];
    /** The honest statistical framing. */
    verdict: { headline: string; body: string };
    faq: Faq[];
    voxels?: Cube[];
}) {
    const siblings = childrenOf("/esoterico").filter((p) => p.href !== slug);

    return (
        <>
            <SiteNav />
            <FaqJsonLd faq={faq} />
            <BreadcrumbJsonLd trail={[
                { name: "Análisis esotérico", href: "/esoterico" },
                { name, href: slug },
            ]} />
            <main>
                {/* Hero */}
                <header className="grid-bg relative overflow-hidden">
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(167,139,250,0.16), transparent 70%)" }}
                    />
                    <div className="relative max-w-4xl mx-auto px-5 pt-12 pb-12 text-center">
                        {/* Breadcrumb */}
                        <p className="text-[11px] mb-6" style={{ color: "var(--text-mute)" }}>
                            <Link href="/esoterico" className="hover:underline" style={{ color: "var(--violet)" }}>
                                Análisis esotérico
                            </Link>
                            {" / "}{name}
                        </p>
                        <div className="flex justify-center mb-6 rise">
                            <VoxelScene cubes={voxels ?? ESOTERIC_VOXELS} size={150} className="floaty" />
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--violet)" }}>
                            {eyebrow}
                        </p>
                        <h1 className="rise text-3xl sm:text-5xl font-bold tracking-tight leading-[1.08] mb-5">{title}</h1>
                        <p className="rise text-base leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--text-soft)", animationDelay: ".12s" }}>
                            {lead}
                        </p>
                    </div>
                </header>

                {/* Hypothesis */}
                <section className="pb-14">
                    <div className="max-w-3xl mx-auto px-5">
                        <div className="rounded-2xl p-6" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-2.5" style={{ color: "var(--violet)" }}>
                                La hipótesis
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>{hypothesis}</p>
                        </div>
                    </div>
                </section>

                {/* Measurement */}
                <section className="py-14" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                    <div className="max-w-3xl mx-auto px-5">
                        <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">Cómo se mide</h2>
                        <div className="space-y-3">
                            {measurement.map((m, i) => (
                                <div key={m.title} className="glass rounded-2xl p-5 flex gap-4">
                                    <span className="mono text-sm font-bold shrink-0" style={{ color: "var(--cyan)" }}>
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold mb-1.5">{m.title}</h3>
                                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{m.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Honest verdict */}
                <section className="py-14">
                    <div className="max-w-3xl mx-auto px-5">
                        <div className="rounded-2xl p-6 sm:p-7" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.22)" }}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-2.5" style={{ color: "var(--emerald)" }}>
                                Qué dicen los datos
                            </p>
                            <h2 className="text-lg font-bold mb-3">{verdict.headline}</h2>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>{verdict.body}</p>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="pb-14">
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
                    </div>
                </section>

                {/* Siblings + CTA */}
                <section className="py-14" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)" }}>
                    <div className="max-w-3xl mx-auto px-5 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: "var(--text-mute)" }}>
                            Las otras dimensiones
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center mb-10">
                            {siblings.map((s) => (
                                <Link key={s.href} href={s.href}
                                    className="text-[11px] px-3 py-1.5 rounded-full glass hover:bg-white/[0.06] transition-colors"
                                    style={{ color: "var(--text-soft)" }}>
                                    {s.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link href="/#descargar" className="px-6 py-3 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.03]"
                                style={{ background: "linear-gradient(120deg, var(--violet), var(--cyan))", color: "#06080d" }}>
                                Explorarlo en la app · gratis
                            </Link>
                            <Link href="/esoterico" className="px-6 py-3 rounded-xl text-sm font-semibold glass transition-colors hover:bg-white/[0.06]">
                                Ver las siete dimensiones
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}
