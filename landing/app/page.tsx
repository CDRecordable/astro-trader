import Link from "next/link";
import Demo from "@/components/Demo";
import BuyButton from "@/components/BuyButton";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
    VoxelScene, STOCK_VOXELS, CRYPTO_VOXELS, ETF_VOXELS,
    KEY_VOXELS, LOCAL_VOXELS, SCORE_VOXELS, ESOTERIC_VOXELS,
} from "@/components/Voxel";
import { GITHUB } from "@/lib/site";

/* ── Small building blocks ──────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--cyan)" }}>
            {children}
        </p>
    );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
    return (
        <>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{children}</h2>
            {sub && <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--text-soft)" }}>{sub}</p>}
        </>
    );
}

function AnalyzerCard({ voxels, tag, title, points, accent, href }: {
    voxels: Parameters<typeof VoxelScene>[0]["cubes"];
    tag: string; title: string; points: string[]; accent: string; href: string;
}) {
    return (
        <Link href={href} className="glass rounded-2xl overflow-hidden flex flex-col transition-colors hover:bg-white/[0.03] group">
            <div className="grid-bg flex items-center justify-center py-7" style={{ borderBottom: "1px solid var(--border)" }}>
                <VoxelScene cubes={voxels} size={132} className="floaty" />
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: accent }}>{tag}</span>
                <h3 className="text-base font-bold mb-3">{title}</h3>
                <ul className="space-y-1.5">
                    {points.map((p) => (
                        <li key={p} className="text-xs leading-relaxed flex gap-2" style={{ color: "var(--text-soft)" }}>
                            <span style={{ color: accent }}>›</span>{p}
                        </li>
                    ))}
                </ul>
                <span className="text-[11px] font-semibold mt-4 pt-3 inline-flex items-center gap-1"
                    style={{ color: accent, borderTop: "1px solid var(--border)" }}>
                    Ver en detalle
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
            </div>
        </Link>
    );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function Home() {
    return (
        <main>
            <SiteNav />

            {/* ══ Hero ══ */}
            <header className="grid-bg relative overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(34,211,238,0.13), transparent 70%)" }}
                />
                <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-10 text-center">
                    <div className="flex justify-center mb-7 rise">
                        <VoxelScene cubes={SCORE_VOXELS} size={190} className="floaty" />
                    </div>

                    <p className="rise inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full mb-5"
                        style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "var(--emerald)", animationDelay: ".05s" }}>
                        Código abierto · Se instala en tu ordenador · Tus datos no salen de ahí
                    </p>

                    <h1 className="rise text-4xl sm:text-6xl font-bold tracking-tight leading-[1.06] mb-5" style={{ animationDelay: ".1s" }}>
                        Análisis de acciones, cripto y ETFs<br />
                        <span className="grad">con la nota explicada.</span>
                    </h1>

                    <p className="rise text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8" style={{ color: "var(--text-soft)", animationDelay: ".18s" }}>
                        Aplicación de escritorio, gratuita y de código abierto. Cada activo recibe una
                        puntuación de 0 a 100 y puedes ver de dónde sale, métrica a métrica. Lo que no
                        hay forma de medir se marca como <strong style={{ color: "var(--amber)" }}>N/D</strong> y
                        no cuenta como un cero.
                    </p>

                    <div className="rise flex flex-wrap items-center justify-center gap-3 mb-4" style={{ animationDelay: ".26s" }}>
                        <a href="#descargar" className="px-6 py-3 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.03]"
                            style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}>
                            Descargar gratis
                        </a>
                        <a href="#demo" className="px-6 py-3 rounded-xl text-sm font-semibold glass transition-colors hover:bg-white/[0.06]">
                            Probar el análisis ↓
                        </a>
                    </div>
                    <p className="rise text-[11px]" style={{ color: "var(--text-mute)", animationDelay: ".3s" }}>
                        Todo el análisis heurístico, gratis y para siempre. Sin cuenta, sin tarjeta.
                    </p>
                </div>
            </header>

            {/* ══ Interactive demo ══ */}
            <section className="pb-20 pt-2">
                <div className="text-center mb-7 px-5">
                    <Eyebrow>Pruébalo ahora mismo</Eyebrow>
                    <SectionTitle>El motor, funcionando</SectionTitle>
                    <p className="text-sm max-w-xl mx-auto mt-3" style={{ color: "var(--text-soft)" }}>
                        Tres análisis reales salidos del algoritmo. Cambia de activo y pulsa cualquier
                        métrica para entender qué mide y por qué importa.
                    </p>
                </div>
                <Demo />
            </section>

            {/* ══ Analyzers ══ */}
            <section id="analizadores" className="py-20" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <div className="max-w-6xl mx-auto px-5">
                    <div className="text-center mb-11">
                        <Eyebrow>Tres clases de activo</Eyebrow>
                        <SectionTitle>Qué puedes analizar</SectionTitle>
                    </div>
                    <div className="grid md:grid-cols-3 gap-5">
                        <AnalyzerCard
                            voxels={STOCK_VOXELS} accent="var(--cyan)" tag="Acciones" href="/acciones"
                            title="Valoración, calidad y timing"
                            points={[
                                "Valoración por valor de empresa (FCF/EV), no solo por PER",
                                "Filtros de solvencia: deuda/EBITDA, cobertura de intereses",
                                "Dilución, devengos y compras de directivos",
                                "Busca cualquier acción cotizada del mundo",
                            ]}
                        />
                        <AnalyzerCard
                            voxels={CRYPTO_VOXELS} accent="var(--amber)" tag="Cripto" href="/cripto"
                            title="Tokenomics, red y momentum"
                            points={[
                                "«P/S cripto»: capitalización entre comisiones reales del protocolo",
                                "Dilución de supply y presión futura (FDV/MC)",
                                "Ballenas y concentración on-chain, sin API de pago",
                                "Datos de red en vivo (p. ej. TPS reales de Hedera)",
                            ]}
                        />
                        <AnalyzerCard
                            voxels={ETF_VOXELS} accent="var(--violet)" tag="ETFs" href="/etfs"
                            title="Coste, cartera y momentum"
                            points={[
                                "57 ETFs UCITS que sí puedes comprar desde España",
                                "TER real del folleto: el coste que te come el interés compuesto",
                                "¿Tu ETF «diversificado» son 7 empresas? Te lo enseña",
                                "P/E de la cesta: si la economía que compras está cara",
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* ══ Esoteric — the other half of the app ══ */}
            <section id="esoterico" className="py-20 relative overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 60% 60% at 80% 40%, rgba(167,139,250,0.12), transparent 70%)" }}
                />
                <div className="relative max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center">
                    <div className="order-2 md:order-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--violet)" }}>
                            La otra mitad de la app
                        </p>
                        <SectionTitle sub="Siete dimensiones calculadas sobre efemérides astronómicas reales, sometidas a las mismas pruebas estadísticas que le exigirías a cualquier estrategia.">
                            Exploración esotérica
                        </SectionTitle>

                        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 mt-7 mb-7">
                            {[
                                "Turbulencia astral",
                                "Ciclos lunares",
                                "Mercurio retrógrado",
                                "Actividad solar",
                                "Rotación sectorial planetaria",
                                "Confluencias Fibonacci",
                                "Backtester astral",
                                "Motor de efemérides real",
                            ].map((d) => (
                                <div key={d} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-soft)" }}>
                                    <span style={{ color: "var(--violet)" }}>◆</span>{d}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl px-4 py-3.5 mb-6" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>
                                <strong style={{ color: "var(--emerald)" }}>El resultado:</strong> los tests de
                                permutación dicen que estas señales <em>no</em> baten al azar. La app lo enseña en su
                                propia pantalla, con el p-valor al lado. Es exploración, no una promesa.
                            </p>
                        </div>

                        <Link
                            href="/esoterico"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.03]"
                            style={{ background: "linear-gradient(120deg, var(--violet), var(--cyan))", color: "#06080d" }}
                        >
                            Ver las siete dimensiones →
                        </Link>
                    </div>

                    <div className="order-1 md:order-2 flex justify-center">
                        <VoxelScene cubes={ESOTERIC_VOXELS} size={280} className="floaty" />
                    </div>
                </div>
            </section>

            {/* ══ Honesty — the differentiator ══ */}
            <section className="py-20" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <Eyebrow>Cómo se calcula la nota</Eyebrow>
                        <SectionTitle sub="Casi todas las herramientas dan un número y no cuentan de dónde sale. Estas son las tres reglas que sigue el motor.">
                            Lo que falta, también se ve
                        </SectionTitle>
                        <div className="mt-7 space-y-5">
                            {[
                                ["Dato ausente = neutro, nunca cero", "Una small-cap con datos escasos no merece un suspenso por serlo. Lo que falta se excluye y el pilar se renormaliza."],
                                ["Cuando algo no funciona, aparece igual", "El módulo esotérico usa efemérides astronómicas reales, y sus tests de permutación salen negativos: no predice el mercado. Ese resultado está en la propia app, no escondido en la letra pequeña."],
                                ["La IA no inventa precios", "Tiene prohibido dar precios objetivo. Aporta lo que las APIs no ven: pipeline regulatorio, riesgos de gobernanza, tecnología, narrativa."],
                            ].map(([t, d]) => (
                                <div key={t} className="flex gap-3.5">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--emerald)" }} />
                                    <div>
                                        <h3 className="text-sm font-semibold mb-1">{t}</h3>
                                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <VoxelScene cubes={LOCAL_VOXELS} size={260} className="floaty" />
                    </div>
                </div>
            </section>

            {/* ══ Pricing ══ */}
            <section id="precio" className="py-20" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <div className="max-w-5xl mx-auto px-5">
                    <div className="text-center mb-11">
                        <Eyebrow>Precio</Eyebrow>
                        <SectionTitle>Paga una vez. O no pagues nunca.</SectionTitle>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        {/* Free */}
                        <div className="glass rounded-2xl p-7 flex flex-col">
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-bold">Análisis completo</h3>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-mute)" }}>Todo el motor heurístico</p>
                                </div>
                                <VoxelScene cubes={LOCAL_VOXELS.slice(0, 4)} size={62} shadow={false} />
                            </div>
                            <p className="text-4xl font-bold mb-1">Gratis</p>
                            <p className="text-xs mb-6" style={{ color: "var(--text-mute)" }}>Para siempre. Sin cuenta ni tarjeta.</p>
                            <ul className="space-y-2 text-xs flex-1" style={{ color: "var(--text-soft)" }}>
                                {[
                                    "Analizadores de acciones, cripto y ETFs",
                                    "Screener por universos y ranking",
                                    "Watchlist, descartes y notas",
                                    "Cartera simulada con curva de valor",
                                    "Macro por países y régimen de volatilidad",
                                    "Módulo esotérico con sus p-valores a la vista",
                                ].map((f) => (
                                    <li key={f} className="flex gap-2"><span style={{ color: "var(--emerald)" }}>✓</span>{f}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Lifetime AI */}
                        <div className="rounded-2xl p-7 flex flex-col relative overflow-hidden"
                            style={{ background: "var(--card)", border: "1px solid rgba(167,139,250,0.35)" }}>
                            <div className="absolute inset-x-0 top-0 h-px"
                                style={{ background: "linear-gradient(90deg, transparent, var(--violet), transparent)" }} />
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-bold">Capa de IA</h3>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-mute)" }}>Pago único, de por vida</p>
                                </div>
                                <VoxelScene cubes={KEY_VOXELS} size={62} shadow={false} />
                            </div>
                            <p className="text-4xl font-bold mb-1">
                                9,90 € <span className="text-sm font-normal" style={{ color: "var(--text-mute)" }}>una vez</span>
                            </p>
                            <p className="text-xs mb-6" style={{ color: "var(--text-mute)" }}>Sin suscripción. Sin renovaciones.</p>
                            <ul className="space-y-2 text-xs flex-1" style={{ color: "var(--text-soft)" }}>
                                {[
                                    "Análisis cualitativo: catalizadores, riesgos, tesis",
                                    "Capa narrativa apoyada en noticias reales",
                                    "Refuerza o debilita la nota con flechas, sin inventar una puntuación paralela",
                                    "Funciona con Claude, Gemini o DeepSeek",
                                ].map((f) => (
                                    <li key={f} className="flex gap-2"><span style={{ color: "var(--violet)" }}>✓</span>{f}</li>
                                ))}
                            </ul>
                            <div className="mt-6 rounded-xl px-3.5 py-3" style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.16)" }}>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                                    <strong style={{ color: "var(--violet)" }}>Usas tu propia API key.</strong> No revendemos IA
                                    ni pagamos tokens por ti: enchufas la tuya y hablas directamente con el modelo.
                                    Tu clave se guarda solo en tu disco.
                                </p>
                            </div>
                            <BuyButton />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ Download ══ */}
            <section id="descargar" className="py-20">
                <div className="max-w-3xl mx-auto px-5 text-center">
                    <div className="flex justify-center mb-6">
                        <VoxelScene cubes={STOCK_VOXELS} size={150} className="floaty" />
                    </div>
                    <Eyebrow>Empezar</Eyebrow>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                        Se instala en tu ordenador
                    </h2>
                    <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-soft)" }}>
                        No es un servicio en la nube: corre en tu máquina, con tu conexión.
                        Por eso es gratis y rápido, y por eso tu watchlist, tu cartera y tus
                        claves se quedan en tu disco.
                    </p>

                    {/* Primary: the installer. No terminal, no Node, no README. */}
                    <a
                        href={`${GITHUB}/releases/latest`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-col items-center px-8 py-4 rounded-2xl transition-transform hover:scale-[1.02] mb-3"
                        style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}
                    >
                        <span className="text-base font-bold">Descargar para Windows</span>
                        <span className="text-[11px] opacity-80">Instalador .exe · gratis · sin cuenta</span>
                    </a>
                    <p className="text-[11px] mb-9" style={{ color: "var(--text-mute)" }}>
                        También disponible para{" "}
                        <a href={`${GITHUB}/releases/latest`} target="_blank" rel="noopener noreferrer"
                            className="underline" style={{ color: "var(--text-soft)" }}>macOS y Linux</a>.
                    </p>

                    <div className="glass rounded-2xl p-6 text-left mb-7">
                        <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-mute)" }}>
                            Qué pasa al instalarlo
                        </p>
                        <ol className="space-y-3.5">
                            {[
                                ["Doble clic en el instalador", "Se instala como cualquier programa, sin permisos de administrador."],
                                ["Se abre en su propia ventana", "No necesitas Node, ni terminal, ni recordar ninguna dirección."],
                                ["Pones tus claves dentro", "Ajustes → tu API key de IA y tu licencia, si la tienes. Se guardan solo en tu equipo."],
                            ].map(([step, detail], i) => (
                                <li key={step} className="flex gap-3.5 items-start">
                                    <span className="mono text-[10px] w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                                        style={{ background: "rgba(34,211,238,0.12)", color: "var(--cyan)" }}>{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold mb-0.5">{step}</p>
                                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-mute)" }}>{detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <p className="text-[11px] mt-5 pt-4" style={{ color: "var(--text-mute)", borderTop: "1px solid var(--border)" }}>
                            Windows puede avisar de que el editor es desconocido: el instalador aún no está
                            firmado digitalmente. Pulsa «Más información → Ejecutar de todas formas», o
                            compila tú mismo desde el código, que es público.
                        </p>
                    </div>

                    <a href={GITHUB} target="_blank" rel="noopener noreferrer"
                        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold glass transition-colors hover:bg-white/[0.06]">
                        Ver el código en GitHub · MIT
                    </a>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
