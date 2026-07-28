import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { VoxelScene, ESOTERIC_VOXELS, SCORE_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Análisis esotérico de mercados · Efemérides reales y estadística honesta",
    description:
        "Siete dimensiones de análisis esotérico calculadas sobre efemérides astronómicas reales: turbulencia astral, ciclos lunares, Mercurio retrógrado, actividad solar, rotación sectorial planetaria, confluencias Fibonacci y un backtester. Con tests de permutación que dicen cuándo una señal NO predice nada.",
    keywords: [
        "astrología financiera", "ciclos lunares mercado", "mercurio retrógrado bolsa",
        "actividad solar mercados", "efemérides", "fibonacci", "backtest astrológico",
        "análisis esotérico inversión",
    ],
    alternates: { canonical: "/esoterico" },
    openGraph: {
        type: "article",
        title: "Análisis esotérico de mercados · Efemérides reales y estadística honesta",
        description:
            "Siete dimensiones sobre astronomía real, medidas con tests de permutación. La única herramienta astro-financiera que te dice cuándo su propia señal no funciona.",
    },
};

interface Dimension {
    n: string;
    title: string;
    what: string;
    how: string;
    tone: string;
}

const DIMENSIONS: Dimension[] = [
    {
        n: "01",
        title: "Turbulencia Astral",
        what: "Un índice de tensión construido con los aspectos duros entre planetas lentos (Saturno, Urano, Plutón) — los ciclos generacionales que la tradición asocia a crisis.",
        how: "Aspectos calculados con astronomy-engine a partir de longitudes eclípticas reales, no de fechas escogidas a mano.",
        tone: "var(--violet)",
    },
    {
        n: "02",
        title: "Ciclos Lunares",
        what: "Retornos diarios del mercado clasificados por fase lunar, siguiendo la metodología del estudio académico de Dichev & Janes.",
        how: "Fase calculada astronómicamente para cada sesión, con más de 6.000 días de datos reales de mercado.",
        tone: "var(--cyan)",
    },
    {
        n: "03",
        title: "Mercurio Retrógrado",
        what: "El clásico del folclore financiero: ¿se comporta peor el mercado durante los periodos retrógrados de Mercurio?",
        how: "Ventanas retrógradas reales sombreadas sobre el gráfico, comparando retornos dentro y fuera del periodo.",
        tone: "var(--amber)",
    },
    {
        n: "04",
        title: "Actividad Solar",
        what: "El ciclo de manchas solares frente al mercado: regímenes de máximo, medio y mínimo solar.",
        how: "Datos del observatorio SILSO (Bélgica), la fuente oficial del recuento de manchas solares.",
        tone: "var(--rose)",
    },
    {
        n: "05",
        title: "Rotación Sectorial Planetaria",
        what: "Cada sector del mercado mapeado a su regente planetario tradicional, midiendo su rendimiento según la fase del planeta.",
        how: "ETFs sectoriales reales contrastados contra tránsitos planetarios, con la rentabilidad anualizada correctamente.",
        tone: "var(--emerald)",
    },
    {
        n: "06",
        title: "Confluencia Fibonacci",
        what: "Zonas donde un retroceso de Fibonacci coincide en el tiempo con un evento astrológico: la hipótesis de que ahí se concentran los giros.",
        how: "Retrocesos multi-swing cruzados con 170+ eventos astrológicos, midiendo la tasa real de reversión frente a un baseline.",
        tone: "var(--indigo, #818cf8)",
    },
    {
        n: "07",
        title: "Backtester",
        what: "«¿Y si hubieras operado con las estrellas?» Simula una estrategia que sale del mercado cuando la turbulencia supera un umbral.",
        how: "Contra Buy & Hold, con costes de transacción, drawdown máximo y CAGR sobre el calendario real.",
        tone: "var(--cyan)",
    },
];

function Eyebrow({ children, color = "var(--violet)" }: { children: React.ReactNode; color?: string }) {
    return (
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color }}>
            {children}
        </p>
    );
}

export default function EsotericPage() {
    return (
        <>
            <SiteNav />
            <main>
                {/* ══ Hero ══ */}
                <header className="grid-bg relative overflow-hidden">
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(167,139,250,0.16), transparent 70%)" }}
                    />
                    <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-14 text-center">
                        <div className="flex justify-center mb-7 rise">
                            <VoxelScene cubes={ESOTERIC_VOXELS} size={200} className="floaty" />
                        </div>
                        <Eyebrow>Siete dimensiones</Eyebrow>
                        <h1 className="rise text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08] mb-5">
                            Análisis esotérico,<br />
                            <span className="grad">medido en serio</span>
                        </h1>
                        <p className="rise text-base leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--text-soft)", animationDelay: ".12s" }}>
                            Todo se calcula sobre <strong style={{ color: "var(--text)" }}>efemérides astronómicas reales</strong>,
                            no sobre fechas elegidas a conveniencia. Y todo se somete a la misma prueba estadística
                            que exigirías a cualquier estrategia.
                        </p>
                    </div>
                </header>

                {/* ══ The honesty pact — the differentiator ══ */}
                <section className="pb-16">
                    <div className="max-w-3xl mx-auto px-5">
                        <div className="rounded-2xl p-6 sm:p-7" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.22)" }}>
                            <Eyebrow color="var(--emerald)">El pacto</Eyebrow>
                            <h2 className="text-xl font-bold mb-3">Te decimos cuándo no funciona</h2>
                            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-soft)" }}>
                                Cada módulo esotérico incluye un <strong style={{ color: "var(--text)" }}>test de permutación</strong> y
                                su p-valor. Cuando la señal no distingue días buenos de malos mejor que el azar,
                                la app lo dice con todas las letras, en su propia pantalla:
                            </p>
                            <blockquote
                                className="text-sm leading-relaxed rounded-xl px-4 py-3.5 mb-4"
                                style={{ background: "rgba(0,0,0,0.28)", borderLeft: "3px solid var(--emerald)", color: "var(--text-soft)" }}
                            >
                                «La diferencia <strong style={{ color: "var(--emerald)" }}>NO es distinguible del azar</strong>. En estos
                                datos el filtro de turbulencia no separa días buenos de malos de forma significativa.»
                            </blockquote>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-mute)" }}>
                                Incluso avisamos del sesgo de retrospección: las fechas de aspectos planetarios coinciden
                                con crisis ya conocidas (2008, 2020), así que un backtest sobre ellas es <em>in-sample</em> y
                                está inflado. Lo decimos nosotros, antes de que lo descubras tú.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ══ The seven dimensions ══ */}
                <section className="py-16" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                    <div className="max-w-4xl mx-auto px-5">
                        <div className="text-center mb-11">
                            <Eyebrow>Qué incluye</Eyebrow>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Las siete dimensiones</h2>
                        </div>

                        <div className="space-y-3">
                            {DIMENSIONS.map((d) => (
                                <article key={d.n} className="glass rounded-2xl p-5 sm:p-6 transition-colors hover:bg-white/[0.02]">
                                    <div className="flex gap-4 sm:gap-5">
                                        <span className="mono text-lg font-bold shrink-0" style={{ color: d.tone }}>{d.n}</span>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold mb-2">{d.title}</h3>
                                            <p className="text-sm leading-relaxed mb-2.5" style={{ color: "var(--text-soft)" }}>{d.what}</p>
                                            <p className="text-[11px] leading-relaxed flex gap-2" style={{ color: "var(--text-mute)" }}>
                                                <span style={{ color: d.tone }}>▸</span>
                                                <span><strong style={{ color: "var(--text-soft)" }}>Cómo se calcula:</strong> {d.how}</span>
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══ Engine ══ */}
                <section className="py-16">
                    <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-10 items-center">
                        <div>
                            <Eyebrow color="var(--cyan)">Bajo el capó</Eyebrow>
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Un motor de efemérides de verdad</h2>
                            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-soft)" }}>
                                Nada está codificado a mano. Las posiciones planetarias se calculan con
                                <strong style={{ color: "var(--text)" }}> astronomy-engine</strong>, la misma clase de
                                biblioteca que usan los planetarios, y de ahí sale todo lo demás.
                            </p>
                            <ul className="space-y-2.5">
                                {[
                                    ["Longitudes eclípticas", "posición real de cada planeta en cualquier fecha"],
                                    ["Aspectos activos", "conjunciones, cuadraturas y oposiciones con su orbe"],
                                    ["Dignidades planetarias", "domicilio, exaltación, caída y exilio"],
                                    ["Signos y tránsitos", "el mapa completo, generado, no tecleado"],
                                ].map(([t, d]) => (
                                    <li key={t} className="flex gap-3 text-sm">
                                        <span style={{ color: "var(--cyan)" }}>›</span>
                                        <span style={{ color: "var(--text-soft)" }}>
                                            <strong style={{ color: "var(--text)" }}>{t}</strong> — {d}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex justify-center">
                            <VoxelScene cubes={SCORE_VOXELS} size={230} className="floaty" />
                        </div>
                    </div>
                </section>

                {/* ══ CTA ══ */}
                <section className="py-16" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)" }}>
                    <div className="max-w-2xl mx-auto px-5 text-center">
                        <h2 className="text-2xl font-bold tracking-tight mb-3">Explóralo tú mismo</h2>
                        <p className="text-sm leading-relaxed mb-7" style={{ color: "var(--text-soft)" }}>
                            El módulo esotérico entra completo en la versión gratuita, con sus p-valores
                            y sus advertencias. Como debe ser.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link href="/#descargar" className="px-6 py-3 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.03]"
                                style={{ background: "linear-gradient(120deg, var(--violet), var(--cyan))", color: "#06080d" }}>
                                Descargar gratis
                            </Link>
                            <Link href="/#demo" className="px-6 py-3 rounded-xl text-sm font-semibold glass transition-colors hover:bg-white/[0.06]">
                                Ver la demo del análisis serio
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}
