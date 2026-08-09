import type { Metadata } from "next";
import FeaturePage from "@/components/FeaturePage";
import { VIX_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Índice VIX explicado · Qué hizo el mercado tras cada nivel de miedo",
    description:
        "El VIX clasificado en regímenes reales (complacencia, normal, elevado, pánico) y el retorno del S&P 500 que siguió históricamente a cada uno. Análisis empírico con datos diarios, no opiniones.",
    keywords: ["índice VIX qué es", "VIX alto qué significa", "volatilidad mercado", "índice del miedo", "comprar cuando hay miedo", "regímenes de volatilidad"],
    alternates: { canonical: "/vix" },
};

export default function VixPage() {
    return (
        <FeaturePage
            eyebrow="Volatilidad"
            title={<>El índice del miedo,<br /><span className="grad">medido sin miedo</span></>}
            lead="Todo el mundo cita el VIX; casi nadie mira qué pasó después de cada nivel. Este panel clasifica cada día por el régimen real de volatilidad y responde la única pregunta útil: históricamente, ¿qué hizo el S&P 500 el mes siguiente a un VIX como el de hoy?"
            accent="var(--rose)"
            voxels={VIX_VOXELS}
            steps={[
                { title: "El VIX de hoy, en contexto", detail: "El nivel actual situado en su régimen: complacencia (<15), normal (15-20), elevado (20-30) o pánico (>30)." },
                { title: "La historia de cada régimen", detail: "Miles de sesiones clasificadas: cuántos días pasó el mercado en cada régimen y qué retorno a un mes siguió a cada uno." },
                { title: "La lectura empírica", detail: "El patrón documentado, el miedo extremo ha precedido históricamente retornos mejores que la complacencia, con sus números delante." },
            ]}
            features={[
                { name: "Regímenes estándar del mercado", detail: "Los cortes clásicos (15 / 20 / 30) que usa la industria, no umbrales inventados para que el gráfico quede bonito." },
                { name: "Retorno forward real", detail: "Para cada régimen, el retorno del S&P 500 a ~1 mes vista calculado sobre datos diarios reales, con su dispersión." },
                { name: "Dónde estás hoy", detail: "El régimen actual destacado sobre el histórico: ves al instante si el mercado paga o castiga el nivel de miedo presente." },
                { name: "Serie histórica completa", detail: "El VIX graficado junto al S&P 500 para ver los picos de pánico en su contexto: 2008, 2020, y lo que vino después." },
                { name: "Sin suscripciones de datos", detail: "Todo con datos públicos, desde tu propio ordenador. Cero coste, cero claves." },
            ]}
            differentiator={{
                title: "La parte empírica del par esotérico",
                body: "Esta app mide la «turbulencia astral» con tests estadísticos, y muestra que no predice nada. El VIX es su contrapunto deliberado: un indicador de volatilidad que sí tiene un efecto documentado en la literatura (la reversión tras el miedo extremo), presentado con la misma vara de medir. Cuando algo funciona lo decimos, y cuando no, también. Esa simetría es el producto.",
            }}
            faq={[
                { q: "¿Qué es exactamente el VIX?", a: "El índice de volatilidad implícita del S&P 500 que publica CBOE: mide cuánta volatilidad descuentan las opciones para el próximo mes. Coloquialmente, «el índice del miedo», sube cuando el mercado se asusta." },
                { q: "¿VIX alto significa comprar?", a: "Históricamente, los retornos a un mes tras VIX de pánico han sido en promedio mejores que tras VIX de complacencia, es el patrón de reversión que el panel cuantifica. Pero es una media con mucha dispersión, no una garantía, y el panel te enseña ambas cosas." },
                { q: "¿Se actualiza en tiempo real?", a: "Se consulta el nivel vigente del VIX cada vez que abres el panel, junto al histórico completo para el análisis de regímenes." },
                { q: "¿Por qué está esto en una app de análisis fundamental?", a: "Porque el timing de entrada importa incluso al inversor de largo plazo, y el VIX es de las pocas variables de timing con respaldo empírico serio. Complementa el pilar de timing del análisis de cada valor." },
            ]}
            related={[
                { href: "/economia", label: "Contexto macro" },
                { href: "/esoterico/turbulencia-astral", label: "Turbulencia astral (el contrapunto)" },
                { href: "/acciones", label: "Análisis de acciones" },
            ]}
        />
    );
}
