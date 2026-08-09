import type { Metadata } from "next";
import FeaturePage from "@/components/FeaturePage";
import { ECON_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Indicadores macroeconómicos · EE.UU., Eurozona y España en un panel",
    description:
        "Empleo, inflación y actividad de EE.UU., la Eurozona y España leídos de FRED, Eurostat y el BCE, cada indicador clasificado en bajo/normal/alto y traducido al sesgo implícito del banco central. Gratis y sin API keys.",
    keywords: ["indicadores macroeconómicos", "inflación España hoy", "paro Eurozona", "FRED datos", "política monetaria BCE", "análisis macro inversión"],
    alternates: { canonical: "/economia" },
};

export default function EconomiaPage() {
    return (
        <FeaturePage
            eyebrow="Economía"
            title={<>El contexto macro,<br /><span className="grad">sin ruido de telediario</span></>}
            lead="Antes de decidir sobre una empresa conviene saber en qué economía respira. Tres regiones (EE.UU., Eurozona y España) con sus indicadores de empleo, inflación y actividad leídos de las fuentes oficiales y traducidos a una lectura accionable: ¿el banco central está para subir, aguantar o bajar?"
            accent="var(--indigo, #818cf8)"
            voxels={ECON_VOXELS}
            steps={[
                { title: "Datos de las fuentes oficiales", detail: "FRED (Reserva Federal), Eurostat y el BCE vía DBnomics. Sin claves de API, sin intermediarios que interpreten por ti." },
                { title: "Cada indicador, clasificado", detail: "Paro, inflación general y subyacente, producción industrial… cada serie se sitúa en bajo / normal / alto frente a su propia historia." },
                { title: "Traducción a sesgo de política", detail: "El conjunto se resume en el sesgo implícito del banco central (expansivo, neutral o restrictivo), con un dial por región." },
            ]}
            features={[
                { name: "Tres regiones en paralelo", detail: "EE.UU., Eurozona y España lado a lado: el mismo indicador, tres realidades, comparables de un vistazo." },
                { name: "Mercado laboral", detail: "Tasa de paro y su tendencia, el dato que los bancos centrales miran antes de tocar tipos." },
                { name: "Inflación completa", detail: "General y subyacente, porque la diferencia entre ambas es donde se esconde la historia." },
                { name: "Actividad real", detail: "Producción y sentimiento económico: si la economía acelera o se enfría por debajo de los titulares." },
                { name: "Histórico en cada indicador", detail: "Cada serie trae su gráfico histórico, no solo el último dato, para ver la tendencia y no la foto." },
                { name: "Cuando una serie falla", detail: "Si un dato oficial deja de publicarse, se muestra como N/D. El panel no lo inventa ni se rompe." },
            ]}
            differentiator={{
                title: "Lectura, no predicción",
                body: "Este panel no pronostica qué hará el BCE ni cuándo bajará tipos la Fed. Hace algo más útil: clasifica cada dato frente a su propia historia y te muestra qué sesgo de política monetaria es coherente con ese cuadro. Es el contexto que necesita un análisis fundamental: saber si el viento sopla a favor o en contra, sin disfrazarse de bola de cristal.",
            }}
            faq={[
                { q: "¿De dónde salen los datos?", a: "De FRED (Reserva Federal de St. Louis), Eurostat y el Banco Central Europeo, a través del agregador público DBnomics. Todas son fuentes oficiales, gratuitas y sin necesidad de clave de API." },
                { q: "¿Cada cuánto se actualizan?", a: "Cada vez que abres el panel se consultan las series en vivo. Los organismos publican con su propia cadencia, mensual en la mayoría de indicadores, así que verás el último dato oficial disponible." },
                { q: "¿Cómo se decide si un dato es «alto» o «bajo»?", a: "Comparándolo con su propia distribución histórica, no con un umbral arbitrario. Un paro del 7% es altísimo para EE.UU. y bajo para España; la clasificación lo refleja." },
                { q: "¿Sirve para hacer market timing?", a: "No es su propósito. Es contexto para tus decisiones fundamentales: entender si estás comprando ciclo a favor o en contra. Para volatilidad de corto plazo existe el panel del VIX." },
            ]}
            related={[
                { href: "/vix", label: "Régimen de volatilidad" },
                { href: "/acciones", label: "Análisis de acciones" },
                { href: "/etfs", label: "ETFs por países" },
            ]}
        />
    );
}
