import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Rotación sectorial planetaria · Regentes astrológicos frente a ETFs reales",
    description:
        "Cada sector del mercado asignado a su regente planetario tradicional (Marte a defensa, Venus al lujo, Neptuno a farmacéuticas) y contrastado con el rendimiento real de los ETFs sectoriales durante las fases de su planeta. Con la anualización hecha bien.",
    keywords: ["regentes planetarios sectores", "astrología sectorial", "rotación sectorial", "Marte defensa Venus lujo", "sectores bolsa astrología"],
    alternates: { canonical: "/esoterico/rotacion-sectorial" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/rotacion-sectorial"
            name="Rotación sectorial"
            eyebrow="Dimensión 05"
            title={<>Cada sector<br /><span className="grad">con su planeta</span></>}
            lead="La astrología clásica reparte el mundo entre planetas: Marte rige la guerra, Venus el placer, Mercurio el comercio. Trasladado al mercado: ¿rinde mejor el sector defensa cuando Marte está fuerte? Asignamos regentes, medimos fases y contrastamos con ETFs sectoriales cotizados."
            hypothesis="Cada sector económico «pertenece» a un planeta según la correspondencia tradicional, y su rendimiento bursátil mejora cuando su regente atraviesa fases favorables (dignidad, movimiento directo, buenos aspectos) y empeora en las desfavorables. Sería la versión celeste de la rotación sectorial que los gestores practican con el ciclo económico."
            measurement={[
                { title: "Correspondencias explícitas", detail: "El mapa sector-planeta está declarado en el código y visible en el panel (Marte/defensa, Venus/lujo y consumo, Júpiter/financieras, Neptuno/farmacéuticas…), para que la hipótesis sea auditable antes de medirla." },
                { title: "ETFs sectoriales reales", detail: "El rendimiento de cada sector se toma de su ETF sectorial cotizado, no de índices reconstruidos, y se segmenta por las fases astronómicas reales de su planeta regente." },
                { title: "Anualización correcta", detail: "Cada fase dura lo que dura; comparar retornos brutos de ventanas desiguales infla al que tuvo la ventana más larga. Todos los retornos se anualizan antes de comparar, un detalle aburrido que cambia conclusiones." },
            ]}
            verdict={{
                headline: "Bonito de mapear, imposible de operar",
                body: "Con nueve sectores, siete planetas clásicos y varias fases por planeta, las combinaciones se multiplican, y con tantas casillas algunas saldrán «ganadoras» por pura combinatoria. El panel muestra cada correspondencia con su retorno anualizado y deja a la vista lo esencial: las brechas no son estables entre periodos ni sobreviven a un test serio. Es un ejercicio precioso de mapeo cultural, y el panel lo enmarca como lo que es: exploración, no rotación operable.",
            }}
            faq={[
                { q: "¿De dónde salen las correspondencias sector-planeta?", a: "De la tradición astrológica clásica (regencias planetarias) aplicada con criterio a los sectores modernos: Marte a defensa y armamento, Venus a lujo y consumo discrecional, Mercurio a comunicaciones, Neptuno a farmacéuticas y petróleo… El mapa completo está declarado y es discutible por diseño, como toda la hipótesis." },
                { q: "¿Qué es una «fase favorable» del planeta?", a: "Combinaciones de su estado astronómico-astrológico: movimiento directo o retrógrado, y su posición en signos donde la tradición lo considera fuerte (domicilio, exaltación) o débil (exilio, caída). Todo se calcula con la efeméride real." },
                { q: "¿Por qué importa tanto la anualización?", a: "Porque las fases duran distinto: si Marte pasa 8 meses directo y 2 retrógrado, comparar retornos totales de ambas ventanas es tramposo. Anualizar pone todas las fases en la misma unidad, y desinfla la mayoría de «hallazgos»." },
                { q: "¿Hay algún sector donde funcione?", a: "En cualquier tabla grande siempre hay casillas verdes: ese es exactamente el problema. Sin estabilidad entre periodos ni significancia conjunta, una casilla ganadora es lo que el azar promete producir. El panel te deja verlas todas para que compruebes la trampa por ti mismo." },
            ]}
        />
    );
}
