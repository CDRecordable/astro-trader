import type { Metadata } from "next";
import FeaturePage from "@/components/FeaturePage";
import { KEY_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Análisis de inversiones con IA · Tu propia API key, sin predicciones de precio",
    description:
        "La capa cualitativa que los datos no capturan: catalizadores, riesgos de gobernanza, tecnología y narrativa apoyada en noticias reales. Funciona con tu propia clave de Claude, Gemini o DeepSeek, pago único de 9,90 €, sin suscripción.",
    keywords: ["análisis acciones IA", "invertir con inteligencia artificial", "IA análisis fundamental", "ChatGPT bolsa alternativa", "análisis cualitativo empresas"],
    alternates: { canonical: "/ia" },
};

export default function IaPage() {
    return (
        <FeaturePage
            eyebrow="Capa de IA"
            title={<>La parte del análisis<br /><span className="grad">que los números no ven</span></>}
            lead="Un pipeline farmacéutico, un juicio pendiente, un giro de narrativa: nada de eso está en una API financiera. La capa de IA lee el cuadro cuantitativo ya calculado y aporta lo cualitativo, con una regla inquebrantable: tiene prohibido predecir precios."
            accent="var(--violet)"
            voxels={KEY_VOXELS}
            steps={[
                { title: "Trae tu propia clave", detail: "Claude, Gemini o DeepSeek: pegas tu API key en Ajustes y hablas directamente con el modelo. Nosotros no intermediamos ni cobramos por tokens." },
                { title: "El modelo recibe el contexto real", detail: "Cada análisis va anclado a los datos ya calculados (score, filtros, métricas) y a titulares de prensa recientes del activo o su temática. Menos alucinación, más sustancia." },
                { title: "El resultado refuerza, no compite", detail: "La IA no inventa otro score: refuerza o debilita el cuantitativo con flechas, y su análisis queda guardado en tu disco con fecha y modelo." },
            ]}
            features={[
                { name: "Catalizadores a 12 meses", detail: "Decisiones regulatorias, juicios, refinanciaciones, lanzamientos, con etiqueta de «verificar» cuando el modelo no está seguro de la fecha." },
                { name: "Riesgos cualitativos", detail: "Gobernanza, dependencia de clientes, ataques bajistas, concentración de poder, lo que hunde tesis que los ratios daban por buenas." },
                { name: "Narrativa con fuentes", detail: "Qué se decía del activo antes y qué se dice ahora, apoyado en titulares reales que se muestran con enlace, no en la memoria del modelo." },
                { name: "Especialización por clase", detail: "Pipeline y fases regulatorias en farma; tecnología, desbloqueos y centralización en cripto; tesis de exposición y alternativas en ETFs." },
                { name: "Análisis con memoria", detail: "Cada informe se guarda con su fecha y modelo. La watchlist muestra qué activos ya tienen análisis y una pestaña los agrega todos." },
                { name: "Privacidad estructural", detail: "Tu clave vive en tu disco y viaja solo al proveedor que elegiste. La app no tiene servidor que pueda verla." },
            ]}
            differentiator={{
                title: "Por qué «trae tu clave» y no una suscripción",
                body: "Los servicios de «IA financiera» por suscripción tienen un incentivo perverso: darte el modelo más barato posible cobrándote lo mismo cada mes. Aquí el trato es otro, pagas 9,90 € una sola vez por el software, eliges tú el modelo (y su coste real, que para uso personal son céntimos), y la app le prohíbe explícitamente dar precios objetivo, porque un LLM prediciendo cotizaciones es astrología con mejor marketing. De eso ya tenemos un módulo entero, y al menos el nuestro trae p-valores.",
            }}
            faq={[
                { q: "¿Qué necesito para usarla?", a: "La licencia de por vida (9,90 €, pago único) y una API key de Claude, Gemini o DeepSeek. La clave se crea en la web del proveedor en dos minutos; Gemini y DeepSeek tienen niveles gratuitos o de muy bajo coste." },
                { q: "¿Cuánto cuesta cada análisis en tokens?", a: "Depende del proveedor y modelo elegidos, pero un análisis típico consume del orden de céntimos o menos. Con el nivel gratuito de Gemini el coste marginal puede ser literalmente cero." },
                { q: "¿Por qué no predice precios?", a: "Porque no puede hacerlo bien y fingir lo contrario sería engañarte. El prompt se lo prohíbe de forma explícita: su trabajo es el análisis cualitativo verificable (catalizadores, riesgos, narrativa), no la adivinación." },
                { q: "¿Qué pasa si dejo de tener conexión o el proveedor cambia?", a: "La licencia se verifica en tu ordenador sin llamar a ningún servidor, así que nunca caduca ni depende de nosotros. Y al soportar tres proveedores, si uno sube precios o cierra, cambias de clave y sigues." },
            ]}
            related={[
                { href: "/acciones", label: "Análisis de acciones" },
                { href: "/cripto", label: "Análisis cripto" },
                { href: "/licencia", label: "Mi licencia" },
            ]}
        />
    );
}
